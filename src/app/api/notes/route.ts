import { NextResponse } from 'next/server';
import { notion, NOTES_DB_ID } from '@/lib/notion';
import { NoteItem } from '@/types';
import { asNotionResult, getFullTextProperty, getTitleProperty, queryAllDatabasePages, getErrorMessage } from '@/lib/notion-helpers';

export const revalidate = 0;

export async function GET() {
  try {
    const response = await queryAllDatabasePages(notion, {
      database_id: NOTES_DB_ID,
      sorts: [
        {
          timestamp: 'created_time',
          direction: 'descending',
        },
      ],
    });

    const notes: NoteItem[] = response.results
      .map((result) => {
        const page = asNotionResult(result);
        if (!page) return null;

        const pProps = page.properties as Record<string, any>;
        const createdAt = page.created_time || new Date().toISOString();
        const updatedAt = pProps.last_edited_time || createdAt;

        return {
          id: page.id,
          title: getTitleProperty(page.properties, 'Title', 'Untitled Note'),
          content: getFullTextProperty(page.properties, 'Content', ''),
          createdAt,
          updatedAt,
        };
      })
      .filter((note): note is NoteItem => note !== null);

    return NextResponse.json({ success: true, data: notes });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, message: getErrorMessage(error, 'Unable to fetch notes') }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = body?.title || 'Untitled Note';
    const contentChunks = body?.content ? body.content.match(/.{1,2000}/g)?.map((chunk: string) => ({ text: { content: chunk } })) : [{ text: { content: '' } }];

    const response = await notion.pages.create({
      parent: { database_id: NOTES_DB_ID },
      properties: {
        Title: {
          title: [
            {
              text: { content: title },
            },
          ],
        },
        Content: {
          rich_text: contentChunks,
        },
      },
    });

    return NextResponse.json({ success: true, data: { id: response.id }, message: 'Note created successfully' });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, message: getErrorMessage(error, 'Unable to create note') }, { status: 500 });
  }
}
