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
  queryAllDatabasePages,
} from '@/lib/notion-helpers';
import { getBusinessDate, getBusinessDateRange } from '@/lib/business-day';

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

export async function GET(request: Request) {
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

    const stockOutRes = await queryAllDatabasePages(notion, {
      database_id: STOCK_OUT_DB_ID,
    });
    
    const stockInRes = await queryAllDatabasePages(notion, {
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

    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const filterParam = searchParams.get('filter') || 'all';
    const dateFilterParam = searchParams.get('dateFilter') || 'all';

    if (pageParam && limitParam) {
      const page = parseInt(pageParam, 10) || 1;
      const limit = parseInt(limitParam, 10) || 50;
      
      const sortedSales = [...sales].sort((a, b) => {
        const businessDateSort = b.businessDate.localeCompare(a.businessDate);
        if (businessDateSort !== 0) return businessDateSort;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      const filteredSales = sortedSales.filter((sale) => {
        let statusMatch = true;
        if (filterParam === 'paid') statusMatch = sale.remaining <= 0;
        else if (filterParam === 'partial') statusMatch = sale.remaining > 0 && sale.amountPaid > 0;
        else if (filterParam === 'unpaid') statusMatch = sale.amountPaid <= 0;
        
        let dateMatch = true;
        if (dateFilterParam !== 'all') {
          const todayBusinessDate = getBusinessDate();
          if (dateFilterParam === 'today') {
            dateMatch = sale.businessDate === todayBusinessDate;
          } else {
            const days = dateFilterParam === 'week' ? 7 : 30;
            const allowed = new Set(getBusinessDateRange(days));
            dateMatch = allowed.has(sale.businessDate);
          }
        }
        return statusMatch && dateMatch;
      });

      const totals = {
        totalBill: filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0),
        totalProfit: filteredSales.reduce((sum, sale) => sum + sale.profit, 0),
        outstanding: filteredSales.reduce((sum, sale) => sum + Math.max(0, sale.remaining), 0)
      };

      const skip = (page - 1) * limit;
      const paginatedData = filteredSales.slice(skip, skip + limit);

      return NextResponse.json({
        success: true,
        data: {
          data: paginatedData,
          total: filteredSales.length,
          page,
          totalPages: Math.ceil(filteredSales.length / limit),
          totals
        }
      });
    }

    return NextResponse.json({ success: true, data: sales });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, message: getErrorMessage(error, 'Unable to fetch sales data') }, { status: 500 });
  }
}
