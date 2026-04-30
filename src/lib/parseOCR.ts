// ──────────────────────────────────────────────────────────────
// parseOCR.ts — Block-based OCR text parser for messy receipts
// Handles Blinkit / Zomato / generic bill screenshots
// ──────────────────────────────────────────────────────────────

export type ParsedItem = {
  id: string;
  name: string;
  buyPrice: string;
  sellPrice: string;
  quantity: string;
};

// Result includes a confidence flag so the UI can warn the user
export type ParseResult = {
  items: ParsedItem[];
  confidence: 'high' | 'low';
};

// ── Step 1: Clean Line ──────────────────────────────────────
// Strips non-ASCII junk, ₹ symbols, and normalises whitespace
// so downstream regex operates on predictable text.

export function cleanLine(line: string): string {
  let out = line;

  // Replace ₹ with a marker we can detect later
  out = out.replace(/₹/g, 'RS_MARKER ');

  // Strip remaining non-ASCII characters (OCR artifacts)
  out = out.replace(/[^\x20-\x7E]/g, ' ');

  // Replace junk symbols with space
  out = out.replace(/[|+\-–—_={}[\]\\<>@#^&*~`]/g, ' ');

  // Collapse whitespace
  out = out.replace(/\s{2,}/g, ' ').trim();

  return out;
}

// ── Step 2: Safe Price Extraction ───────────────────────────
// Finds all candidate numbers, returns the LAST valid one
// (because the price usually appears after the product name).

export function extractPrice(text: string): number | null {
  const cleaned = cleanLine(text);

  // 1) Check for explicit rupee-marked price: "RS_MARKER 120" or "RS_MARKER120"
  const rupeeMatch = cleaned.match(/RS_MARKER\s?(\d+(\.\d+)?)/);
  if (rupeeMatch) {
    return parseFloat(rupeeMatch[1]);
  }

  // 2) Collect all standalone numbers (2+ digits, optionally with decimals)
  const allNumbers = [...cleaned.matchAll(/(?<!\S)(\d{2,}(\.\d+)?)(?!\S|\d)/g)];

  if (allNumbers.length === 0) {
    // Try a more lenient match — any number ≥ 2 digits
    const lenient = [...cleaned.matchAll(/(\d{2,}(\.\d+)?)/g)];
    if (lenient.length === 0) return null;
    return parseFloat(lenient[lenient.length - 1][1]);
  }

  // Use the last number (typically the price in "ProductName 120")
  return parseFloat(allNumbers[allNumbers.length - 1][1]);
}

// ── Step 3: Fix OCR-Mangled Prices ──────────────────────────
// Tesseract commonly merges the ₹ symbol into the number:
//   ₹21  → "221"  (₹ read as leading 2)
//   ₹335 → "2335" (₹ read as leading 2)
//
// Detection strategy:
//   - 3 digits, starts with 2, no decimal → drop leading 2  (221 → 21)
//   - 4 digits, starts with 2, no decimal → drop leading 2 and insert decimal  (2335 → 33.5)
//   - 4+ digits, doesn't start with 2 → divide by 100  (3350 → 33.50)
//   - Any integer > 500 → divide by 100 as fallback

export function normalisePrice(raw: number): number {
  // Already has decimal → probably correct
  if (!Number.isInteger(raw)) {
    return Math.round(raw * 100) / 100;
  }

  const str = String(raw);

  // 3-digit number starting with 2 (e.g. 221 → 21, 240 → 40)
  // but not reasonable prices like 200, 250 etc.
  if (str.length === 3 && str[0] === '2') {
    const stripped = parseInt(str.substring(1), 10);
    // If the stripped value is a reasonable small price (5–99), use it
    if (stripped >= 5 && stripped <= 99) {
      return stripped;
    }
  }

  // 4-digit number starting with 2 (e.g. 2335 → 33.5, 2120 → 120)
  if (str.length === 4 && str[0] === '2') {
    const rest = str.substring(1); // "335"
    const withDecimal = parseFloat(rest.slice(0, -1) + '.' + rest.slice(-1)); // 33.5
    const asWhole = parseInt(rest, 10); // 335

    // If treating the rest as a whole number gives a reasonable price, prefer that
    if (asWhole >= 10 && asWhole <= 500) {
      return asWhole;
    }
    // Otherwise use decimal insertion
    if (withDecimal >= 5 && withDecimal <= 500) {
      return Math.round(withDecimal * 100) / 100;
    }
  }

  // Generic fallback: any integer > 500 → divide by 100
  if (raw > 500) {
    return Math.round((raw / 100) * 100) / 100;
  }

  return raw;
}

// ── Step 4: Quantity Extraction ──────────────────────────────

export function extractQty(text: string): number | null {
  const lower = text.toLowerCase();

  // "Qty: 4" / "Qty 4" / "qty:4"
  const qtyMatch = lower.match(/qty[:\s]*(\d+)/);
  if (qtyMatch) return parseInt(qtyMatch[1], 10);

  // "2 units" / "3units"
  const unitsMatch = lower.match(/(\d+)\s*units?/);
  if (unitsMatch) return parseInt(unitsMatch[1], 10);

  // "x 3" / "x3"
  const xMatch = lower.match(/x\s?(\d+)/);
  if (xMatch) return parseInt(xMatch[1], 10);

  return null;
}

// ── Step 5: Normalize to Per-Item Price ─────────────────────
// If qty > 1, the OCR price is usually the TOTAL for all units.
// We divide to get per-unit price.

export function normalizePerUnit(price: number, qty: number): number {
  if (qty > 1) {
    return Math.round((price / qty) * 100) / 100;
  }
  return Math.round(price * 100) / 100;
}

// ── Name Cleaning ───────────────────────────────────────────

const IGNORE_KEYWORDS = [
  'total', 'bill', 'summary', 'discount', 'fee', 'subtotal',
  'delivery', 'gst', 'tax', 'coupon', 'order id', 'invoice',
  'thank you', 'payment', 'paid', 'upi', 'online', 'wallet',
  'address', 'contact', 'phone', 'helpline', 'refund',
];

/** True if this line is just noise */
function isJunkLine(line: string): boolean {
  if (line.length < 3) return true;
  const cleaned = cleanLine(line);
  // Standalone number (with or without RS_MARKER)
  if (/^(RS_MARKER\s?)?\d+(\.\d+)?$/.test(cleaned)) return true;
  const lower = cleaned.toLowerCase();
  if (IGNORE_KEYWORDS.some(kw => lower.includes(kw))) return true;
  // Order IDs / phone numbers (10+ digit sequences)
  if (/\d{10,}/.test(cleaned)) return true;
  return false;
}

/** Strip noise from a line to reveal the product name */
function cleanNameLine(line: string): string {
  let cleaned = cleanLine(line);

  // Remove RS_MARKER and associated price
  cleaned = cleaned.replace(/RS_MARKER\s?\d+(\.\d+)?/g, '');

  // Remove "Qty: N" / "N units" / "x N" patterns
  cleaned = cleaned.replace(/qty[:\s]*\d+/gi, '');
  cleaned = cleaned.replace(/\d+\s*units?/gi, '');
  cleaned = cleaned.replace(/x\s?\d+/gi, '');

  // Remove packaging noise: "1 pack (60 g or 64 g)"
  cleaned = cleaned.replace(/\d+\s*(pack|pc|pcs)\s*\([^)]*\)/gi, '');
  cleaned = cleaned.replace(/\([^)]*\)/g, '');

  // Remove "Size: 750 ML" descriptors
  cleaned = cleaned.replace(/size[:\s]*\d+\s*(ml|g|kg|l)\b/gi, '');

  // Remove trailing standalone numbers (leftover prices)
  cleaned = cleaned.replace(/\s\d{2,}(\.\d+)?\s*$/, '');

  // Remove RS_MARKER remnants
  cleaned = cleaned.replace(/RS_MARKER/g, '');

  // Collapse whitespace
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

  return cleaned;
}

