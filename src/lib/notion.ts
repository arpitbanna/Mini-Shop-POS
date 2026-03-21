import 'server-only';
import { Client } from '@notionhq/client';

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const notion = new Client({
  auth: getRequiredEnv('NOTION_API_KEY'),
});

export const STOCK_IN_DB_ID = getRequiredEnv('NOTION_STOCK_IN_DB_ID');
export const STOCK_OUT_DB_ID = getRequiredEnv('NOTION_STOCK_OUT_DB_ID');
export const PURCHASES_DB_ID = getRequiredEnv('NOTION_PURCHASES_DB_ID');
export const EXPENSES_DB_ID = getRequiredEnv('NOTION_EXPENSES_DB_ID');
export const NOTES_DB_ID = getRequiredEnv('NOTION_NOTES_DB_ID');
