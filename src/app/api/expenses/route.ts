/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { notion, EXPENSES_DB_ID } from '@/lib/notion';
import { ExpenseItem } from '@/lib/types';

export const revalidate = 0; // Disable caching

export async function GET() {
  try {
    const response = await notion.databases.query({
      database_id: EXPENSES_DB_ID,
      sorts: [
        {
          property: 'Date',
          direction: 'descending',
        },
      ],
    });

    const expenses: ExpenseItem[] = response.results.map((page: any) => ({
      id: page.id,
      name: page.properties.Name.title[0]?.plain_text || 'Unknown',
      amount: page.properties.Amount.number || 0,
      date: page.properties.Date.date?.start || new Date().toISOString(),
    }));

    return NextResponse.json(expenses);
  } catch (error: any) {
    console.error('Failed to fetch expenses:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, amount, date } = await request.json();

    const response = await notion.pages.create({
      parent: { database_id: EXPENSES_DB_ID },
      properties: {
        Name: {
          title: [
            {
              text: { content: name },
            },
          ],
        },
        Amount: {
          number: Number(amount),
        },
        Date: {
          date: { start: date },
        },
      },
    });

    return NextResponse.json({ success: true, id: response.id });
  } catch (error: any) {
    console.error('Expense creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
