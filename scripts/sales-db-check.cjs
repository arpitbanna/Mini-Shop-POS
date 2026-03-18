const fs = require('fs');
const path = require('path');
const { Client } = require('@notionhq/client');

function parseEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[k] = v;
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
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

function summarizeProps(properties) {
  return Object.entries(properties || {}).map(([name, v]) => ({ name, type: v?.type || 'unknown' }));
}

(async () => {
  const env = { ...parseEnvFile(path.join(process.cwd(), '.env.local')), ...process.env };
  const need = ['NOTION_API_KEY', 'NOTION_STOCK_OUT_DB_ID'];
  const miss = need.filter((k) => !env[k]);
  if (miss.length) {
    console.log(JSON.stringify({ ok: false, error: 'missing env', miss }, null, 2));
    process.exit(1);
  }

  const notion = new Client({ auth: env.NOTION_API_KEY });
  const marker = `SALECHK_${Date.now()}`;
  const nowIso = new Date().toISOString();
  const base = 'http://localhost:3000';

  const out = { marker, schema: {}, checks: {}, cleanup: {}, errors: [] };

  try {
    const db = await notion.databases.retrieve({ database_id: env.NOTION_STOCK_OUT_DB_ID });
    out.schema = {
      id: db.id,
      title: Array.isArray(db.title) && db.title[0] ? db.title[0].plain_text : '',
      properties: summarizeProps(db.properties),
    };

    const inv = await req('GET', `${base}/api/inventory`);
    if (!inv.ok || !Array.isArray(inv.data)) {
      out.errors.push('inventory api unavailable');
      console.log(JSON.stringify({ ok: false, out }, null, 2));
      process.exit(1);
    }
    const sellable = inv.data.find((x) => Number(x.available || 0) > 0);
    if (!sellable) {
      out.errors.push('no sellable item found');
      console.log(JSON.stringify({ ok: false, out }, null, 2));
      process.exit(1);
    }

    const payload = {
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

    const postSale = await req('POST', `${base}/api/stock-out`, payload);
    out.checks.postSale = postSale;

    const sales = await req('GET', `${base}/api/sales`);
    out.checks.readSales = {
      ok: sales.ok,
      status: sales.status,
      foundByRoom: Array.isArray(sales.data) ? sales.data.some((s) => s.roomNo === marker) : false,
      sample: Array.isArray(sales.data) ? sales.data.find((s) => s.roomNo === marker) || null : null,
    };

    // cleanup stock out entries with marker in room/name/items
    const query = await notion.databases.query({ database_id: env.NOTION_STOCK_OUT_DB_ID, page_size: 100 });
    const toArchive = query.results
      .filter((r) => {
        const p = r.properties || {};
        const room = p['Room No']?.rich_text?.[0]?.plain_text || '';
        const name = p.Name?.title?.[0]?.plain_text || '';
        const itemsTxt = p.Items?.rich_text?.[0]?.plain_text || '';
        return String(room).includes(marker) || String(name).includes(marker) || String(itemsTxt).includes(marker);
      })
      .map((r) => r.id);

    for (const id of toArchive) {
      await notion.pages.update({ page_id: id, archived: true });
    }

    out.cleanup.archivedStockOut = toArchive.length;

    const ok = postSale.ok && out.checks.readSales.ok && out.checks.readSales.foundByRoom;
    console.log(JSON.stringify({ ok, out }, null, 2));
    if (!ok) process.exit(1);
  } catch (e) {
    console.log(JSON.stringify({ ok: false, error: e?.message || String(e), out }, null, 2));
    process.exit(1);
  }
})();
