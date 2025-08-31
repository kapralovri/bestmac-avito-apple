import fs from 'fs';
import path from 'path';

const INPUT_PRIMARY = path.join(process.cwd(), 'data', 'Модельный_ряд_на_выкуп.xlsx');
const INPUT_FALLBACK = path.join(process.cwd(), 'Модельный_ряд_на_выкуп.xlsx');
const OUTPUT = path.join(process.cwd(), 'public', 'data', 'buyout.json');

function normalize(v) {
  return (v ?? '').toString().trim();
}

function readInputPath() {
  if (fs.existsSync(INPUT_PRIMARY)) return INPUT_PRIMARY;
  if (fs.existsSync(INPUT_FALLBACK)) return INPUT_FALLBACK;
  throw new Error(`Excel file not found. Put it into data/ or project root as 'Модельный_ряд_на_выкуп.xlsx'`);
}

;(async () => {
  const xlsx = await import('xlsx').catch(() => null);
  if (!xlsx) {
    console.warn('[build-buyout-data] package \'xlsx\' not installed, skipping.');
    return;
  }
  const inputPath = readInputPath();
  const wb = xlsx.default.readFile(inputPath, { cellDates: false });
  const sheet = wb.Sheets['Ноутбуки'];
  if (!sheet) throw new Error("Лист 'Ноутбуки' не найден в Excel");

  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
  const out = rows
    .map((r) => ({
      manufacturer: normalize(r['Производитель']),
      model: normalize(r['Модель']),
      cpu: normalize(r['Процессор']),
      ram: normalize(r['Оперативная память']),
      storage: normalize(r['Постоянная память']),
      gpu: normalize(r['Видеочип']),
      basePrice: Number(String(r['Базовая цена']).replace(/\s+/g, '').replace(',', '.')) || 0,
    }))
    .filter((x) => x.model && x.basePrice > 0);

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 2), 'utf-8');
  console.log(`OK: ${out.length} записей → ${OUTPUT}`);
})();
