import fs from 'fs';
import path from 'path';

async function main() {
  const xlsx = await import('xlsx').catch(() => null);
  if (!xlsx) {
    console.error("'xlsx' package is not installed");
    process.exit(1);
  }

  const cwd = process.cwd();
  const inputPrimary = path.join(cwd, 'data', 'Модельный_ряд_на_выкуп.xlsx');
  const inputFallback = path.join(cwd, 'Модельный_ряд_на_выкуп.xlsx');
  const inputPath = fs.existsSync(inputPrimary) ? inputPrimary : fs.existsSync(inputFallback) ? inputFallback : null;
  if (!inputPath) {
    console.error("Excel file not found. Put it into data/ or project root as 'Модельный_ряд_на_выкуп.xlsx'");
    process.exit(1);
  }

  const wbIn = xlsx.default.readFile(inputPath, { cellDates: false });
  const sheet = wbIn.Sheets['Ноутбуки'];
  if (!sheet) {
    console.error("Sheet 'Ноутбуки' not found in Excel");
    process.exit(1);
  }

  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
  const normalize = (v) => (v ?? '').toString().trim();

  const mapped = rows.map((r) => ({
    manufacturer: normalize(r['Производитель']),
    model: normalize(r['Модель']),
    ram: normalize(r['Оперативная память']),
    storage: normalize(r['Постоянная память']),
    basePrice: Number(String(r['Базовая цена']).replace(/\s+/g, '').replace(',', '.')) || 0,
  }));

  const macbooks = mapped
    .filter((r) => ((r.model && /macbook/i.test(r.model)) || /apple/i.test(r.manufacturer)))
    .filter((r) => r.basePrice > 0);

  // dedupe by model|ram|storage
  const seen = new Set();
  const deduped = [];
  for (const r of macbooks) {
    const key = `${r.model}|${r.ram}|${r.storage}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(r);
    }
  }

  deduped.sort((a, b) => {
    const byModel = a.model.localeCompare(b.model, 'ru');
    if (byModel !== 0) return byModel;
    return a.basePrice - b.basePrice;
  });

  const headers = ['Модель', 'Оперативная память', 'SSD', 'Базовая цена, ₽'];
  const data = [headers, ...deduped.map((r) => [r.model, r.ram, r.storage, r.basePrice])];

  const ws = xlsx.utils.aoa_to_sheet(data);

  // auto width
  const colWidths = headers.map((h, i) => {
    let maxLen = (h || '').toString().length;
    for (let r = 1; r < data.length; r++) {
      const val = data[r][i];
      const len = (val == null ? '' : String(val)).length;
      if (len > maxLen) maxLen = len;
    }
    // heuristic: Cyrillic typically wider; add padding
    return { wch: Math.min(60, Math.max(8, Math.ceil(maxLen * 1.2))) };
  });
  ws['!cols'] = colWidths;

  const wbOut = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wbOut, ws, 'MacBook выкуп');

  const outPath = path.join(cwd, 'buyout_macbook_prices.xlsx');
  xlsx.default.writeFile(wbOut, outPath, { bookType: 'xlsx' });
  console.log(`XLSX written: ${outPath} (${deduped.length} rows)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


