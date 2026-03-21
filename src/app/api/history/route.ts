import { NextResponse } from 'next/server';
import { notion, STOCK_IN_DB_ID, STOCK_OUT_DB_ID, PURCHASES_DB_ID, EXPENSES_DB_ID } from '@/lib/notion';
import { queryAllDatabasePages, asNotionResult, getTitleProperty, getNumberProperty, getDateStartProperty, getJsonTextProperty, getTextProperty } from '@/lib/notion-helpers';

export const dynamic = 'force-dynamic';

export type HistoryItem = {
  id: string;
  type: 'Stock In' | 'Sale' | 'Purchase' | 'Expense';
  title: string;
  amount: number;
  date: string;
  extraInfo: string;
};

export async function GET() {
  try {
    const [stockInRes, stockOutRes, purchasesRes, expensesRes] = await Promise.all([
      queryAllDatabasePages(notion, { database_id: STOCK_IN_DB_ID }),
      queryAllDatabasePages(notion, { database_id: STOCK_OUT_DB_ID }),
      queryAllDatabasePages(notion, { database_id: PURCHASES_DB_ID }),
      queryAllDatabasePages(notion, { database_id: EXPENSES_DB_ID }),
    ]);

    const history: HistoryItem[] = [];

    // Parse Stock In
    stockInRes.results.forEach((result) => {
      const page = asNotionResult(result);
      if (!page) return;
      
      const date = getDateStartProperty(page.properties, 'Date', page.created_time || new Date().toISOString());
      const groupedItems = getJsonTextProperty<any[]>(page.properties, 'Items', []);
      
      if (groupedItems.length > 0) {
        const title = groupedItems.length === 1 ? groupedItems[0].name : `${groupedItems.length} items added`;
        const amount = groupedItems.reduce((acc, item) => acc + (Number(item.buyPrice || 0) * Number(item.quantity || 0)), 0);
        const extraInfo = groupedItems.map((item) => `${item.name} x${item.quantity}`).join(', ');
        history.push({ id: page.id, type: 'Stock In', title, amount, date, extraInfo });
      } else {
        const title = getTitleProperty(page.properties, 'Name', 'Unnamed Stock');
        const qty = getNumberProperty(page.properties, 'Quantity', 0);
        const buyPrice = getNumberProperty(page.properties, 'Buy Price', 0);
        history.push({ id: page.id, type: 'Stock In', title, amount: qty * buyPrice, date, extraInfo: `Qty: ${qty}` });
      }
    });

    // Parse Sales
    stockOutRes.results.forEach((result) => {
      const page = asNotionResult(result);
      if (!page) return;

      const dateRaw = getDateStartProperty(page.properties, 'Date', page.created_time || new Date().toISOString());
      const date = dateRaw.includes('T') ? dateRaw : dateRaw + 'T00:00:00.000Z'; // ensure valid sort

      const roomNo = getTitleProperty(page.properties, 'Room No', getTextProperty(page.properties, 'Room No', ''));
      const title = roomNo ? (roomNo.match(/^\d+$/) ? `Room ${roomNo}` : roomNo) : 'Sale Transaction';

      const serializedItems = getJsonTextProperty<any[]>(page.properties, 'Items', []);
      let amount = 0;
      let extraInfo = '';
      
      if (serializedItems.length > 0) {
        amount = serializedItems.reduce((acc, item) => acc + Number(item.total || item.sellingPrice * item.quantity || 0), 0);
        extraInfo = serializedItems.map((item) => `${item.name} x${item.quantity}`).join(', ');
      } else {
        amount = getNumberProperty(page.properties, 'Amount Paid', 0);
        extraInfo = 'Legacy Sale Item';
      }
      
      history.push({ id: page.id, type: 'Sale', title, amount, date, extraInfo });
    });

    // Parse Purchases
    purchasesRes.results.forEach((result) => {
      const page = asNotionResult(result);
      if (!page) return;
      const title = getTitleProperty(page.properties, 'Name', 'Purchase');
      const amount = getNumberProperty(page.properties, 'Amount', 0);
      const date = getDateStartProperty(page.properties, 'date', page.created_time || new Date().toISOString());
      history.push({ id: page.id, type: 'Purchase', title, amount, date, extraInfo: '' });
    });

    // Parse Expenses
    expensesRes.results.forEach((result) => {
      const page = asNotionResult(result);
      if (!page) return;
      const title = getTitleProperty(page.properties, 'Name', 'Expense');
      const amount = getNumberProperty(page.properties, 'Amount', 0);
      const date = getDateStartProperty(page.properties, 'Date', page.created_time || new Date().toISOString());
      history.push({ id: page.id, type: 'Expense', title, amount, date, extraInfo: '' });
    });

    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ success: true, data: history });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
