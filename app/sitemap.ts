import type { MetadataRoute } from 'next';
import { readFile } from 'fs/promises';
import path from 'path';
import { VYKUP_LANDINGS } from '@/data/vykup-landings';
import { GEO_LANDINGS } from '@/data/geo-landings';
import { ALL_BUYOUT_MODELS } from '@/lib/model-slugs';

// Дата последней правки статей блога (см. dateModified в Article-схемах)
const BLOG_LASTMOD = new Date('2026-03-31');

// Дата обновления ценовых данных: ценовые страницы реально меняются вместе с ней
async function pricesLastmod(): Promise<Date | undefined> {
  try {
    const raw = await readFile(path.join(process.cwd(), 'public/data/avito-prices.json'), 'utf-8');
    const d = new Date(JSON.parse(raw).generated_at);
    return isNaN(d.getTime()) ? undefined : d;
  } catch {
    return undefined;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://bestmac.ru';
  const pricesDate = await pricesLastmod();

  const pages: Array<{
    url: string;
    changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    priority: number;
  }> = [
    // Main pages
    { url: '/', changeFrequency: 'weekly', priority: 1.0 },
    { url: '/buy', changeFrequency: 'daily', priority: 0.9 },
    { url: '/buy/new', changeFrequency: 'daily', priority: 0.9 },
    { url: '/sell', changeFrequency: 'daily', priority: 1.0 },
    { url: '/selection', changeFrequency: 'monthly', priority: 0.8 },
    { url: '/service', changeFrequency: 'monthly', priority: 0.8 },
    { url: '/business', changeFrequency: 'weekly', priority: 0.8 },
    { url: '/comparison', changeFrequency: 'weekly', priority: 0.8 },
    { url: '/pickup', changeFrequency: 'monthly', priority: 0.7 },
    { url: '/contact', changeFrequency: 'monthly', priority: 0.6 },
    { url: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
    { url: '/terms', changeFrequency: 'yearly', priority: 0.3 },

    // Blog
    { url: '/blog', changeFrequency: 'weekly', priority: 0.8 },
    { url: '/blog/zapret-importa-noutbukov-2026', changeFrequency: 'monthly', priority: 0.8 },
    { url: '/blog/kak-vybrat-macbook-2024', changeFrequency: 'monthly', priority: 0.8 },
    { url: '/blog/macbook-air-m2-vs-m3', changeFrequency: 'monthly', priority: 0.8 },
    { url: '/blog/proverka-macbook-pered-pokupkoi', changeFrequency: 'monthly', priority: 0.8 },
    { url: '/blog/kak-prodat-macbook-vygodno', changeFrequency: 'monthly', priority: 0.8 },
    { url: '/blog/macbook-m4-obzor', changeFrequency: 'monthly', priority: 0.8 },
    { url: '/blog/macbook-vs-windows', changeFrequency: 'monthly', priority: 0.7 },
    { url: '/blog/macbook-bu-podvodnye', changeFrequency: 'monthly', priority: 0.7 },
    { url: '/blog/macbook-dlia-studenta', changeFrequency: 'monthly', priority: 0.7 },
    { url: '/blog/macbook-apgreid', changeFrequency: 'monthly', priority: 0.7 },

    // Buy longtail
    { url: '/buy/macbook-air-m2-16gb', changeFrequency: 'weekly', priority: 0.7 },
    { url: '/buy/macbook-pro-14-m3', changeFrequency: 'weekly', priority: 0.7 },
    { url: '/buy/macbook-pro-16-m3-max', changeFrequency: 'weekly', priority: 0.7 },
    { url: '/buy/macbook-air-m3-students', changeFrequency: 'weekly', priority: 0.7 },
    { url: '/sell/macbook-broken-screen', changeFrequency: 'weekly', priority: 0.7 },

    // Sell categories
    { url: '/sell/macbook-air', changeFrequency: 'weekly', priority: 0.8 },
    { url: '/sell/macbook-pro', changeFrequency: 'weekly', priority: 0.8 },
    { url: '/sell/imac', changeFrequency: 'weekly', priority: 0.8 },
    { url: '/sell/mac-pro', changeFrequency: 'weekly', priority: 0.7 },
    { url: '/sell/mac-mini', changeFrequency: 'weekly', priority: 0.7 },
    { url: '/sell/mac-studio', changeFrequency: 'weekly', priority: 0.7 },
    { url: '/sell/broken', changeFrequency: 'weekly', priority: 0.7 },

    // Sell specific models — генерируются из канонического каталога,
    // чтобы slug в sitemap == маршрут == canonical (без дублей).
    ...ALL_BUYOUT_MODELS.map((m) => ({
      url: `/sell/${m.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),

    // Geo
    { url: '/moskva', changeFrequency: 'monthly', priority: 0.7 },
    { url: '/moskva/kievskaya', changeFrequency: 'monthly', priority: 0.7 },
    { url: '/moskva/dorogomilovo', changeFrequency: 'monthly', priority: 0.7 },
    { url: '/moskva/arbat', changeFrequency: 'monthly', priority: 0.7 },
    { url: '/moskva/hamovniki', changeFrequency: 'monthly', priority: 0.7 },

    // Vykup — интент-лендинги
    ...VYKUP_LANDINGS.map((l) => ({
      url: `/vykup/${l.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    })),

    // Geo — районы Москвы и города МО
    ...GEO_LANDINGS.map((g) => ({
      url: `/moskva/${g.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];

  // Реальный lastmod вместо фиктивного new Date() для всех URL:
  //  - ценовые страницы (/sell*, /buy*, /vykup/*) меняются с обновлением данных;
  //  - блог — дата последней правки статей;
  //  - статика — без lastmod (честнее, чем выдуманная дата).
  const lastmodFor = (url: string): Date | undefined => {
    if (url.startsWith('/blog/')) return BLOG_LASTMOD;
    if (url.startsWith('/sell') || url.startsWith('/buy') || url.startsWith('/vykup/')) {
      return pricesDate;
    }
    return undefined;
  };

  return pages.map((page) => {
    const lastModified = lastmodFor(page.url);
    return {
      url: `${baseUrl}${page.url}`,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    };
  });
}
