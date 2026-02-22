import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';

const BRAND_URL = 'https://www.avito.ru/brands/i46958617/';
const OUTPUT_FILE = path.join(process.cwd(), 'public', 'data', 'avito-offers.json');

async function parseAvitoBrand(url) {
    try {
        console.log(`🔎 Parsing Brand Profile: ${url}`);
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
            },
            timeout: 10000
        });
        const $ = cheerio.load(data);
        const listings = [];

        // Updated selectors based on brand profile layout
        $('div[class*="iva-item-root"], div[data-marker^="item_list_with_filters/item"]').each((_, element) => {
            const title = $(element).find('a[data-marker="item-title"]').first().text().trim();
            const rawPriceText = $(element).find('[data-marker="item-price"]').text() || '';
            const price = parseInt(rawPriceText.replace(/\D/g, ''), 10) || 0;
            const href = $(element).find('a[data-marker="item-title"]').attr('href');
            const adUrl = href ? (href.startsWith('http') ? href : 'https://www.avito.ru' + href) : '';

            const img = $(element).find('img[class*="photo-slider-image"], img');
            const imageUrl = img.attr('data-src') || img.attr('src') || img.attr('srcset')?.split(' ')[0];

            if (title && adUrl && imageUrl) {
                listings.push({
                    id: adUrl.split('_').pop()?.split('?')[0] || Math.random().toString(36).substr(2, 9),
                    title,
                    price,
                    url: adUrl,
                    imageUrl,
                    status: 'active'
                });
            }
        });

        return listings;
    } catch (error) {
        console.error(`❌ Error parsing brand profile:`, error.message);
        return [];
    }
}

async function build() {
    console.log('🚀 Starting Store-Specific Avito Sync...');

    const offers = await parseAvitoBrand(BRAND_URL);

    if (offers.length === 0) {
        console.log('⚠️ No offers found. Keeping existing data if any.');
        return;
    }

    // Limit to most recent 12
    const finalOffers = offers.slice(0, 12);

    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalOffers, null, 2));
    console.log(`✅ Success! Collected ${finalOffers.length} your ads from Avito profile.`);
    console.log(`📂 Data saved to ${OUTPUT_FILE}`);
}

build();
