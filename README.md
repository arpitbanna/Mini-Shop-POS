# Mini Shop POS

Mini Shop POS is a lightweight, responsive, and completely scalable Next.js application built to seamlessly execute point-of-sale logic bounded directly onto a dynamic Notion database backend infrastructure seamlessly. 

The UI was precision-engineered with a mobile-first philosophy capturing high-end "FinTech" glass-morphism designs powered strictly by **pure CSS Modules** leveraging zero external styling frameworks.

## 🚀 Key Features
- **Centralized Ledger Tracking**: Effortlessly monitor overlapping entity tables capturing `Sales`, `Stock Ins`, `Purchases`, and `Expenses` across a strictly chronologically-sorted History boundary.
- **Paginated Sales & Analysis**: Scalable loading arrays preventing system degradation globally incorporating Real-Time tracking bounds for daily, weekly, and monthly revenues.
- **Notion Sync Capabilities**: Seamless real-time data ingestion mapped entirely using strict internal wrapper constraints locking data via `<ApiSuccessResponse>`.
- **Global Skeletons Phase**: Native, lightning-fast gradient `.skeleton` renderings mirroring exact table layouts mapped globally replacing rudimentary loading spinners.

## 🛠 Tech Stack
- **Framework**: `Next.js 16.1 (App Router)`
- **Hooks & State**: `Zustand`, `@tanstack/react-query`
- **Frontend Architecture**: TypeScript, React 19
- **Components**: `Recharts`, `Lucide React`, `Sonner` (Toasts)
- **Styling Architecture**: Pure Standardized CSS Modules (`theme.css` / `global.css`)
- **Backend Mapping**: `@notionhq/client` mapped via native Next.js API Routes.

## 📦 Local Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd <repo-name>
   ```

2. **Scaffold Local Secrets:**
   Duplicate the provided `.env.example` template configuring it locally explicitly:
   ```bash
   cp .env.example .env.local
   ```
   > Ensure all specific Notion API and Notion Database IDs are injected accurately here!

3. **Install Dependencies:**
   ```bash
   npm install
   ```

4. **Boot up properly:**
   ```bash
   npm run dev
   ```
   *Navigate to `http://localhost:3000` to execute the platform.*
