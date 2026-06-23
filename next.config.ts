import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },

  // Redirect www → non-www
  async redirects() {
    // Старые «короткие» slug моделей Pro → канонические из каталога (дедуп дублей).
    const legacySellSlugs: Record<string, string> = {
      'macbook-pro-14-2021': 'macbook-pro-14-2021-m1-pro',
      'macbook-pro-14-2023': 'macbook-pro-14-2023-m3-pro',
      'macbook-pro-14-2024': 'macbook-pro-14-2024-m4-pro',
      'macbook-pro-16-2021': 'macbook-pro-16-2021-m1-pro',
      'macbook-pro-16-2023': 'macbook-pro-16-2023-m3-pro',
      'macbook-pro-16-2024': 'macbook-pro-16-2024-m4-pro',
    };

    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.bestmac.ru' }],
        destination: 'https://bestmac.ru/:path*',
        permanent: true,
      },
      ...Object.entries(legacySellSlugs).map(([from, to]) => ({
        source: `/sell/${from}`,
        destination: `/sell/${to}`,
        permanent: true,
      })),
    ];
  },

  // Headers for caching and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      {
        source: '/llms.txt',
        headers: [
          { key: 'Content-Type', value: 'text/plain; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
      {
        // Статичные картинки/иконки — долгий immutable-кеш (раньше отдавались с max-age=0).
        source: '/:file(og-image\\.jpg|favicon\\.svg|favicon\\.png|favicon-48\\.png|placeholder\\.svg)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },

  // Turbopack is default in Next.js 15+, works with our stack
  typescript: {
    ignoreBuildErrors: false,
  },

};

export default nextConfig;
