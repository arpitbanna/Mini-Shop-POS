import { NextResponse } from 'next/server';
import { notion, STOCK_IN_DB_ID, STOCK_OUT_DB_ID } from '@/lib/notion';
import { getErrorMessage } from '@/lib/notion-helpers';
import type { AddSalePayload, UpdatePaymentPayload } from '@/types';

type UnknownRecord = Record<string, unknown>;

function getDbProperties(value: unknown): UnknownRecord {
  if (!value || typeof value !== 'object') return {};
  const record = value as UnknownRecord;
  const properties = record.properties;
  if (!properties || typeof properties !== 'object') return {};
  return properties as UnknownRecord;
}

type NotionPropertyType =
  | 'title'
  | 'rich_text'
  | 'number'
  | 'date'
  | 'relation'
  | 'select'
  | 'multi_select'
  | 'formula'
  | 'rollup'
  | 'created_time'
  | 'last_edited_time'
  | 'status'
  | 'people'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone_number';

type NotionDbProperty = {
  type?: NotionPropertyType;
};

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function getDbPropertyRecord(properties: UnknownRecord, key: string): NotionDbProperty {
  const value = properties[key];
  if (!value || typeof value !== 'object') return {};
  return value as NotionDbProperty;
}

function findPropertyKey(
  properties: UnknownRecord,
  preferredNames: string[],
  allowedTypes?: NotionPropertyType[],
  useTypeFallback = true,
): string | undefined {
  const keys = Object.keys(properties);
  const normalizedPreferred = preferredNames.map((name) => normalizeName(name));

  for (const preferred of normalizedPreferred) {
    const exact = keys.find((key) => normalizeName(key) === preferred);
    if (!exact) continue;

    if (!allowedTypes || allowedTypes.length === 0) return exact;
    const prop = getDbPropertyRecord(properties, exact);
    if (prop.type && allowedTypes.includes(prop.type)) return exact;
  }

  if (!useTypeFallback || !allowedTypes || allowedTypes.length === 0) return undefined;
  return keys.find((key) => {
    const prop = getDbPropertyRecord(properties, key);
    return !!prop.type && allowedTypes.includes(prop.type);
  });
}