/** Check if a cleaned line looks like a valid product name */
function isValidName(name: string): boolean {
  if (name.length < 4) return false;
  if (!/[a-zA-Z]/.test(name)) return false;
  if (/^\d+\s*(ml|g|kg|l|pc|pcs|pack)$/i.test(name)) return false;
  return true;
}

// ── Main Parser ─────────────────────────────────────────────

export function parseOCR(text: string): ParseResult {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  console.log('─── OCR PARSER START ───');
  console.log('Total lines:', lines.length);

  const items: ParsedItem[] = [];
  const usedLines = new Set<number>();

  // Slide through lines in blocks of up to 4
  for (let i = 0; i < lines.length; i++) {
    if (usedLines.has(i)) continue;

    // Build a block of 1–4 consecutive unused lines
    const blockIndices: number[] = [];
    for (let j = i; j < Math.min(i + 4, lines.length) && blockIndices.length < 4; j++) {
      if (!usedLines.has(j)) {
        blockIndices.push(j);
      }
    }

    const blockLines = blockIndices.map(idx => lines[idx]);
    const blockText = blockLines.join(' ');

    console.log(`\n[Block @ line ${i}]`, blockLines);

    // Skip entirely junk blocks
    if (blockLines.every(l => isJunkLine(l))) {
      console.log('  → Skipped (all junk)');
      continue;
    }

    // ── Extract product data from this block ──
    let rawPrice: number | null = null;
    let qty: number | null = null;
    const nameFragments: string[] = [];

    // Scan each line in the block
    for (const line of blockLines) {
      if (isJunkLine(line)) continue;

      // Price — take first found
      if (rawPrice === null) {
        const p = extractPrice(line);
        if (p !== null) rawPrice = p;
      }

      // Quantity — take first found
      if (qty === null) {
        const q = extractQty(line);
        if (q !== null) qty = q;
      }
    }

    // Fallback: try the merged block text
    if (rawPrice === null) rawPrice = extractPrice(blockText);
    if (qty === null) qty = extractQty(blockText);

    // Build the name from cleaned lines
    for (const line of blockLines) {
      if (isJunkLine(line)) continue;
      const cleaned = cleanNameLine(line);
      if (cleaned.length > 0) {
        nameFragments.push(cleaned);
      }
    }

    // Merge name fragments
    let name = '';
    if (nameFragments.length > 0) {
      name = nameFragments[0];
      for (let k = 1; k < nameFragments.length; k++) {
        const frag = nameFragments[k];
        if (
          frag.length >= 4 &&
          !name.toLowerCase().includes(frag.toLowerCase()) &&
          isValidName(frag)
        ) {
          name += ' ' + frag;
        }
      }
    }
    name = name.trim();

    console.log('  → Raw extracted:', { name, rawPrice, qty });

    // ── Validate ──
    if (!isValidName(name)) {
      console.log('  → Rejected (invalid name)');
      continue;
    }
    if (rawPrice === null) {
      console.log('  → Rejected (no price)');
      continue;
    }

    // Step 3: Fix OCR digit mangling
    const fixedPrice = normalisePrice(rawPrice);
    console.log(`  → Price normalised: ${rawPrice} → ${fixedPrice}`);

    // Step 6: Reject unreasonable prices (> ₹5000 is OCR noise)
    if (fixedPrice > 5000) {
      console.log('  → Rejected (price too high after normalisation):', fixedPrice);
      continue;
    }

    // Step 5: Compute per-unit price
    const finalQty = qty ?? 1;
    const unitPrice = normalizePerUnit(fixedPrice, finalQty);

    console.log(`  → Per-unit price: ${fixedPrice} / ${finalQty} = ${unitPrice}`);

    const priceStr = String(unitPrice);

    items.push({
      id: Math.random().toString(36).substring(2, 9),
      name,
      buyPrice: priceStr,
      sellPrice: priceStr,
      quantity: String(finalQty),
    });

    // Mark lines as consumed
    const linesConsumed = Math.min(blockIndices.length, 3);
    for (let c = 0; c < linesConsumed; c++) {
      usedLines.add(blockIndices[c]);
    }

    console.log('  ✓ Accepted:', { name, unitPrice, qty: finalQty });
  }

  console.log('\n─── OCR PARSER DONE ───');
  console.log('Items found:', items.length);

  // ── Post-process ──

  // Remove duplicates (same name + same price)
  const unique = items.filter((item, idx, self) =>
    idx === self.findIndex(t =>
      t.name.toLowerCase() === item.name.toLowerCase() &&
      t.buyPrice === item.buyPrice
    )
  );

  // Cap at 15 items
  const final = unique.slice(0, 15);

  // Determine confidence
  const confidence: 'high' | 'low' = final.length > 0 && final.length <= 10 ? 'high' : 'low';

  return { items: final, confidence };
}
