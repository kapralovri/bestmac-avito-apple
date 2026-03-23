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
  '/sell/macbook-air',
  '/sell/macbook-pro',
  '/sell/broken',
  '/sell/imac',
  '/sell/mac-mini',
  '/sell/mac-pro'
];

const OUT = path.join(process.cwd(), 'api', 'prerendered');
mkdirSync(OUT, { recursive: true });

for (const route of ROUTES) {
  try {
    const res = await fetch(`https://bestmac.ru${route}`, {
      headers: { 'User-Agent': 'prerender-bot' }
    });
    const html = await res.text();
    const file = route === '/' ? 'index' : route.slice(1).replace(/\//g, '-');
    writeFileSync(path.join(OUT, `${file}.html`), html);
    console.log(`✓ ${route}`);
  } catch (e) {
    console.error(`Failed to prerender ${route}:`, e.message);
  }
}
