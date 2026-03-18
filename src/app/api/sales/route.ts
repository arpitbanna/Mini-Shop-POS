import { NextResponse } from 'next/server';
import { notion, STOCK_IN_DB_ID, STOCK_OUT_DB_ID } from '@/lib/notion';
import { SaleItem } from '@/lib/types';
import {
  asNotionResult,
  getDateStartProperty,
  getErrorMessage,
  getNumberProperty,
  getRelationFirstId,
  getRollupNumberProperty,
  getTitleProperty,
  getTextProperty,
} from '@/lib/notion-helpers';
import { calculateSaleTotals } from '@/lib/calculations';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
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

        const itemId = getRelationFirstId(page.properties, 'Item');
        const sellPrice = getNumberProperty(page.properties, 'Sell Price', 0);
        const quantity = getNumberProperty(page.properties, 'Quantity', 0);
        const amountPaid = getNumberProperty(page.properties, 'Amount Paid', 0);
        const fallbackBuyPrice = itemNameMap.get(itemId)?.buyPrice || 0;
        const buyPrice = getRollupNumberProperty(page.properties, 'Buy Price', fallbackBuyPrice);
        const { total, profit, remaining } = calculateSaleTotals(sellPrice, buyPrice, quantity, amountPaid);

        return {
          id: page.id,
          itemId,
          itemName: itemNameMap.get(itemId)?.name || 'Unknown',
          date: getDateStartProperty(page.properties, 'Date', ''),
          sellPrice,
          buyPrice,
          quantity,
          total,
          profit,
          roomNo: getTextProperty(page.properties, 'Room No', ''),
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
