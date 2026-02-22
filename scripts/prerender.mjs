// Native fetch used

const PAGES = [
    '/',
    '/buy',
    '/sell',
    '/selection',
    '/business',
    '/contact',
    '/blog',
    '/sell/macbook-pro',
    '/sell/macbook-air',
    '/sell/broken',
    '/sell/imac',
    '/sell/mac-pro',
    '/sell/mac-mini'
];

const BASE_URL = 'https://bestmac.ru';
const PRERENDER_TOKEN = process.env.PRERENDER_TOKEN;

async function prerender() {
    if (!PRERENDER_TOKEN) {
        console.error('PRERENDER_TOKEN is not set. Skipping prerender.');
        return;
    }

    console.log(`Starting prerender for ${PAGES.length} pages...`);

    for (const page of PAGES) {
        const url = `${BASE_URL}${page}`;
        const prerenderUrl = `https://service.prerender.io/${url}`;

        try {
            console.log(`Prerendering: ${url}`);
            const res = await fetch(prerenderUrl, {
                headers: {
                    'X-Prerender-Token': PRERENDER_TOKEN
                }
            });
            console.log(`Status: ${res.status}`);
        } catch (err) {
            console.error(`Failed to prerender ${url}:`, err.message);
        }
    }

    console.log('Prerender complete!');
}

prerender();
