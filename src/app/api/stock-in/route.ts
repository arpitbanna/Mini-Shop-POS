import { NextResponse } from 'next/server';
import { notion, STOCK_IN_DB_ID } from '@/lib/notion';
import { getErrorMessage } from '@/lib/notion-helpers';
import type { AddStockPayload } from '@/types';

type UnknownRecord = Record<string, unknown>;

function getDbProperties(value: unknown): UnknownRecord {
  if (!value || typeof value !== 'object') return {};
  const record = value as UnknownRecord;
  const properties = record.properties;
  if (!properties || typeof properties !== 'object') return {};
  return properties as UnknownRecord;
}

function hasProperty(properties: UnknownRecord, key: string) {
  return Object.prototype.hasOwnProperty.call(properties, key);
}

export async function POST(request: Request) {
  try {
    const { items, createdAt, businessDate } = (await request.json()) as AddStockPayload;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one stock item is required' }, { status: 400 });
    }

    const totalQuantity = items.reduce((acc, item) => acc + Number(item.quantity || 0), 0);

    const db = await notion.databases.retrieve({ database_id: STOCK_IN_DB_ID });
    const dbProperties = getDbProperties(db);
    const supportsGroupedItems = hasProperty(dbProperties, 'Items');

    if (!supportsGroupedItems) {
      const supportsBuyPrice = hasProperty(dbProperties, 'Buy Price');
      const supportsSellPrice = hasProperty(dbProperties, 'Sell Price');
      const supportsBusinessDate = hasProperty(dbProperties, 'Business Date');

      await Promise.all(
        items.map((item) => {
          const properties: NonNullable<Parameters<typeof notion.pages.create>[0]['properties']> = {
            Name: {
              title: [
                {
                  text: { content: item.name },
                },
              ],
            },
            Quantity: {
              number: Number(item.quantity || 0),
            },
            Date: {
              date: { start: createdAt },
            },
          };

          if (supportsBuyPrice) {
            properties['Buy Price'] = { number: Number(item.buyPrice || 0) };
          }
          if (supportsSellPrice) {
            properties['Sell Price'] = { number: Number(item.sellPrice || 0) };
          }
          if (supportsBusinessDate) {
            properties['Business Date'] = {
              rich_text: [
                {
                  text: {
                    content: businessDate,
                  },
                },
              ],
            };
          }

          return notion.pages.create({
            parent: { database_id: STOCK_IN_DB_ID },
            properties,
          });
        }),
      );

      return NextResponse.json({ success: true, mode: 'legacy-schema' });
    }

    const supportsBusinessDate = hasProperty(dbProperties, 'Business Date');

    const response = await notion.pages.create({
      parent: { database_id: STOCK_IN_DB_ID },
      properties: {
        Name: {
          title: [
            {
              text: { content: `Stock Entry - ${businessDate}` },
            },
          ],
        },
        Quantity: {
          number: Number(totalQuantity),
        },
        Items: {
          rich_text: [
            {
              text: {
                content: JSON.stringify(items),
              },
            },
          ],
        },
        ...(supportsBusinessDate
          ? {
              'Business Date': {
                rich_text: [
                  {
                    text: {
                      content: businessDate,
                    },
                  },
                ],
              },
            }
          : {}),
        Date: {
          date: { start: createdAt },
        },
      },
    });

    return NextResponse.json({ success: true, id: response.id });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error, 'Unable to create stock entry') }, { status: 500 });
  }
}
