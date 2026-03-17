import { NextResponse } from 'next/server';
import { notion, STOCK_IN_DB_ID, STOCK_OUT_DB_ID } from '@/lib/notion';
import { InventoryItem } from '@/lib/types';

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

    stockInRes.results.forEach((page: any) => {
      const nameProp = page.properties.Name?.title?.[0]?.plain_text || 'Unnamed Item';
      const buyPriceProp = page.properties['Buy Price']?.number || 0;
      const sellPriceProp = page.properties['Sell Price']?.number || 0;
      const quantityInProp = page.properties.Quantity?.number || 0;
      const dateAddedProp = page.created_time || '';

      inventoryMap.set(page.id, {
        id: page.id,
        name: nameProp,
        buyPrice: buyPriceProp,
        sellPrice: sellPriceProp,
        quantityIn: quantityInProp,
        quantityOut: 0,
        available: quantityInProp,
        dateAdded: dateAddedProp,
      });
    });

    stockOutRes.results.forEach((page: any) => {
      const relation = page.properties.Item?.relation;
      const itemId = relation && relation.length > 0 ? relation[0].id : null;
      const quantityOutProp = page.properties.Quantity?.number || 0;

      if (itemId && inventoryMap.has(itemId)) {
        const item = inventoryMap.get(itemId)!;
        item.quantityOut += quantityOutProp;
        item.available = item.quantityIn - item.quantityOut;
      }
    });

    // Grouping by item name can be done on the client side if necessary, 
    // but returning the distinct stock-in lots.
    return NextResponse.json(Array.from(inventoryMap.values()));
  } catch (error: any) {
    console.error('Inventory fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
