import { NextResponse } from 'next/server';
import { notion, STOCK_IN_DB_ID } from '@/lib/notion';
import { getErrorMessage } from '@/lib/notion-helpers';
import type { AddStockPayload } from '@/types';

export async function POST(request: Request) {
  try {
    const { name, buyPrice, sellPrice, quantity, date } = (await request.json()) as AddStockPayload;

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
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error, 'Unable to create stock entry') }, { status: 500 });
  }
}
