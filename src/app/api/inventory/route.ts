import { NextResponse } from 'next/server';
import { notion, STOCK_IN_DB_ID, STOCK_OUT_DB_ID } from '@/lib/notion';
import { InventoryItem } from '@/lib/types';
import {
  asNotionResult,
  getDateStartProperty,
  getErrorMessage,
  getJsonTextProperty,
  getNumberProperty,
  getRelationFirstId,
  getTitleProperty,
} from '@/lib/notion-helpers';
import { calculateAvailableQuantity } from '@/lib/calculations';
import type { InventoryUpdatePayload } from '@/types';

type StockEntryItem = {
  name: string;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
};

type SaleEntryItem = {
  productId?: string;
  name: string;
  quantity: number;
};

function normalizeProductKey(name: string) {
  return name.trim().toLowerCase();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stockInRes = await notion.databases.query({
      database_id: STOCK_IN_DB_ID,
    });
    
    const stockOutRes = await notion.databases.query({
      database_id: STOCK_OUT_DB_ID,
    });

    const inventoryMap = new Map<string, InventoryItem>();
    const relationIdToProductKey = new Map<string, string>();

    stockInRes.results.forEach((result) => {
      const page = asNotionResult(result);
      if (!page) return;

      const dateAddedProp = getDateStartProperty(page.properties, 'Date', page.created_time || '');

      const groupedItems = getJsonTextProperty<StockEntryItem[]>(page.properties, 'Items', []);
      const normalizedItems = groupedItems.length
        ? groupedItems
        : [
            {
              name: getTitleProperty(page.properties, 'Name', 'Unnamed Item'),
              buyPrice: getNumberProperty(page.properties, 'Buy Price', 0),
              sellPrice: getNumberProperty(page.properties, 'Sell Price', 0),
              quantity: getNumberProperty(page.properties, 'Quantity', 0),
            },
          ];

      normalizedItems.forEach((entry) => {
        const key = normalizeProductKey(entry.name);
        relationIdToProductKey.set(page.id, key);

        if (!inventoryMap.has(key)) {
          inventoryMap.set(key, {
            id: key,
            name: entry.name,
            buyPrice: Number(entry.buyPrice || 0),
            sellPrice: Number(entry.sellPrice || 0),
            quantityIn: 0,
            quantityOut: 0,
            available: 0,
            dateAdded: dateAddedProp,
          });
        }

        const item = inventoryMap.get(key)!;
        item.quantityIn += Number(entry.quantity || 0);
        item.buyPrice = Number(entry.buyPrice || item.buyPrice || 0);
        item.sellPrice = Number(entry.sellPrice || item.sellPrice || 0);
        if (!item.dateAdded || (dateAddedProp && new Date(dateAddedProp) < new Date(item.dateAdded))) {
          item.dateAdded = dateAddedProp;
        }
        item.available = calculateAvailableQuantity(item.quantityIn, item.quantityOut);
      });
    });

    stockOutRes.results.forEach((result) => {
      const page = asNotionResult(result);
      if (!page) return;

      const groupedItems = getJsonTextProperty<SaleEntryItem[]>(page.properties, 'Items', []);

      if (groupedItems.length > 0) {
        groupedItems.forEach((entry) => {
          const directKey = entry.productId ? normalizeProductKey(entry.productId) : '';
          const nameKey = normalizeProductKey(entry.name || '');
          const itemKey = inventoryMap.has(directKey)
            ? directKey
            : inventoryMap.has(nameKey)
              ? nameKey
              : '';

          if (!itemKey) return;

          const item = inventoryMap.get(itemKey)!;
          item.quantityOut += Number(entry.quantity || 0);
          item.available = calculateAvailableQuantity(item.quantityIn, item.quantityOut);
        });
        return;
      }

      const legacyItemId = getRelationFirstId(page.properties, 'Item');
      const legacyQuantityOut = getNumberProperty(page.properties, 'Quantity', 0);
      const legacyItemKey = relationIdToProductKey.get(legacyItemId || '');

      if (legacyItemKey && inventoryMap.has(legacyItemKey)) {
        const item = inventoryMap.get(legacyItemKey)!;
        item.quantityOut += legacyQuantityOut;
        item.available = calculateAvailableQuantity(item.quantityIn, item.quantityOut);
      }
    });

    return NextResponse.json(Array.from(inventoryMap.values()));
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error, 'Unable to fetch inventory') }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as InventoryUpdatePayload;
    const { id, name, buyPrice, sellPrice, quantityIn } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    if (!isUuid(id)) {
      const targetKey = normalizeProductKey(id);
      const stockInRes = await notion.databases.query({
        database_id: STOCK_IN_DB_ID,
      });

      let groupedMatch: { pageId: string; items: StockEntryItem[]; index: number } | null = null;
      let legacyPageId = '';

      for (const result of stockInRes.results) {
        const page = asNotionResult(result);
        if (!page) continue;

        const groupedItems = getJsonTextProperty<StockEntryItem[]>(page.properties, 'Items', []);
        if (groupedItems.length > 0) {
          const index = groupedItems.findIndex((item) => normalizeProductKey(item.name) === targetKey);
          if (index >= 0) {
            groupedMatch = { pageId: page.id, items: groupedItems, index };
            break;
          }
          continue;
        }

        const legacyName = normalizeProductKey(getTitleProperty(page.properties, 'Name', ''));
        if (legacyName === targetKey) {
          legacyPageId = page.id;
          break;
        }
      }

      if (groupedMatch) {
        const updatedItems = [...groupedMatch.items];
        const item = { ...updatedItems[groupedMatch.index] };
        if (name !== undefined) item.name = name;
        if (buyPrice !== undefined) item.buyPrice = Number(buyPrice);
        if (sellPrice !== undefined) item.sellPrice = Number(sellPrice);
        if (quantityIn !== undefined) item.quantity = Number(quantityIn);
        updatedItems[groupedMatch.index] = item;

        const updatedQuantity = updatedItems.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);

        await notion.pages.update({
          page_id: groupedMatch.pageId,
          properties: {
            Items: {
              rich_text: [
                {
                  text: {
                    content: JSON.stringify(updatedItems),
                  },
                },
              ],
            },
            Quantity: {
              number: updatedQuantity,
            },
          },
        });

        return NextResponse.json({ success: true });
      }

      if (!legacyPageId) {
        return NextResponse.json(
          { error: 'Item ID must be a valid UUID or an existing inventory item key' },
          { status: 400 },
        );
      }

      const properties: NonNullable<Parameters<typeof notion.pages.update>[0]['properties']> = {};
      if (name !== undefined) properties.Name = { title: [{ text: { content: name } }] };
      if (buyPrice !== undefined) properties['Buy Price'] = { number: Number(buyPrice) };
      if (sellPrice !== undefined) properties['Sell Price'] = { number: Number(sellPrice) };
      if (quantityIn !== undefined) properties.Quantity = { number: Number(quantityIn) };

      await notion.pages.update({ page_id: legacyPageId, properties });
      return NextResponse.json({ success: true });
    }

    const properties: NonNullable<Parameters<typeof notion.pages.update>[0]['properties']> = {};
    if (name !== undefined) properties.Name = { title: [{ text: { content: name } }] };
    if (buyPrice !== undefined) properties['Buy Price'] = { number: Number(buyPrice) };
    if (sellPrice !== undefined) properties['Sell Price'] = { number: Number(sellPrice) };
    if (quantityIn !== undefined) properties.Quantity = { number: Number(quantityIn) };

    await notion.pages.update({ page_id: id, properties });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error, 'Unable to update inventory item') }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');
    const id = searchParams.get('id');

    const stockInRes = await notion.databases.query({
      database_id: STOCK_IN_DB_ID,
    });

    const stockOutRes = await notion.databases.query({
      database_id: STOCK_OUT_DB_ID,
    });

    const inventoryMap = new Map<string, { quantityIn: number; quantityOut: number }>();
    const stockInPagesByKey = new Map<string, string[]>();

    stockInRes.results.forEach((result) => {
      const page = asNotionResult(result);
      if (!page) return;

      const groupedItems = getJsonTextProperty<StockEntryItem[]>(page.properties, 'Items', []);
      const normalizedItems = groupedItems.length
        ? groupedItems
        : [
            {
              name: getTitleProperty(page.properties, 'Name', 'Unnamed Item'),
              buyPrice: getNumberProperty(page.properties, 'Buy Price', 0),
              sellPrice: getNumberProperty(page.properties, 'Sell Price', 0),
              quantity: getNumberProperty(page.properties, 'Quantity', 0),
            },
          ];

      normalizedItems.forEach((entry) => {
        const key = normalizeProductKey(entry.name);
        const current = inventoryMap.get(key) || { quantityIn: 0, quantityOut: 0 };
        current.quantityIn += Number(entry.quantity || 0);
        inventoryMap.set(key, current);

        const existingPages = stockInPagesByKey.get(key) || [];
        stockInPagesByKey.set(key, [...existingPages, page.id]);
      });
    });

    stockOutRes.results.forEach((result) => {
      const page = asNotionResult(result);
      if (!page) return;

      const groupedItems = getJsonTextProperty<SaleEntryItem[]>(page.properties, 'Items', []);
      if (groupedItems.length > 0) {
        groupedItems.forEach((entry) => {
          const key = normalizeProductKey(entry.name || entry.productId || '');
          if (!key) return;
          const current = inventoryMap.get(key) || { quantityIn: 0, quantityOut: 0 };
          current.quantityOut += Number(entry.quantity || 0);
          inventoryMap.set(key, current);
        });
        return;
      }

      const legacyQuantityOut = getNumberProperty(page.properties, 'Quantity', 0);
      const legacyItemId = getRelationFirstId(page.properties, 'Item');
      if (!legacyItemId) return;

      stockInRes.results.forEach((stockInResult) => {
        const stockInPage = asNotionResult(stockInResult);
        if (!stockInPage || stockInPage.id !== legacyItemId) return;
        const key = normalizeProductKey(getTitleProperty(stockInPage.properties, 'Name', ''));
        if (!key) return;
        const current = inventoryMap.get(key) || { quantityIn: 0, quantityOut: 0 };
        current.quantityOut += Number(legacyQuantityOut || 0);
        inventoryMap.set(key, current);
      });
    });

    const removeKeysFromStockIn = async (keys: Set<string>) => {
      if (keys.size === 0) return;

      for (const result of stockInRes.results) {
        const page = asNotionResult(result);
        if (!page) continue;

        const groupedItems = getJsonTextProperty<StockEntryItem[]>(page.properties, 'Items', []);
        if (groupedItems.length > 0) {
          const remainingItems = groupedItems.filter((item) => !keys.has(normalizeProductKey(item.name)));
          if (remainingItems.length === groupedItems.length) continue;

          if (remainingItems.length === 0) {
            await notion.pages.update({ page_id: page.id, archived: true });
            continue;
          }

          const updatedQuantity = remainingItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
          await notion.pages.update({
            page_id: page.id,
            properties: {
              Items: {
                rich_text: [
                  {
                    text: {
                      content: JSON.stringify(remainingItems),
                    },
                  },
                ],
              },
              Quantity: {
                number: updatedQuantity,
              },
            },
          });
          continue;
        }

        const legacyName = normalizeProductKey(getTitleProperty(page.properties, 'Name', ''));
        if (!keys.has(legacyName)) continue;

        await notion.pages.update({ page_id: page.id, archived: true });
      }
    };

    if (mode === 'out-of-stock') {
      const outOfStockKeys = Array.from(inventoryMap.entries())
        .filter(([, qty]) => calculateAvailableQuantity(qty.quantityIn, qty.quantityOut) <= 0)
        .map(([key]) => key);

      await removeKeysFromStockIn(new Set(outOfStockKeys));
      return NextResponse.json({ success: true, deletedCount: outOfStockKeys.length });
    }

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const pageIdsToProcess = Array.from(new Set(stockInPagesByKey.get(id) || []));
    if (pageIdsToProcess.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    await removeKeysFromStockIn(new Set([id]));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error, 'Unable to delete inventory item') }, { status: 500 });
  }
}
