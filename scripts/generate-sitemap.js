import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const today = new Date().toISOString().split('T')[0];

const pages = [
  // Основные страницы
  { url: '/',            changefreq: 'weekly',  priority: '1.0' },
  { url: '/buy',         changefreq: 'daily',   priority: '0.9' },
  { url: '/buy/new',     changefreq: 'daily',   priority: '0.9' },
  { url: '/sell',        changefreq: 'daily',   priority: '1.0' },
  { url: '/selection',   changefreq: 'monthly', priority: '0.8' },
  { url: '/service',     changefreq: 'monthly', priority: '0.8' },
  { url: '/business',    changefreq: 'weekly',  priority: '0.8' },
  { url: '/comparison',  changefreq: 'weekly',  priority: '0.8' },
  { url: '/pickup',      changefreq: 'monthly', priority: '0.7' },
  { url: '/contact',     changefreq: 'monthly', priority: '0.6' },
  { url: '/privacy',     changefreq: 'yearly',  priority: '0.3' },
  { url: '/terms',       changefreq: 'yearly',  priority: '0.3' },

  // Блог
  { url: '/blog',                                changefreq: 'weekly',  priority: '0.8' },
  { url: '/blog/kak-vybrat-macbook-2024',        changefreq: 'monthly', priority: '0.8' },
  { url: '/blog/macbook-air-m2-vs-m3',           changefreq: 'monthly', priority: '0.8' },
  { url: '/blog/proverka-macbook-pered-pokupkoi', changefreq: 'monthly', priority: '0.8' },
  { url: '/blog/kak-prodat-macbook-vygodno',     changefreq: 'monthly', priority: '0.8' },
  { url: '/blog/macbook-m4-obzor',               changefreq: 'monthly', priority: '0.8' },
  { url: '/blog/macbook-vs-windows',             changefreq: 'monthly', priority: '0.7' },
  { url: '/blog/macbook-bu-podvodnye',           changefreq: 'monthly', priority: '0.7' },
  { url: '/blog/macbook-dlia-studenta',          changefreq: 'monthly', priority: '0.7' },
  { url: '/blog/macbook-apgreid',                changefreq: 'monthly', priority: '0.7' },

  // Long-tail
  { url: '/buy/macbook-air-m2-16gb',      changefreq: 'weekly', priority: '0.7' },
  { url: '/buy/macbook-pro-14-m3',        changefreq: 'weekly', priority: '0.7' },
  { url: '/buy/macbook-pro-16-m3-max',    changefreq: 'weekly', priority: '0.7' },
  { url: '/buy/macbook-air-m3-students',  changefreq: 'weekly', priority: '0.7' },
  { url: '/sell/macbook-broken-screen',   changefreq: 'weekly', priority: '0.7' },

  // Sell — категории
  { url: '/sell/macbook-air',  changefreq: 'weekly', priority: '0.8' },
  { url: '/sell/macbook-pro',  changefreq: 'weekly', priority: '0.8' },
  { url: '/sell/imac',         changefreq: 'weekly', priority: '0.8' },
  { url: '/sell/mac-pro',      changefreq: 'weekly', priority: '0.7' },
  { url: '/sell/mac-mini',     changefreq: 'weekly', priority: '0.7' },
  { url: '/sell/broken',       changefreq: 'weekly', priority: '0.7' },

  // Sell — конкретные модели
  { url: '/sell/macbook-air-13-2020-m1',  changefreq: 'weekly', priority: '0.8' },
  { url: '/sell/macbook-air-13-2022-m2',  changefreq: 'weekly', priority: '0.8' },
  { url: '/sell/macbook-air-13-2024-m3',  changefreq: 'weekly', priority: '0.8' },
  { url: '/sell/macbook-air-13-2025-m4',  changefreq: 'weekly', priority: '0.8' },
  { url: '/sell/macbook-air-15-2023-m2',  changefreq: 'weekly', priority: '0.8' },
  { url: '/sell/macbook-air-15-2024-m3',  changefreq: 'weekly', priority: '0.8' },
  { url: '/sell/macbook-air-15-2025-m4',  changefreq: 'weekly', priority: '0.8' },
  { url: '/sell/macbook-pro-13-2020-m1',  changefreq: 'weekly', priority: '0.8' },
  { url: '/sell/macbook-pro-13-2022-m2',  changefreq: 'weekly', priority: '0.8' },
  { url: '/sell/macbook-pro-14-2021',     changefreq: 'weekly', priority: '0.8' },
  { url: '/sell/macbook-pro-14-2023',     changefreq: 'weekly', priority: '0.8' },
  { url: '/sell/macbook-pro-14-2024',     changefreq: 'weekly', priority: '0.8' },
  { url: '/sell/macbook-pro-16-2021',     changefreq: 'weekly', priority: '0.8' },
  { url: '/sell/macbook-pro-16-2023',     changefreq: 'weekly', priority: '0.8' },
  { url: '/sell/macbook-pro-16-2024',     changefreq: 'weekly', priority: '0.8' },

  // Geo
  { url: '/moskva',              changefreq: 'monthly', priority: '0.7' },
  { url: '/moskva/kievskaya',    changefreq: 'monthly', priority: '0.7' },
  { url: '/moskva/dorogomilovo', changefreq: 'monthly', priority: '0.7' },
  { url: '/moskva/arbat',        changefreq: 'monthly', priority: '0.7' },
  { url: '/moskva/hamovniki',    changefreq: 'monthly', priority: '0.7' },
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>https://bestmac.ru${p.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

const outputPath = join(__dirname, '../public/sitemap.xml');
writeFileSync(outputPath, sitemap);

console.log(`Sitemap generated: ${pages.length} URLs`);
