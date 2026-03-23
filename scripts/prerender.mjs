import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';

const ROUTES = [
  '/',
  '/sell',
  '/buy',
  '/selection',
  '/blog',
  '/contact',
  '/business',
  '/service',
  '/pickup',
  '/comparison',
  '/sell/macbook-air',
  '/sell/macbook-pro',
  '/sell/broken',
  '/sell/imac',
  '/sell/mac-mini',
  '/sell/mac-pro',
  // Blog articles
  '/blog/kak-vybrat-macbook-2024',
  '/blog/proverka-macbook-pered-pokupkoi',
  '/blog/macbook-air-m2-vs-m3',
  '/blog/kak-prodat-macbook-vygodno',
  '/blog/macbook-m4-obzor',
  '/blog/macbook-vs-windows',
  '/blog/macbook-bu-podvodnye',
  '/blog/macbook-dlia-studenta',
  '/blog/macbook-apgreid',
  // Long-tail landing pages
  '/buy/macbook-air-m2-16gb',
  '/sell/macbook-broken-screen',
  '/buy/macbook-pro-14-m3',
  '/buy/macbook-pro-16-m3-max',
  '/buy/macbook-air-m3-students',
  // Geo landing pages
  '/moskva',
  '/moskva/kievskaya',
  '/moskva/dorogomilovo',
  '/moskva/arbat',
  '/moskva/hamovniki',
];

const BASE_URL = process.env.PRERENDER_BASE_URL || 'https://bestmac.ru';
const OUT = path.join(process.cwd(), 'api', 'prerendered');
mkdirSync(OUT, { recursive: true });

let success = 0;
let failed = 0;

for (const route of ROUTES) {
  try {
    const res = await fetch(`${BASE_URL}${route}`, {
      headers: {
        // Use a standard browser UA so the live server returns the SPA shell
        // (not the prerender redirect, which would be circular)
        'User-Agent': 'Mozilla/5.0 (compatible; prerender/1.0; +https://bestmac.ru)'
      }
    });
    if (!res.ok) {
      console.error(`✗ ${route} — HTTP ${res.status}`);
      failed++;
      continue;
    }
    const html = await res.text();
    const file = route === '/' ? 'index' : route.slice(1).replace(/\//g, '-');
    writeFileSync(path.join(OUT, `${file}.html`), html);
    console.log(`✓ ${route} → ${file}.html`);
    success++;
  } catch (e) {
    console.error(`✗ ${route} — ${e.message}`);
    failed++;
  }
}

console.log(`\nPrerender complete: ${success} succeeded, ${failed} failed`);
