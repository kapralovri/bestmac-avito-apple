import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://bestmac.ru';

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
    { url: '/sell/broken', changeFrequency: 'weekly', priority: 0.7 },

    // Sell specific models
    { url: '/sell/macbook-air-13-2020-m1', changeFrequency: 'weekly', priority: 0.8 },
    { url: '/sell/macbook-air-13-2022-m2', changeFrequency: 'weekly', priority: 0.8 },
    { url: '/sell/macbook-air-13-2024-m3', changeFrequency: 'weekly', priority: 0.8 },
    { url: '/sell/macbook-air-13-2025-m4', changeFrequency: 'weekly', priority: 0.8 },
    { url: '/sell/macbook-air-15-2023-m2', changeFrequency: 'weekly', priority: 0.8 },
    { url: '/sell/macbook-air-15-2024-m3', changeFrequency: 'weekly', priority: 0.8 },
    { url: '/sell/macbook-air-15-2025-m4', changeFrequency: 'weekly', priority: 0.8 },
    { url: '/sell/macbook-pro-13-2020-m1', changeFrequency: 'weekly', priority: 0.8 },
    { url: '/sell/macbook-pro-13-2022-m2', changeFrequency: 'weekly', priority: 0.8 },
    { url: '/sell/macbook-pro-14-2021', changeFrequency: 'weekly', priority: 0.8 },
    { url: '/sell/macbook-pro-14-2023', changeFrequency: 'weekly', priority: 0.8 },
    { url: '/sell/macbook-pro-14-2024', changeFrequency: 'weekly', priority: 0.8 },
    { url: '/sell/macbook-pro-16-2021', changeFrequency: 'weekly', priority: 0.8 },
    { url: '/sell/macbook-pro-16-2023', changeFrequency: 'weekly', priority: 0.8 },
    { url: '/sell/macbook-pro-16-2024', changeFrequency: 'weekly', priority: 0.8 },

    // Geo
    { url: '/moskva', changeFrequency: 'monthly', priority: 0.7 },
    { url: '/moskva/kievskaya', changeFrequency: 'monthly', priority: 0.7 },
    { url: '/moskva/dorogomilovo', changeFrequency: 'monthly', priority: 0.7 },
    { url: '/moskva/arbat', changeFrequency: 'monthly', priority: 0.7 },
    { url: '/moskva/hamovniki', changeFrequency: 'monthly', priority: 0.7 },
  ];

  return pages.map((page) => ({
    url: `${baseUrl}${page.url}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
