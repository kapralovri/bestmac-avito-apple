import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const dataPath = path.join(process.cwd(), 'public', 'data', 'buyout.json');
  const rows: Array<{ model: string; basePrice: number }> = fs.existsSync(dataPath)
    ? JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
    : [];

  const limit = 100;
  const list = rows.slice(0, limit);

  // Schema.org ItemList with Product + Offer
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: list.map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: r.model,
        brand: 'Apple',
        offers: {
          '@type': 'Offer',
          price: String(r.basePrice),
          priceCurrency: 'RUB',
          availability: 'https://schema.org/InStock',
        },
      },
    })),
  };

  const html = `<!DOCTYPE html>
  <html lang="ru">
  <head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Выкуп MacBook в Москве — примерные цены и калькулятор | BestMac</title>
    <meta name="description" content="Срочный выкуп MacBook. Онлайн-калькулятор оценки и примерные цены по моделям. Гарантия быстрой сделки." />
    <link rel="canonical" href="https://bestmac.ru/sell" />
    <meta property="og:title" content="Выкуп MacBook в Москве — примерные цены и калькулятор | BestMac" />
    <meta property="og:description" content="Срочный выкуп MacBook. Онлайн-калькулятор оценки и примерные цены по моделям." />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="ru_RU" />
    <meta property="og:image" content="https://bestmac.ru/favicon.png" />
    <script type="application/ld+json">${JSON.stringify(itemList)}</script>
    <style>
      body{font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";margin:0;color:#111}
      .wrap{max-width:1120px;margin:0 auto;padding:16px}
      h1,h2{font-weight:700}
      table{width:100%;border-collapse:collapse}
      th,td{padding:10px;border-top:1px solid #e5e7eb;text-align:left}
      thead{background:#f3f4f6}
      .muted{color:#6b7280}
      .card{border:1px solid #e5e7eb;border-radius:10px;padding:16px}
      header,footer{padding:16px 0}
      a{color:#2563eb;text-decoration:none}
    </style>
  </head>
  <body>
    <header class="wrap">
      <a href="/" aria-label="BestMac">BestMac</a>
    </header>
    <main class="wrap">
      <h1>Продать технику Apple</h1>
      <section aria-labelledby="prices" class="card" style="margin-top:16px">
        <h2 id="prices">Примерные цены выкупа MacBook в Москве</h2>
        <p class="muted">Цены ориентировочные, зависят от состояния и комплекта. Базовые цены из каталога.</p>
        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr><th>Модель</th><th>Базовая цена, ₽</th></tr>
            </thead>
            <tbody>
              ${list.map(r => `<tr><td><strong>${escapeHtml(r.model)}</strong></td><td>${formatPrice(r.basePrice)}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </section>
      <p class="muted" style="margin-top:12px">Точная цена рассчитывается после диагностики. На сайте доступен калькулятор оценки.</p>
      <p style="margin-top:16px"><a href="/">На главную</a> · <a href="/buy">Смотреть предложения</a></p>
    </main>
    <footer class="wrap muted">© BestMac</footer>
  </body>
  </html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]);
}
function formatPrice(n: number) {
  return new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
}

