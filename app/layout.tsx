import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CookieBanner from '@/components/CookieBanner';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { organizationSchema } from '@/lib/schema';

export const metadata: Metadata = {
  metadataBase: new URL('https://bestmac.ru'),
  title: {
    default: 'BestMac — Честный выкуп и продажа MacBook в Москве с гарантией',
    template: '%s | BestMac',
  },
  description: 'Купить или продать MacBook б/у в Москве с гарантией. Скупка MacBook, iMac, iPhone. Дорогомилово, Киевская, ЦАО.',
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
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body>
        {/* Yandex.Metrika */}
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`(function(m,e,t,r,i,k,a){
            try{m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a);
            }catch(e){console.warn('Yandex.Metrika loading error:',e);}
          })(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');
          try{ym(50006968,'init',{webvisor:true,clickmap:true,accurateTrackBounce:true,trackLinks:true});}
          catch(e){console.warn('Yandex.Metrika init error:',e);}`}
        </Script>
        <noscript>
          <div><img src="https://mc.yandex.ru/watch/50006968" style={{ position: 'absolute', left: '-9999px' }} alt="" /></div>
        </noscript>

        <Header />
        {children}
        <Footer />
        <CookieBanner />
        <Toaster />
        <Sonner />
      </body>
    </html>
  );
}
