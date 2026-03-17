import { NextResponse } from 'next/server';
import { notion, STOCK_OUT_DB_ID } from '@/lib/notion';

export async function POST(request: Request) {
  try {
    const { itemId, sellPrice, quantity, roomNo, amountPaid, date } = await request.json();

    const response = await notion.pages.create({
      parent: { database_id: STOCK_OUT_DB_ID },
      properties: {
        Item: {
          relation: [{ id: itemId }],
        },
        'Sell Price': {
          number: Number(sellPrice),
        },
        Quantity: {
          number: Number(quantity),
        },
        'Room No': {
          number: Number(roomNo),
        },
        'Amount Paid': {
          number: Number(amountPaid),
        },
        Date: {
          date: { start: date },
        },
      },
    });

    return NextResponse.json({ success: true, id: response.id });
  } catch (error: any) {
    console.error('Stock Out creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
