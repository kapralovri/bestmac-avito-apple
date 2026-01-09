import axios from 'axios';
import * as cheerio from 'cheerio';

interface AvitoListing {
  title: string;
  price: number;
  url: string;
}

export async function parseAvito(searchUrl: string): Promise<AvitoListing[]> {
  try {
    const { data } = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const $ = cheerio.load(data);
    const listings: AvitoListing[] = [];

    $('[data-marker="item"]').each((_, element) => {
      const title = $(element).find('[data-marker="item-title"]').text().trim();
      const priceText = $(element).find('[data-marker="item-price"]').text().replace(/\s/g, '').replace('₽', '');
      const price = parseInt(priceText, 10);
      const url = 'https://www.avito.ru' + $(element).find('a').attr('href');

      if (title && !isNaN(price)) {
        listings.push({ title, price, url });
      }
    });

    return listings;
  } catch (error) {
    console.error('Error parsing Avito:', error);
    return [];
  }
}
