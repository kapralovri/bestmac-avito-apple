import type { Metadata } from 'next'
export const dynamic = 'force-dynamic'
import Script from 'next/script'
import './globals.css'
import Providers from '@/components/Providers'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import CookieBanner from '@/components/CookieBanner'

export const metadata: Metadata = {
  metadataBase: new URL('https://bestmac.ru'),
  title: {
    default: 'Купить MacBook б/у в Москве с гарантией — BestMac',
    template: '%s',
  },
  description: 'Покупка и продажа MacBook б/у в Москве. Гарантия 1 месяц, проверка по 35 параметрам, выезд на дом.',
  robots: { index: true, follow: true },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <meta name="yandex-verification" content="04218115450e5747" />
        <meta name="geo.region" content="RU-MOW" />
        <meta name="geo.placename" content="Москва" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" />
      </head>
      <body>
        {/* GTM noscript */}
        <noscript dangerouslySetInnerHTML={{ __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-5H7ZD6C" height="0" width="0" style="display:none;visibility:hidden"></iframe>` }} />
        {/* Yandex.Metrika noscript */}
        <noscript dangerouslySetInnerHTML={{ __html: `<div><img src="https://mc.yandex.ru/watch/50006968" style="position:absolute;left:-9999px;" alt="" /></div>` }} />
        <Providers>
          <Header />
          {children}
          <Footer />
          <Toaster />
          <Sonner />
          <CookieBanner />
        </Providers>

        {/* Google Tag Manager — afterInteractive чтобы не блокировать рендер */}
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-5H7ZD6C');`}
        </Script>

        {/* Yandex.Metrika — afterInteractive чтобы не блокировать рендер */}
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`(function(m,e,t,r,i,k,a){try{m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a);}catch(e){console.warn('Yandex.Metrika loading error:',e);}})(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');try{ym(50006968,'init',{webvisor:true,clickmap:true,accurateTrackBounce:true,trackLinks:true});}catch(e){console.warn('Yandex.Metrika init error:',e);}`}
        </Script>
      </body>
    </html>
  )
}
