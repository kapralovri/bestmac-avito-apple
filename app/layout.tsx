import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Script from 'next/script';
import './globals.css';

// Inter хранится в репозитории (латиница + кириллица, переменный 400–700), а не
// скачивается с Google Fonts при сборке: Turbopack в Next 16 иногда падает на
// ответе Google (vercel/next.js#99114) — так упала сборка PR #47.
const inter = localFont({
  src: '../src/fonts/inter-latin-cyrillic.woff2',
  weight: '400 700',
  style: 'normal',
  display: 'swap',
});
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CookieBanner from '@/components/CookieBanner';
import ContactClickTracker from '@/components/ContactClickTracker';
import TelegramCta from '@/components/TelegramCta';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { organizationSchema } from '@/lib/schema';

export const metadata: Metadata = {
  metadataBase: new URL('https://bestmac.ru'),
  title: {
    default: 'BestMac — Честный выкуп и продажа MacBook в Москве с гарантией',
    template: '%s | BestMac',
  },
  description: 'Продать или купить б/у макбук в Москве с гарантией. Скупка MacBook, iMac, Mac mini и Mac Studio. Дорогомилово, м. Киевская.',
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'BestMac',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: { index: true, follow: true },
  authors: [{ name: 'BestMac' }],
  other: {
    'geo.region': 'RU-MOW',
    'geo.placename': 'Москва',
    language: 'ru',
  },
  verification: {
    google: 'hlJ8fNZ-OXOGBQ5bFLI-UTheo-N2qAeCoCWDyocOS7I',
    other: {
      'yandex-verification': '04218115450e5747',
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://mc.yandex.ru" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://mc.yandex.ru" />
        <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body className={inter.className}>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-Z7HMP0832W"
          strategy="afterInteractive"
        />
        {/* GST-76: счётчики шлют данные только с боевого домена. Раньше их
            исправно заряжали превью-сборки Vercel (*.vercel.app): каждый деплой
            открывали боты, и в Метрике весной набегало ~500 «прямых визитов»
            в месяц — с отказом 100% и нулём секунд на сайте. Проверка идёт по
            адресу в браузере, а не по окружению сборки: у боевых деплоев тоже
            есть свой *.vercel.app, и туда боты заходят так же. */}
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          if (location.hostname === 'bestmac.ru') gtag('config', 'G-Z7HMP0832W');`}
        </Script>

        {/* Yandex.Metrika */}
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`(function(m,e,t,r,i,k,a){
            try{m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            // Заглушку ym оставляем везде: формы зовут ym(..., 'reachGoal', ...),
            // и без неё отправка заявки на превью падала бы с ошибкой. Сам счётчик
            // грузим только на боевом домене — без него вызовы копятся в очереди
            // и никуда не уходят.
            if (location.hostname !== 'bestmac.ru') return;
            for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a);
            }catch(e){console.warn('Yandex.Metrika loading error:',e);}
          })(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');
          try{ym(50006968,'init',{webvisor:false,clickmap:true,accurateTrackBounce:true,trackLinks:true});}
          catch(e){console.warn('Yandex.Metrika init error:',e);}`}
        </Script>
        <noscript>
          <div><img src="https://mc.yandex.ru/watch/50006968" style={{ position: 'absolute', left: '-9999px' }} alt="" /></div>
        </noscript>

        <Header />
        {children}
        <Footer />
        <TelegramCta />
        <CookieBanner />
        <ContactClickTracker />
        <Toaster />
        <Sonner />
      </body>
    </html>
  );
}
