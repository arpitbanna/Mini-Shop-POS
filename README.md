# Mini-Shop-POS

A premium, modern Point of Sale (POS) application tailored for hostel mini-shops. Built on Next.js 14 and powered entirely by Notion as a headless CMS/database.

## Features ✨

- **Modern Glassmorphism UI**: A beautiful, glowing, highly-polished user interface optimized for speed and clarity.
- **Real-Time Dashboard**: See your Total Profit, Today's Sales, Pending Payments, and Available Items instantly. Includes a sleek CSS-native 7-Day Profit Trend chart!
- **Dynamic Inventory**: Live integration with Notion for Stock In / Stock Out counts. Sort and filter stock easily by custom availability metrics.
- **POS Quick-Sales Flow**: Record "Paid", "Half-Paid", or "Udhaar" sales frictionlessly with auto-fill pricing logic.

## Environment Variables 🔐

To run this project locally or deploy it to Vercel, you will need the following environment variables. Add them to your `.env.local` file:

```env
NOTION_API_KEY=ntn_your_secret_integration_token_here
NOTION_STOCK_IN_DB_ID=your_stock_in_notion_db_id
NOTION_STOCK_OUT_DB_ID=your_stock_out_notion_db_id
```

## Setup Instructions 🚀

1. **Clone the Repository**
   ```bash
   git clone <your-repo-url>
   cd "Mini 306"
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Notion**
   - Create a Notion Integration at [notion.so/my-integrations](https://www.notion.so/my-integrations).
   - Share your Stock In and Stock Out databases with the new integration.
   - Enter your variables in `.env.local`.

4. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view your premium POS dashboard!

## Vercel Deployment 🌍
This application is fully compatible with Vercel serverless Edge functions out of the box. 

**Important:** The build will require the environment variables to be set, otherwise it may fail during static generation or when hitting API routes.
1. Link your GitHub repository to Vercel.
2. In the Vercel project settings (Environment Variables section), securely paste the values for `NOTION_API_KEY`, `NOTION_STOCK_IN_DB_ID`, and `NOTION_STOCK_OUT_DB_ID`.
3. Click **Deploy**. Vercel will automatically run `npm run build` and launch your production bundle globally!
