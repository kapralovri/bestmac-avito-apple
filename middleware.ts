/**
 * Vercel Edge Middleware для pre-rendering SPA под поисковых ботов.
 *
 * Как это работает:
 * 1. Middleware перехватывает все входящие запросы ДО rewrites в vercel.json
 * 2. Проверяет User-Agent — если это бот (Yandex, Google, и пр.), запрос
 *    проксируется через Prerender.io, который возвращает полностью
 *    отрендеренный HTML
 * 3. Если пользователь обычный — запрос проходит к SPA как обычно
 *
 * Настройка:
 *   Добавьте PRERENDER_TOKEN в Vercel Environment Variables
 *   (Settings → Environment Variables)
 */

// ─── Список известных User-Agent ботов ───────────────────────────
const BOT_AGENTS = [
  'yandexbot',
  'yandex.com/bots',
  'googlebot',
  'google.com/bot',
  'bingbot',
  'baiduspider',
  'duckduckbot',
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'slackbot',
  'telegrambot',
  'whatsapp',
  'viber',
  'pinterestbot',
  'mail.ru_bot',
  'applebot',
  'semrushbot',
  'ahrefsbot',
  'mj12bot',
  'petalbot',
  'seznambot',
  'sogou',
  'ia_archiver',
  'rogerbot',
  'dotbot',
  'screaming frog',
  'megaindex',
];

// ─── Расширения статических файлов (пропускаем) ──────────────────
const STATIC_EXTENSIONS = [
  '.js', '.css', '.xml', '.json', '.txt',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.avif',
  '.woff', '.woff2', '.ttf', '.eot',
  '.mp4', '.webm', '.webp', '.mp3', '.ogg',
  '.map', '.gz', '.br',
];

// ─── Vercel Edge Middleware конфигурация ──────────────────────────
export const config = {
  matcher: [
    /*
     * Перехватываем все пути, КРОМЕ:
     * - /api/... — серверные API-маршруты
     * - /_vercel/... — внутренние Vercel-маршруты
     * - /assets/... — статические ресурсы сборки
     */
    '/((?!api|_vercel|assets).*)',
  ],
};

// ─── Основная функция middleware ─────────────────────────────────
export default async function middleware(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 1) Пропускаем статические файлы
  if (STATIC_EXTENSIONS.some(ext => pathname.toLowerCase().endsWith(ext))) {
    return undefined; // pass-through, Vercel отдаст файл напрямую
  }

  // 2) Получаем User-Agent
  const userAgent = (request.headers.get('user-agent') || '').toLowerCase();

  // 3) Проверяем, бот ли это
  const isBot = BOT_AGENTS.some(bot => userAgent.includes(bot));

  if (!isBot) {
    return undefined; // обычный пользователь → SPA
  }

  // 4) Проверяем наличие токена Prerender.io
  const prerenderToken = process.env.PRERENDER_TOKEN;

  if (!prerenderToken) {
    // Токен не настроен — пропускаем, SPA отдаёт пустой div
    console.warn('[Prerender Middleware] PRERENDER_TOKEN не задан. Бот получит SPA без рендера.');
    return undefined;
  }

  // 5) Проксируем запрос через Prerender.io
  const prerenderUrl = `https://service.prerender.io/${url.toString()}`;

  try {
    const response = await fetch(prerenderUrl, {
      headers: {
        'X-Prerender-Token': prerenderToken,
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      console.error(`[Prerender Middleware] Prerender.io вернул ${response.status} для ${pathname}`);
      return undefined; // fallback → SPA
    }

    const html = await response.text();

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // Кешируем pre-rendered страницы на 24 часа (CDN + браузер)
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200',
        // Маркер для отладки — видно в DevTools / curl
        'X-Prerendered': 'true',
        'X-Prerender-Source': 'prerender.io',
      },
    });
  } catch (error) {
    console.error('[Prerender Middleware] Ошибка при запросе к Prerender.io:', error);
    return undefined; // fallback → SPA
  }
}
