import { NextResponse } from 'next/server';
import { notion } from '@/lib/notion';
import { getErrorMessage, createRichTextChunks } from '@/lib/notion-helpers';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await request.json();
    const { title, content } = body;

    const properties: Record<string, any> = {};

    if (title !== undefined) {
      properties['Title'] = {
        title: [
          {
            text: { content: title },
          },
        ],
      };
    }

    if (content !== undefined) {
      properties['Content'] = {
        rich_text: createRichTextChunks(content),
      };
    }

    if (Object.keys(properties).length === 0) {
      return NextResponse.json({ success: true, message: 'No changes made' });
    }

    await notion.pages.update({
      page_id: id,
      properties,
    });

    return NextResponse.json({ success: true, message: 'Note updated successfully' });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.toLowerCase().includes('archived')) {
      return NextResponse.json({ success: false, message: 'Note already deleted/archived' }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: getErrorMessage(error, 'Unable to update note') }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    await notion.pages.update({
      page_id: id,
      archived: true,
    });

    return NextResponse.json({ success: true, message: 'Note deleted successfully' });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, message: getErrorMessage(error, 'Unable to delete note') }, { status: 500 });
  }
}
