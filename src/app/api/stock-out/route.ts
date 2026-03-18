import { NextResponse } from 'next/server';
import { notion, STOCK_OUT_DB_ID } from '@/lib/notion';
import { getErrorMessage } from '@/lib/notion-helpers';
import type { AddSalePayload, UpdatePaymentPayload } from '@/types';

export async function POST(request: Request) {
  try {
    const { itemId, sellPrice, quantity, roomNo, amountPaid, date } = (await request.json()) as AddSalePayload;

    const response = await notion.pages.create({
      parent: { database_id: STOCK_OUT_DB_ID },
      properties: {
        Item: { relation: [{ id: itemId }] },
        'Sell Price': { number: Number(sellPrice) },
        Quantity: { number: Number(quantity) },
        'Room No': { number: Number(roomNo) },
        'Amount Paid': { number: Number(amountPaid) },
        Date: { date: { start: date } },
      },
    });

    return NextResponse.json({ success: true, id: response.id });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error, 'Unable to create sale') }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, amountPaid } = (await request.json()) as UpdatePaymentPayload;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await notion.pages.update({
      page_id: id,
      properties: {
        'Amount Paid': { number: Number(amountPaid) },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error, 'Unable to update payment') }, { status: 500 });
  }
}
