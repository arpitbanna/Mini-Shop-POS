import { Client } from '@notionhq/client';

export const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export const STOCK_IN_DB_ID = process.env.NOTION_STOCK_IN_DB_ID as string;
export const STOCK_OUT_DB_ID = process.env.NOTION_STOCK_OUT_DB_ID as string;
