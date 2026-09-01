"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const WuxgaVsFullHd = () => {
  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: "WUXGA vs Full HD — какой монитор выбрать для работы",
            description: "WUXGA или Full HD: в чём разница для монитора 24 дюйма",
            image: "https://bestmac.ru/images/monitors/hp-z24i-g2.jpg",
            datePublished: "2026-09-01",
            dateModified: "2026-09-01",
            author: { "@type": "Person", name: "Роман Капралов" },
            publisher: {
              "@type": "Organization",
              name: "BestMac",
              logo: { "@type": "ImageObject", url: "https://bestmac.ru/favicon.png" },
            },
            mainEntityOfPage: { "@type": "WebPage", "@id": "https://bestmac.ru/blog/wuxga-vs-full-hd" },
          }),
        }}
      />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Breadcrumbs
          items={[
            { name: "Главная", url: "/" },
            { name: "Блог", url: "/blog" },
            { name: "WUXGA vs Full HD", url: "/blog/wuxga-vs-full-hd" },
          ]}
        />

        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="prose prose-lg max-w-none"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            WUXGA vs Full HD — какой монитор выбрать для работы
          </h1>

          <p className="text-xl text-muted-foreground mb-8">
            На вторичном рынке мониторов часто попадаются модели с непривычным разрешением 1920×1200 —
            это WUXGA, формат 16:10. Разбираемся, чем он отличается от привычного Full HD 1920×1080 и
            когда эта разница действительно имеет значение.
          </p>

          <section className="mb-10">
            <h2 className="text-3xl font-bold mb-4">Что такое WUXGA и чем он отличается от Full HD</h2>
            <p className="mb-4">
              Full HD — это разрешение 1920×1080 пикселей с соотношением сторон экрана 16:9. Это самый
              массовый формат: под него делают фильмы, видео на YouTube, большинство ноутбуков и телевизоров.
            </p>
            <p className="mb-4">
              WUXGA (Widescreen Ultra Extended Graphics Array) — это разрешение 1920×1200 пикселей с
              соотношением сторон 16:10. По ширине оно совпадает с Full HD, а вот по высоте даёт на 120
              пикселей больше. На первый взгляд немного, но на практике эта разница заметна каждый день.
            </p>
            <p className="mb-4">
              Формат 16:10 был стандартом для рабочих и профессиональных мониторов и ноутбуков ещё до того,
              как рынок массово перешёл на 16:9 из-за унификации с видео- и киноиндустрией. Поэтому сегодня
              мониторы с WUXGA чаще встречаются среди бизнес-моделей — например, HP Z24i G2 — а не среди
              массовых бытовых мониторов.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-3xl font-bold mb-4">Почему высота экрана важна для работы</h2>
            <p className="mb-4">
              Ширина экрана определяет, сколько окон вы можете разместить рядом. А вот высота экрана —
              это то, сколько вы видите без прокрутки: строк кода в редакторе, строк таблицы в Excel,
              высоты страницы документа Word, сообщений в переписке.
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>
                <strong>Программирование:</strong> на WUXGA помещается на несколько строк кода больше — меньше
                прокрутки при чтении функций и структур
              </li>
              <li>
                <strong>Таблицы и Excel:</strong> больше строк видно одновременно — удобнее работать с большими
                таблицами и отчётами
              </li>
              <li>
                <strong>Документы:</strong> страница A4 в редакторе отображается ближе к масштабу 100%, не
                приходится постоянно листать вверх-вниз
              </li>
              <li>
                <strong>Панели инструментов:</strong> в профессиональных приложениях (дизайн, монтаж, CAD)
                часто много панелей сверху и снизу — лишние 120 пикселей высоты освобождают место под рабочую
                область
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-3xl font-bold mb-4">А в чём тогда плюс Full HD?</h2>
            <p className="mb-4">
              Full HD остаётся хорошим выбором, если вы в основном смотрите видео или играете — контент
              под 16:9 отображается без чёрных полос. Также мониторы Full HD обычно немного доступнее по
              цене за счёт массовости производства.
            </p>
            <p className="mb-4">
              Но если экран нужен в первую очередь для работы с текстом, таблицами, кодом или документами —
              WUXGA даёт заметное преимущество без переплаты за более высокое разрешение вроде QHD.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-3xl font-bold mb-4">Итог: что выбрать</h2>
            <div className="bg-card p-6 rounded-xl border border-border mb-4">
              <p className="mb-2">
                <strong>Выбирайте Full HD</strong>, если основная задача — просмотр видео, простой сёрфинг
                или бюджет ограничен.
              </p>
              <p>
                <strong>Выбирайте WUXGA (16:10)</strong>, если весь день работаете с кодом, таблицами и
                документами — дополнительная высота экрана снижает утомляемость от прокрутки и делает
                работу комфортнее.
              </p>
            </div>
          </section>

          <section className="bg-gradient-to-r from-primary/10 to-secondary/10 p-8 rounded-2xl my-12">
            <h2 className="text-3xl font-bold mb-4">HP Z24i G2 — монитор WUXGA 16:10 в наличии</h2>
            <p className="text-lg mb-6">
              У нас в наличии 25 штук HP Z24i G2 — б/у монитор 24&quot; IPS с разрешением 1920×1200 (WUXGA,
              16:10). Проверенный, с гарантией проверки при получении, самовывоз в Москве. Цена от 7 000 ₽
              при покупке от 3 шт.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" asChild>
                <Link href="/monitory/hp-z24i-g2">
                  Смотреть HP Z24i G2
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/monitory">Все мониторы в наличии</Link>
              </Button>
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-4">Читайте также</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <Link href="/monitory" className="border border-border rounded-lg p-4 hover:bg-muted transition">
                <h3 className="font-semibold mb-2">Б/у мониторы HP и Lenovo — самовывоз в Москве</h3>
                <p className="text-sm text-muted-foreground">Все модели в наличии, характеристики и цены</p>
              </Link>
              <Link href="/monitory/hp-z24i-g2" className="border border-border rounded-lg p-4 hover:bg-muted transition">
                <h3 className="font-semibold mb-2">HP Z24i G2 24&quot; WUXGA</h3>
                <p className="text-sm text-muted-foreground">Карточка модели, характеристики, опт от 3 шт</p>
              </Link>
            </div>
          </section>
        </motion.article>
      </main>
    </div>
  );
};

export default WuxgaVsFullHd;