function normalizeKey(value: string) {
  return normalizeName(value);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getTitleFromPage(page: unknown): string {
  if (!page || typeof page !== 'object') return '';
  const record = page as UnknownRecord;
  const properties = record.properties as UnknownRecord | undefined;
  const name = properties?.Name as UnknownRecord | undefined;
  const title = name?.title;
  if (!Array.isArray(title) || title.length === 0) return '';
  const first = title[0] as UnknownRecord | undefined;
  const plain = first?.plain_text;
  return typeof plain === 'string' ? plain : '';
}

export async function POST(request: Request) {
  try {
    const { items, roomNo, amountPaid, createdAt, businessDate } = (await request.json()) as AddSalePayload;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: 'At least one item is required' }, { status: 400 });
    }

    const db = await notion.databases.retrieve({ database_id: STOCK_OUT_DB_ID });
    const dbProperties = getDbProperties(db);

    const itemRelationKey = findPropertyKey(dbProperties, ['Item', 'Product', 'Inventory Item'], ['relation']);
    const amountPaidKey = findPropertyKey(dbProperties, ['Amount Paid', 'Paid', 'AmountReceived'], ['number'], false);
    const roomNoKey = findPropertyKey(dbProperties, ['Room No', 'Room', 'Room Number'], ['rich_text', 'title'], false);
    const sellPriceKey = findPropertyKey(dbProperties, ['Sell Price', 'Selling Price', 'Rate'], ['number'], false);
    const quantityKey = findPropertyKey(dbProperties, ['Quantity', 'Qty'], ['number'], false);
    const createdAtKey = findPropertyKey(dbProperties, ['Date', 'createdAt', 'Created At', 'CreatedAt'], ['date', 'rich_text'], false);
    const businessDateKey = findPropertyKey(dbProperties, ['Business Date', 'businessDate', 'BusinessDate', 'Biz Date'], ['rich_text', 'date'], false);
    const itemsKey = findPropertyKey(dbProperties, ['Items', 'items', 'Sale Items', 'Transaction Items'], ['rich_text'], false);
    const nameTitleKey = findPropertyKey(dbProperties, ['Name', 'Title'], ['title']);
    
    // Attempt to locate fields to store a static snapshot instead of relying solely on relation rollups
    const buyPriceKey = findPropertyKey(dbProperties, ['Buy Price', 'Cost Price'], ['number'], false);
    const itemNameKey = findPropertyKey(dbProperties, ['Item Name', 'Product Name'], ['rich_text', 'title'], false);

    const supportsGroupedItems = !!itemsKey;

    if (supportsGroupedItems) {
      const response = await notion.pages.create({
        parent: { database_id: STOCK_OUT_DB_ID },
        properties: {
          ...(nameTitleKey
            ? {
                [nameTitleKey]: {
                  title: [
                    {
                      text: {
                        content: `Sale - ${businessDate}`,
                      },
                    },
                  ],
                },
              }
            : {}),
          ...(itemsKey
            ? {
                [itemsKey]: {
                  rich_text: [
                    {
                      text: {
                        content: JSON.stringify(items),
                      },
                    },
                  ],
                },
              }
            : {}),
          ...(roomNoKey
            ? {
                [roomNoKey]: {
                  rich_text: roomNo ? [{ text: { content: String(roomNo) } }] : [],
                },
              }
            : {}),
          ...(amountPaidKey ? { [amountPaidKey]: { number: Number(amountPaid) } } : {}),
          ...(businessDateKey
            ? {
                [businessDateKey]:
                  getDbPropertyRecord(dbProperties, businessDateKey).type === 'date'
                    ? { date: { start: `${businessDate}T00:00:00.000Z` } }
                    : {
                        rich_text: [
                          {
                            text: {
                              content: businessDate,
                            },
                          },
                        ],
                      },
              }
            : {}),
          ...(createdAtKey
            ? {
                [createdAtKey]:
                  getDbPropertyRecord(dbProperties, createdAtKey).type === 'date'
                    ? { date: { start: createdAt } }
                    : {
                        rich_text: [
                          {
                            text: {
                              content: createdAt,
                            },
                          },
                        ],
                      },
              }
            : {}),
        },
      });

      return NextResponse.json({ success: true, data: { id: response.id }, message: 'Sale created successfully' });
    }

    const stockInRes = await notion.databases.query({ database_id: STOCK_IN_DB_ID });
    const stockMap = new Map<string, { id: string; name: string; buyPrice: number }>();
    
    stockInRes.results.forEach((result) => {
      const title = getTitleFromPage(result);
      const id = (result as UnknownRecord)?.id;
      const properties = (result as UnknownRecord)?.properties as UnknownRecord;
      let buyPrice = 0;
      
      // Attempt to read 'Buy Price' natively
      if (properties) {
        const bpProp = properties['Buy Price'] || properties['Cost Price'];
        if (bpProp && typeof bpProp === 'object' && (bpProp as UnknownRecord).type === 'number') {
          buyPrice = Number((bpProp as UnknownRecord).number) || 0;
        }
      }
      
      if (typeof id === 'string' && title) {
        const normalized = normalizeKey(title);
        // Map by title
        stockMap.set(normalized, { id, name: title, buyPrice });
        // Map by id
        stockMap.set(id, { id, name: title, buyPrice });
      }
    });

    const saleTotals = items.map((item) => Number(item.sellingPrice || 0) * Number(item.quantity || 0));
    const totalAmount = saleTotals.reduce((sum, total) => sum + total, 0);
    let remainingAmountPaid = Number(amountPaid || 0);

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
        const lineTotal = saleTotals[index] || 0;
        const proportionalPaid =
          index === items.length - 1
            ? remainingAmountPaid
            : totalAmount > 0
              ? Math.round((Number(amountPaid || 0) * (lineTotal / totalAmount)) * 100) / 100
              : 0;

        if (index !== items.length - 1) {
          remainingAmountPaid -= proportionalPaid;
        }

        const normalizedKey = normalizeKey(item.name || item.productId || '');
        const stockData = stockMap.get(item.productId) || stockMap.get(normalizedKey);
        const relationId = isUuid(item.productId) ? item.productId : stockData?.id;

        const finalItemName = item.name || stockData?.name || 'Unknown Item';
        const finalBuyPrice = Number(item.costPrice) > 0 ? Number(item.costPrice) : (stockData?.buyPrice || 0);

        const properties: NonNullable<Parameters<typeof notion.pages.create>[0]['properties']> = {};

        if (itemRelationKey && relationId) {
          properties[itemRelationKey] = { relation: [{ id: relationId }] };
        }
        
        // Populate snapshot fields if they exist in schema
        if (buyPriceKey) {
          properties[buyPriceKey] = { number: finalBuyPrice };
        }

        if (itemNameKey) {
          if (getDbPropertyRecord(dbProperties, itemNameKey).type === 'title') {
            properties[itemNameKey] = { title: [{ text: { content: finalItemName } }] };
          } else {
            properties[itemNameKey] = { rich_text: [{ text: { content: finalItemName } }] };
          }
        }
        
        // Use nameTitleKey for the row's name title if it wasn't used for itemNameKey
        if (nameTitleKey && nameTitleKey !== itemNameKey) {
            properties[nameTitleKey] = { title: [{ text: { content: finalItemName } }] };
        }

        if (sellPriceKey) {
          properties[sellPriceKey] = { number: Number(item.sellingPrice || 0) };
        }
        if (quantityKey) {
          properties[quantityKey] = { number: Number(item.quantity || 0) };
        }
        if (roomNoKey) {
          properties[roomNoKey] = { rich_text: roomNo ? [{ text: { content: String(roomNo) } }] : [] };
        }
        if (amountPaidKey) {
          properties[amountPaidKey] = { number: Number(proportionalPaid || 0) };
        }
        if (businessDateKey) {
          properties[businessDateKey] =
            getDbPropertyRecord(dbProperties, businessDateKey).type === 'date'
              ? { date: { start: `${businessDate}T00:00:00.000Z` } }
              : {
                  rich_text: [
                    {
                      text: {
                        content: businessDate,
                      },
                    },
                  ],
                };
        }
        if (createdAtKey) {
          properties[createdAtKey] =
            getDbPropertyRecord(dbProperties, createdAtKey).type === 'date'
              ? { date: { start: createdAt } }
              : {
                  rich_text: [
                    {
                      text: {
                        content: createdAt,
                      },
                    },
                  ],
                };
        }

        await notion.pages.create({
          parent: { database_id: STOCK_OUT_DB_ID },
          properties,
        });
    }

    return NextResponse.json({ success: true, message: 'Sale created via legacy mode successfully' });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, message: getErrorMessage(error, 'Unable to create sale') }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, amountPaid } = (await request.json()) as UpdatePaymentPayload;
    if (!id) return NextResponse.json({ success: false, message: 'ID is required' }, { status: 400 });

    await notion.pages.update({
      page_id: id,
      properties: {
        'Amount Paid': { number: Number(amountPaid) },
      },
    });

    return NextResponse.json({ success: true, message: 'Payment updated gracefully' });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, message: getErrorMessage(error, 'Unable to update payment') }, { status: 500 });
  }
}
