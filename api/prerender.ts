/**
 * Vercel Edge Function для pre-rendering SPA под поисковых ботов.
 *
 * Вызывается через vercel.json rewrites при обнаружении бота в User-Agent.
 * Проксирует запрос через Prerender.io и возвращает полностью отрендеренный HTML.
 */

export const config = {
    runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Получаем оригинальный путь из query-параметра (передаётся через rewrite)
    const originalPath = url.searchParams.get('__path') || url.pathname;
    const targetUrl = `https://bestmac.ru${originalPath}`;

    const prerenderToken = process.env.PRERENDER_TOKEN;

    if (!prerenderToken) {
        console.warn('[Prerender] PRERENDER_TOKEN не задан');
        // Возвращаем обычный index.html через fetch
        return fetch(new URL('/index.html', url.origin));
    }

    const prerenderUrl = `https://service.prerender.io/${targetUrl}`;

    try {
        const response = await fetch(prerenderUrl, {
            headers: {
                'X-Prerender-Token': prerenderToken,
            },
            redirect: 'follow',
        });

        if (!response.ok) {
            console.error(`[Prerender] Prerender.io вернул ${response.status} для ${originalPath}`);
            return fetch(new URL('/index.html', url.origin));
        }

        const html = await response.text();

        return new Response(html, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200',
                'X-Prerendered': 'true',
                'X-Prerender-Source': 'prerender.io',
            },
        });
    } catch (error) {
        console.error('[Prerender] Ошибка:', error);
        return fetch(new URL('/index.html', url.origin));
    }
}
