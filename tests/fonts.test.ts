// Шрифт сайта лежит в репозитории: сборка не должна ходить за шрифтами в Google.
// Turbopack в Next 16 иногда падает на ответе Google Fonts (vercel/next.js#99114),
// и деплой краснеет без единой правки в коде сайта.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (/ \d\b/.test(e.name)) continue; // копии iCloud «… 2»
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...sourceFiles(p));
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

test('код сайта не подключает next/font/google', () => {
  const offenders = ['app', 'src'].flatMap(sourceFiles)
    .filter((f) => readFileSync(f, 'utf-8').includes('next/font/google'));
  assert.deepEqual(offenders, []);
});

test('Inter лежит в репозитории одним woff2-файлом', () => {
  const buf = readFileSync('src/fonts/inter-latin-cyrillic.woff2');
  assert.equal(buf.subarray(0, 4).toString('latin1'), 'wOF2');
  assert.ok(buf.length > 20_000, `подозрительно маленький файл: ${buf.length} байт`);
});
