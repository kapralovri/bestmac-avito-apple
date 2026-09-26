// GST-81: уникальность новых страниц на собранном сайте.
// Запуск: node tests/tools/check-uniqueness.mts http://localhost:3930
import { overlapShare, ownPageText } from '../../src/lib/text-overlap.ts';

const base = process.argv[2] ?? 'http://localhost:3930';
// Свои страницы можно передать третьим аргументом через запятую.
const TARGETS = process.argv[3] ? process.argv[3].split(',') : ['/trade-in', '/sell/broken', '/ceny'];
const OTHERS = [
  '/', '/sell', '/buy', '/sell/macbook-air', '/sell/macbook-pro', '/sell/mac-mini-2024-m4',
  '/vykup/srochno', '/vykup/na-domu-moskva', '/vykup/ocenka-onlajn', '/vykup/zalitogo-macbook',
  '/vykup/zablokirovannogo-macbook', '/vykup/na-zapchasti', '/ceny/macbook-air-13-2022-m2',
  '/blog/kak-prodat-macbook-vygodno', '/blog/proverka-macbook-pered-pokupkoi', '/trade-in', '/sell/broken',
];
const LIMIT = 0.4;

const pages = new Map<string, string>();
for (const p of new Set([...TARGETS, ...OTHERS])) {
  pages.set(p, ownPageText(await (await fetch(base + p)).text()));
}

let failed = false;
for (const t of TARGETS) {
  const own = pages.get(t)!;
  const worst = [...pages.entries()]
    .filter(([p]) => p !== t)
    .map(([p, other]) => [p, overlapShare(own, other)] as const)
    .sort((a, b) => b[1] - a[1])[0];
  const ok = worst[1] <= LIMIT;
  failed ||= !ok;
  console.log(`${ok ? '✅' : '❌'} ${t}: ${own.split(' ').length} слов своего текста; больше всего общего с ${worst[0]} — ${Math.round(worst[1] * 100)}%`);
}
process.exit(failed ? 1 : 0);
