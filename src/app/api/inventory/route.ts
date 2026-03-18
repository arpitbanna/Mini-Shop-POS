import { NextResponse } from 'next/server';
import { notion, STOCK_IN_DB_ID, STOCK_OUT_DB_ID } from '@/lib/notion';
import { InventoryItem } from '@/lib/types';
import {
  asNotionResult,
  getErrorMessage,
  getNumberProperty,
  getRelationFirstId,
  getTitleProperty,
} from '@/lib/notion-helpers';
import { calculateAvailableQuantity } from '@/lib/calculations';
import type { InventoryUpdatePayload } from '@/types';

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

    stockInRes.results.forEach((result) => {
      const page = asNotionResult(result);
      if (!page) return;

      const nameProp = getTitleProperty(page.properties, 'Name', 'Unnamed Item');
      const buyPriceProp = getNumberProperty(page.properties, 'Buy Price', 0);
      const sellPriceProp = getNumberProperty(page.properties, 'Sell Price', 0);
      const quantityInProp = getNumberProperty(page.properties, 'Quantity', 0);
      const dateAddedProp = page.created_time || '';

      inventoryMap.set(page.id, {
        id: page.id,
        name: nameProp,
        buyPrice: buyPriceProp,
        sellPrice: sellPriceProp,
        quantityIn: quantityInProp,
        quantityOut: 0,
        available: calculateAvailableQuantity(quantityInProp, 0),
        dateAdded: dateAddedProp,
      });
    });

    stockOutRes.results.forEach((result) => {
      const page = asNotionResult(result);
      if (!page) return;

      const itemId = getRelationFirstId(page.properties, 'Item');
      const quantityOutProp = getNumberProperty(page.properties, 'Quantity', 0);

      if (itemId && inventoryMap.has(itemId)) {
        const item = inventoryMap.get(itemId)!;
        item.quantityOut += quantityOutProp;
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
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await notion.pages.update({ page_id: id, archived: true });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error, 'Unable to delete inventory item') }, { status: 500 });
  }
}
