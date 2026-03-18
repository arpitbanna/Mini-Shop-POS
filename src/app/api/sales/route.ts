import { NextResponse } from 'next/server';
import { notion, STOCK_IN_DB_ID, STOCK_OUT_DB_ID } from '@/lib/notion';
import { SaleItem } from '@/lib/types';
import {
  asNotionResult,
  getDateStartProperty,
  getErrorMessage,
  getJsonTextProperty,
  getNumberProperty,
  getRelationFirstId,
  getRollupNumberProperty,
  getTitleProperty,
  getTextProperty,
} from '@/lib/notion-helpers';
import { getBusinessDate } from '@/lib/business-day';

type SerializedSaleItem = {
  productId: string;
  name: string;
  quantity: number;
  sellingPrice: number;
  costPrice: number;
  total?: number;
};

type UnknownRecord = Record<string, unknown>;

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

function getDbProperties(value: unknown): UnknownRecord {
  if (!value || typeof value !== 'object') return {};
  const record = value as UnknownRecord;
  const properties = record.properties;
  if (!properties || typeof properties !== 'object') return {};
  return properties as UnknownRecord;
}

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

function getDateOrTextPropertyByKey(properties: unknown, key: string, type: NotionPropertyType | undefined, fallback = ''): string {
  if (type === 'date') {
    return getDateStartProperty(properties, key, fallback);
  }
  if (type === 'title') {
    return getTitleProperty(properties, key, fallback);
  }
  return getTextProperty(properties, key, fallback);
}

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stockOutDb = await notion.databases.retrieve({ database_id: STOCK_OUT_DB_ID });
    const stockOutDbProperties = getDbProperties(stockOutDb);

    const amountPaidKey = findPropertyKey(stockOutDbProperties, ['Amount Paid', 'Paid', 'AmountReceived'], ['number'], false);
    const createdAtKey = findPropertyKey(stockOutDbProperties, ['Date', 'createdAt', 'Created At', 'CreatedAt'], ['date', 'rich_text', 'title'], false);
    const businessDateKey = findPropertyKey(stockOutDbProperties, ['Business Date', 'businessDate', 'BusinessDate', 'Biz Date'], ['rich_text', 'date', 'title'], false);
    const itemsKey = findPropertyKey(stockOutDbProperties, ['Items', 'items', 'Sale Items', 'Transaction Items'], ['rich_text'], false);
    const itemRelationKey = findPropertyKey(stockOutDbProperties, ['Item', 'Product', 'Inventory Item'], ['relation']);
    const sellPriceKey = findPropertyKey(stockOutDbProperties, ['Sell Price', 'Selling Price', 'Rate'], ['number'], false);
    const quantityKey = findPropertyKey(stockOutDbProperties, ['Quantity', 'Qty'], ['number'], false);
    const buyPriceKey = findPropertyKey(stockOutDbProperties, ['Buy Price', 'Cost Price'], ['rollup', 'number'], false);
    const roomNoKey = findPropertyKey(stockOutDbProperties, ['Room No', 'Room', 'Room Number'], ['rich_text', 'title'], false);

    const stockOutRes = await notion.databases.query({
      database_id: STOCK_OUT_DB_ID,
    });
    
    const stockInRes = await notion.databases.query({
      database_id: STOCK_IN_DB_ID,
    });

    const itemNameMap = new Map<string, { name: string; buyPrice: number }>();
    stockInRes.results.forEach((result) => {
      const page = asNotionResult(result);
      if (!page) return;

      itemNameMap.set(page.id, {
        name: getTitleProperty(page.properties, 'Name', 'Unknown'),
        buyPrice: getNumberProperty(page.properties, 'Buy Price', 0),
      });
    });

    const sales: SaleItem[] = stockOutRes.results
      .map((result) => {
        const page = asNotionResult(result);
        if (!page) return null;

        const amountPaid = amountPaidKey ? getNumberProperty(page.properties, amountPaidKey, 0) : 0;
        const createdAtType = createdAtKey ? getDbPropertyRecord(stockOutDbProperties, createdAtKey).type : undefined;
        const createdAt = createdAtKey
          ? getDateOrTextPropertyByKey(page.properties, createdAtKey, createdAtType, page.created_time || '')
          : (page.created_time || '');

        const businessDateType = businessDateKey ? getDbPropertyRecord(stockOutDbProperties, businessDateKey).type : undefined;
        const businessDateRaw = businessDateKey
          ? getDateOrTextPropertyByKey(page.properties, businessDateKey, businessDateType, '')
          : '';
        const businessDate =
          (businessDateRaw.includes('T') ? businessDateRaw.split('T')[0] : businessDateRaw) ||
          getBusinessDate(5, createdAt ? new Date(createdAt) : new Date());

        const serializedItems = itemsKey
          ? getJsonTextProperty<SerializedSaleItem[]>(page.properties, itemsKey, [])
          : [];
        const items = serializedItems.length
          ? serializedItems.map((item) => ({
              productId: item.productId,
              name: item.name,
              quantity: Number(item.quantity || 0),
              sellingPrice: Number(item.sellingPrice || 0),
              costPrice: Number(item.costPrice || 0),
              total: Number(item.total || item.sellingPrice * item.quantity || 0),
            }))
          : (() => {
              const itemId = itemRelationKey ? getRelationFirstId(page.properties, itemRelationKey) : '';
              const sellPrice = sellPriceKey ? getNumberProperty(page.properties, sellPriceKey, 0) : 0;
              const quantity = quantityKey ? getNumberProperty(page.properties, quantityKey, 0) : 0;
              const fallbackBuyPrice = itemNameMap.get(itemId)?.buyPrice || 0;
              const buyPrice = buyPriceKey
                ? getRollupNumberProperty(page.properties, buyPriceKey, fallbackBuyPrice)
                : fallbackBuyPrice;

              return [
                {
                  productId: itemId,
                  name: itemNameMap.get(itemId)?.name || 'Unknown',
                  quantity,
                  sellingPrice: sellPrice,
                  costPrice: buyPrice,
                  total: sellPrice * quantity,
                },
              ];
            })();

        const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
        const profit = items.reduce(
          (sum, item) => sum + (item.sellingPrice - item.costPrice) * item.quantity,
          0,
        );
        const remaining = Math.max(0, totalAmount - amountPaid);

        return {
          id: page.id,
          createdAt,
          businessDate,
          items,
          totalAmount,
          profit,
          roomNo: roomNoKey
            ? getDateOrTextPropertyByKey(
                page.properties,
                roomNoKey,
                getDbPropertyRecord(stockOutDbProperties, roomNoKey).type,
                '',
              )
            : '',
          amountPaid,
          remaining,
        };
      })
      .filter((sale): sale is SaleItem => sale !== null);

    return NextResponse.json(sales);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error, 'Unable to fetch sales data') }, { status: 500 });
  }
}
