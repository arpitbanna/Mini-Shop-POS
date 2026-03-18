import { NextResponse } from 'next/server';
import { notion, PURCHASES_DB_ID } from '@/lib/notion';
import { PurchaseItem } from '@/lib/types';
import { asNotionResult, getDateStartProperty, getErrorMessage, getNumberProperty, getTitleProperty } from '@/lib/notion-helpers';
import type { AddNamedAmountPayload } from '@/types';

export const revalidate = 0; // Disable caching

export async function GET() {
  try {
    const response = await notion.databases.query({
      database_id: PURCHASES_DB_ID,
      sorts: [
        {
          property: 'date',
          direction: 'descending',
        },
      ],
    });

    const purchases: PurchaseItem[] = response.results
      .map((result) => {
        const page = asNotionResult(result);
        if (!page) return null;

        return {
          id: page.id,
          name: getTitleProperty(page.properties, 'Name', 'Unknown'),
          amount: getNumberProperty(page.properties, 'Amount', 0),
          date: getDateStartProperty(page.properties, 'date', new Date().toISOString()),
        };
      })
      .filter((purchase): purchase is PurchaseItem => purchase !== null);

    return NextResponse.json(purchases);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error, 'Unable to fetch purchases') }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, amount, date } = (await request.json()) as AddNamedAmountPayload;

    const response = await notion.pages.create({
      parent: { database_id: PURCHASES_DB_ID },
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
        date: {
          date: { start: date },
        },
      },
    });

    return NextResponse.json({ success: true, id: response.id });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error, 'Unable to create purchase') }, { status: 500 });
  }
}
