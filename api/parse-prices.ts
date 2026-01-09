import { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchSheetData } from '../src/services/parser/google-sheets';
import { parseAvito } from '../src/services/parser/avito';
import { AvitoPriceStat, AvitoPricesData } from '../src/types/avito-prices';
import fs from 'fs';
import path from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const sheetUrl = 'https://docs.google.com/spreadsheets/d/1hq9JqsWLyGVFVtzfWhZbwylSEkWLpSptWBirsh4zsy0/edit?gid=0#gid=0';
    const configs = await fetchSheetData(sheetUrl);
    
    const stats: AvitoPriceStat[] = [];
    let totalListings = 0;

    for (const config of configs) {
      const listings = await parseAvito(config.searchUrl);
      if (listings.length === 0) continue;

      const prices = listings.map(l => l.price).sort((a, b) => a - b);
      const min_price = prices[0];
      const max_price = prices[prices.length - 1];
      const median_price = prices[Math.floor(prices.length / 2)];
      
      // Basic buyout logic: 80% of median
      const buyout_price = Math.round(median_price * 0.8);

      // Extract RAM/SSD from config string (e.g., "M1/8/256")
      const parts = config.config.split('/');
      const ram = parseInt(parts[1]) || 8;
      const ssd = parseInt(parts[2]) || 256;
      const processor = parts[0];

      stats.push({
        model_name: config.model,
        processor,
        ram,
        ssd,
        min_price,
        max_price,
        median_price,
        buyout_price,
        samples_count: listings.length,
        updated_at: new Date().toISOString()
      });

      totalListings += listings.length;
      // Throttling to avoid Avito ban
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const output: AvitoPricesData = {
      generated_at: new Date().toISOString(),
      total_listings: totalListings,
      models: [...new Set(stats.map(s => s.model_name))],
      stats
    };

    // Save to public/data/avito-prices.json for frontend to consume
    const dataPath = path.join(process.cwd(), 'public', 'data', 'avito-prices.json');
    const dataDir = path.dirname(dataPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(dataPath, JSON.stringify(output, null, 2));

    return res.status(200).json({ success: true, total_listings: totalListings });
  } catch (error) {
    console.error('Parsing error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
