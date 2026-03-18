# Mini Shop POS

Mini Shop POS is a production-ready Point of Sale web app for small shops/hostel stores, built with Next.js App Router, TypeScript, Tailwind CSS 4, Notion API, and React Query.

## Features

- Dashboard with Revenue, Profit, Expenses, Purchases, Udhaar, and low-stock insights
- Sales entry with payment split tracking (Paid / Partial / Unpaid)
- Inventory management with stock in/out and edit/delete support
- Purchase and expense tracking
- Payments settlement workflow
- Guest mode support for safe demo usage

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS 4
- React Query (@tanstack/react-query)
- Notion SDK (@notionhq/client)
- Zustand
- Sonner (toasts)
- Lucide React (icons)

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

## Environment Variables

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Required variables:

- `NOTION_API_KEY`
- `NOTION_STOCK_IN_DB_ID`
- `NOTION_STOCK_OUT_DB_ID`
- `NOTION_PURCHASES_DB_ID`
- `NOTION_EXPENSES_DB_ID`
- `ADMIN_PASSWORD`

Notes:

- `.env*` files are ignored by git.
- `.env.example` is committed as a template.
- Sensitive env values are used only on the server (`src/lib/notion.ts` is `server-only`).

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Quality Checks

```bash
npm run lint
npm run build
```

Both commands should pass before deployment.

## Deployment (Vercel)

1. Push the repository to GitHub.
2. Import the repo in Vercel.
3. Set all environment variables in Vercel Project Settings.
4. Deploy.

Recommended:

- Keep `Production` and `Preview` env values synchronized.
- Redeploy after any env variable update.

## NPM Scripts

- `npm run dev` - local development
- `npm run lint` - lint checks
- `npm run build` - production build
- `npm run start` - run production server locally
