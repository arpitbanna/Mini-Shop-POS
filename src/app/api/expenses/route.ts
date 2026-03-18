import { NextResponse } from 'next/server';
import { notion, EXPENSES_DB_ID } from '@/lib/notion';
import { ExpenseItem } from '@/lib/types';
import { asNotionResult, getDateStartProperty, getErrorMessage, getNumberProperty, getTitleProperty } from '@/lib/notion-helpers';
import type { AddNamedAmountPayload } from '@/types';

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

    const expenses: ExpenseItem[] = response.results
      .map((result) => {
        const page = asNotionResult(result);
        if (!page) return null;

        return {
          id: page.id,
          name: getTitleProperty(page.properties, 'Name', 'Unknown'),
          amount: getNumberProperty(page.properties, 'Amount', 0),
          date: getDateStartProperty(page.properties, 'Date', new Date().toISOString()),
        };
      })
      .filter((expense): expense is ExpenseItem => expense !== null);

    return NextResponse.json(expenses);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error, 'Unable to fetch expenses') }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, amount, date } = (await request.json()) as AddNamedAmountPayload;

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
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error, 'Unable to create expense') }, { status: 500 });
  }
}
