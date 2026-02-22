/**
 * Vercel Edge Function для pre-rendering SPA под поисковых ботов.
 */

export const config = {
    runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const originalPath = url.searchParams.get('__path') || url.searchParams.get('url') || '/';
    const targetUrl = `https://bestmac.ru${originalPath}`;
    const prerenderToken = process.env.PRERENDER_TOKEN;

    // ОБЯЗАТЕЛЬНЫЙ заголовок для отладки, чтобы мы видели, что попали сюда
    const debugHeaders = {
        'X-BestMac-Edge': 'v2',
        'X-Prerender-Token-Found': prerenderToken ? 'yes' : 'no'
    };

    if (!prerenderToken) {
        return new Response('<!-- prerender: no token -->', {
            headers: { ...debugHeaders, 'Content-Type': 'text/html' }
        });
    }

    const prerenderUrl = `https://service.prerender.io/${targetUrl}`;

    try {
        const response = await fetch(prerenderUrl, {
            headers: { 'X-Prerender-Token': prerenderToken },
            redirect: 'follow',
        });

        if (!response.ok) {
            return new Response(`<!-- prerender: error ${response.status} -->`, {
                headers: { ...debugHeaders, 'Content-Type': 'text/html', 'X-Prerender-Status': String(response.status) }
            });
        }

        const html = await response.text();
        return new Response(html, {
            headers: {
                ...debugHeaders,
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=86400',
                'X-Prerendered': 'true'
            },
        });
    } catch (error) {
        return new Response('<!-- prerender: fetch error -->', {
            headers: { ...debugHeaders, 'Content-Type': 'text/html' }
        });
    }
}
