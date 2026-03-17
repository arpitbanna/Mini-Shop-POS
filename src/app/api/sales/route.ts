/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { notion, STOCK_IN_DB_ID, STOCK_OUT_DB_ID } from '@/lib/notion';
import { SaleItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stockOutRes = await notion.databases.query({
      database_id: STOCK_OUT_DB_ID,
    });
    
    const stockInRes = await notion.databases.query({
      database_id: STOCK_IN_DB_ID,
    });

    const itemNameMap = new Map<string, {name: string, buyPrice: number}>();
    stockInRes.results.forEach((page: any) => {
      itemNameMap.set(page.id, {
        name: page.properties.Name?.title?.[0]?.plain_text || 'Unknown',
        buyPrice: page.properties['Buy Price']?.number || 0
      });
    });

    const sales: SaleItem[] = stockOutRes.results.map((page: any) => {
      const relation = page.properties.Item?.relation;
      const itemId = relation && relation.length > 0 ? relation[0].id : '';
      
      const sellPrice = page.properties['Sell Price']?.number || 0;
      const buyPrice = page.properties['Buy Price']?.rollup?.number || itemNameMap.get(itemId)?.buyPrice || 0;
      const quantity = page.properties.Quantity?.number || 0;
      const amountPaid = page.properties['Amount Paid']?.number || 0;
      const total = sellPrice * quantity;
      const profit = (sellPrice - buyPrice) * quantity;
      const remaining = total - amountPaid;

      return {
        id: page.id,
        itemId,
        itemName: itemNameMap.get(itemId)?.name || 'Unknown',
        date: page.properties.Date?.date?.start || '',
        sellPrice,
        buyPrice,
        quantity,
        total,
        profit,
        roomNo: page.properties['Room No']?.number || 0,
        amountPaid,
        remaining,
      };
    });

    return NextResponse.json(sales);
  } catch (error: any) {
    console.error('Sales fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
