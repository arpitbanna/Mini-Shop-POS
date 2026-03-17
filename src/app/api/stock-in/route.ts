/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { notion, STOCK_IN_DB_ID } from '@/lib/notion';

export async function POST(request: Request) {
  try {
    const { name, buyPrice, sellPrice, quantity, date } = await request.json();

    const response = await notion.pages.create({
      parent: { database_id: STOCK_IN_DB_ID },
      properties: {
        Name: {
          title: [
            {
              text: { content: name },
            },
          ],
        },
        'Buy Price': {
          number: Number(buyPrice),
        },
        'Sell Price': {
          number: Number(sellPrice),
        },
        Quantity: {
          number: Number(quantity),
        },
        Date: {
          date: { start: date },
        },
      },
    });

    return NextResponse.json({ success: true, id: response.id });
  } catch (error: any) {
    console.error('Stock In creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
