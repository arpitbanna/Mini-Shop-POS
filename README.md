# Mini Shop POS

A modern, fast, and feature-rich Point of Sale (POS) application tailored for small retail or hostel mini-shops. Built on **Next.js 14**, utilizing **Notion** as a headless CMS and database, and featuring a beautiful dark-mode **glassmorphism** UI.

![Mini Shop POS](https://img.shields.io/badge/Status-Production_Ready-success?style=for-the-badge) ![Next.js](https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white) ![Notion](https://img.shields.io/badge/Notion-%23000000.svg?style=for-the-badge&logo=notion&logoColor=white)

## Features

- **Store Dashboard** 📊 - Live metrics for Total Revenue, Profit, Pending Payments, Purse Balance, and Low Stock alerts.
- **Inventory Management** 📦 - Intelligent stock tracking with dynamically calculated availability and conditional color-coded statuses (In Stock, Low Stock, out of Stock).
- **Financial Tracking** 💸 - Dedicated modules to register and balance Daily Purchases and External Expenses.
- **Udhaar / Payments System** 💳 - Keep track of partially paid and unpaid items automatically associated with specific room numbers or users.
- **Optimized Performance** ⚡ - Engineered using `useMemo` hooks safely with single-fetch API handlers over Notion's database queries.

## Setup Instructions

### 1. Requirements
- Node.js > 18.x
- A Notion Workspace with an active internal Integration Secret (API Key).

### 2. Environment Setup
Rename the included `.env.example` file to `.env.local`:
```bash
cp .env.example .env.local
```
Fill out the variables using the IDs corresponding to your respective Notion Databases.

### 3. Running Locally
```bash
npm install
npm run dev
```

The application will start gracefully at `http://localhost:3000`.

## Deployment to Vercel
This project is configured and verified to drop seamlessly into **Vercel** via default configurations. 
1. Push your repository to GitHub.
2. Link the repository directly into a new Vercel Project.
3. Add the `.env.local` keys to the **Environment Variables** deployment settings in Vercel. 
4. Deploy. No additional build settings are required!
