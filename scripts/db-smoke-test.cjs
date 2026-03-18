const fs = require('fs');
const path = require('path');
const { Client } = require('@notionhq/client');

function parseEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function getBusinessDate(date = new Date(), shiftEndHour = 5) {
  const d = new Date(date);
  if (d.getHours() < shiftEndHour) d.setDate(d.getDate() - 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function req(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

function getTitlePlainText(page) {
  const props = page?.properties || {};
  const title = props?.Name?.title;
  if (!Array.isArray(title) || title.length === 0) return '';
  return title[0]?.plain_text || '';
}

async function archiveMatches(notion, databaseId, matcher) {
  const response = await notion.databases.query({ database_id: databaseId, page_size: 100 });
  const toArchive = response.results.filter(matcher).map((r) => r.id);
  for (const id of toArchive) {
    await notion.pages.update({ page_id: id, archived: true });
  }
  return toArchive.length;
}

async function run() {
  const cwd = process.cwd();
  const env = {
    ...parseEnvFile(path.join(cwd, '.env.local')),
    ...process.env,
  };

  const required = [
    'NOTION_API_KEY',
    'NOTION_STOCK_IN_DB_ID',
    'NOTION_STOCK_OUT_DB_ID',
    'NOTION_PURCHASES_DB_ID',
    'NOTION_EXPENSES_DB_ID',
  ];
  const missing = required.filter((k) => !env[k]);
  if (missing.length > 0) {
    console.log(JSON.stringify({ ok: false, error: 'Missing env vars', missing }, null, 2));
    process.exit(1);
  }

  const notion = new Client({ auth: env.NOTION_API_KEY });
  const base = 'http://localhost:3000';
  const marker = `SMOKE_${Date.now()}`;
  const nowIso = new Date().toISOString();

  const summary = {
    marker,
    reads: {},
    writes: {},
    verify: {},
    cleanup: {},
    errors: [],
  };

  try {
    const readInventory = await req('GET', `${base}/api/inventory`);
    const readSales = await req('GET', `${base}/api/sales`);
    const readPurchases = await req('GET', `${base}/api/purchases`);
    const readExpenses = await req('GET', `${base}/api/expenses`);

    summary.reads.inventory = { ok: readInventory.ok, status: readInventory.status, count: Array.isArray(readInventory.data) ? readInventory.data.length : null };
    summary.reads.sales = { ok: readSales.ok, status: readSales.status, count: Array.isArray(readSales.data) ? readSales.data.length : null };
    summary.reads.purchases = { ok: readPurchases.ok, status: readPurchases.status, count: Array.isArray(readPurchases.data) ? readPurchases.data.length : null };
    summary.reads.expenses = { ok: readExpenses.ok, status: readExpenses.status, count: Array.isArray(readExpenses.data) ? readExpenses.data.length : null };

    const stockInPayload = {
      createdAt: nowIso,
      businessDate: getBusinessDate(new Date(nowIso)),
      items: [{ name: marker, buyPrice: 1, sellPrice: 2, quantity: 2 }],
    };
    const writeStockIn = await req('POST', `${base}/api/stock-in`, stockInPayload);
    summary.writes.stockIn = writeStockIn;

    const inventoryAfterStockIn = await req('GET', `${base}/api/inventory`);
    const inventoryItems = Array.isArray(inventoryAfterStockIn.data) ? inventoryAfterStockIn.data : [];
    const sellable = inventoryItems.find((x) => Number(x.available || 0) > 0 && x.name !== marker);
    if (!sellable) {
      summary.errors.push('No sellable inventory item found for sale write test');
    } else {
      const stockOutPayload = {
        createdAt: nowIso,
        businessDate: getBusinessDate(new Date(nowIso)),
        roomNo: marker,
        amountPaid: Number(sellable.sellPrice || 0),
        items: [
          {
            productId: sellable.id,
            name: sellable.name,
            quantity: 1,
            sellingPrice: Number(sellable.sellPrice || 0),
            costPrice: Number(sellable.buyPrice || 0),
          },
        ],
      };
      const writeStockOut = await req('POST', `${base}/api/stock-out`, stockOutPayload);
      summary.writes.stockOut = writeStockOut;
    }

    const writePurchase = await req('POST', `${base}/api/purchases`, {
      name: marker,
      amount: 3,
      date: nowIso,
    });
    summary.writes.purchase = writePurchase;

    const writeExpense = await req('POST', `${base}/api/expenses`, {
      name: marker,
      amount: 4,
      date: nowIso,
    });
    summary.writes.expense = writeExpense;

    const verifySales = await req('GET', `${base}/api/sales`);
    const verifyInventory = await req('GET', `${base}/api/inventory`);
    const verifyPurchases = await req('GET', `${base}/api/purchases`);
    const verifyExpenses = await req('GET', `${base}/api/expenses`);

    summary.verify.saleFoundByRoom = Array.isArray(verifySales.data)
      ? verifySales.data.some((s) => s.roomNo === marker)
      : false;
    summary.verify.stockFoundByName = Array.isArray(verifyInventory.data)
      ? verifyInventory.data.some((i) => i.name === marker)
      : false;
    summary.verify.purchaseFoundByName = Array.isArray(verifyPurchases.data)
      ? verifyPurchases.data.some((p) => p.name === marker)
      : false;
    summary.verify.expenseFoundByName = Array.isArray(verifyExpenses.data)
      ? verifyExpenses.data.some((e) => e.name === marker)
      : false;

    const stockInArchived = await archiveMatches(notion, env.NOTION_STOCK_IN_DB_ID, (page) => {
      const name = getTitlePlainText(page);
      const items = page?.properties?.Items?.rich_text?.[0]?.plain_text || '';
      return String(name).includes(marker) || String(items).includes(marker);
    });

    const stockOutArchived = await archiveMatches(notion, env.NOTION_STOCK_OUT_DB_ID, (page) => {
      const name = getTitlePlainText(page);
      const room = page?.properties?.['Room No']?.rich_text?.[0]?.plain_text || '';
      const items = page?.properties?.Items?.rich_text?.[0]?.plain_text || '';
      return String(name).includes(marker) || String(room).includes(marker) || String(items).includes(marker);
    });

    const purchasesArchived = await archiveMatches(notion, env.NOTION_PURCHASES_DB_ID, (page) => {
      const name = getTitlePlainText(page);
      return String(name).includes(marker);
    });

    const expensesArchived = await archiveMatches(notion, env.NOTION_EXPENSES_DB_ID, (page) => {
      const name = getTitlePlainText(page);
      return String(name).includes(marker);
    });

    summary.cleanup = { stockInArchived, stockOutArchived, purchasesArchived, expensesArchived };

    const readsOk = Object.values(summary.reads).every((x) => x && x.ok);
    const writesOk = Object.values(summary.writes).every((x) => x && x.ok);

    console.log(JSON.stringify({ ok: readsOk && writesOk && summary.errors.length === 0, summary }, null, 2));
  } catch (error) {
    console.log(JSON.stringify({ ok: false, error: error?.message || String(error), summary }, null, 2));
    process.exit(1);
  }
}

run();
