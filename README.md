# Mini Shop POS

Mini Shop POS is a production-ready Point of Sale web app for hostel/hotel mini shops, built with Next.js App Router, TypeScript, Tailwind CSS 4, React Query, and Notion as backend storage.

## Project Overview

This app is designed for late-night operations where calendar dates are not enough.

- Business day logic: 5:00 AM to next day 5:00 AM
- Grouped sales: one transaction can contain multiple items
- Grouped stock entries: one stock-in operation can contain multiple items
- Payment tracking: paid, partially paid, unpaid

## Core Features

- Business-day aware reporting and filtering
- Dashboard revenue/profit/pending/stock insights
- Record sale with shared Room No and Date & Time across all items
- Payments page with transaction-level profit and summary rows
- Inventory management with edit/delete and bulk "Delete All Out of Stock"
- Purchase and expense tracking
- Guest mode for safe demo/testing

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS 4
- React Query (@tanstack/react-query)
- Notion SDK (@notionhq/client)
- Zustand
- Sonner
- Lucide React

## Project Structure

```text
src/
  app/
  components/
  hooks/
  lib/
  config/
  types/
```

## Environment Setup

Create local environment file:

```bash
cp .env.example .env.local
```

Required variables:

- NOTION_API_KEY
- NOTION_STOCK_IN_DB_ID
- NOTION_STOCK_OUT_DB_ID
- NOTION_PURCHASES_DB_ID
- NOTION_EXPENSES_DB_ID
- ADMIN_PASSWORD

Security notes:

- Do not commit .env.local
- .env.example contains only placeholders
- Sensitive values are accessed server-side only

## Notion Database Notes

For grouped sale/stock support, STOCK_IN and STOCK_OUT databases should include:

- Name (title)
- Date (date)
- Items (rich text JSON)
- Business Date (rich text)

Legacy single-item records are still supported by fallback parsing.

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Quality and Build

```bash
npm run lint
npm run build
```

Current status:

- Lint passes
- Production build passes
- No chunk warnings reported during build

## Deployment (GitHub + Vercel)

1. Push repository to GitHub
2. Import project into Vercel
3. Add all required environment variables in Vercel project settings
4. Deploy

Recommended:

- Keep Preview and Production environment variables in sync
- Redeploy after any env update

## Manual QA Checklist

- Create sale at 2:00 AM and verify businessDate maps to previous day
- Create grouped sale with multiple items and verify totals/profit
- Add grouped stock entry and verify inventory updates
- Use Delete All Out of Stock and verify immediate inventory refresh
- Verify Payments page totals/profit/status are accurate

## NPM Scripts

- npm run dev
- npm run lint
- npm run build
- npm run start
