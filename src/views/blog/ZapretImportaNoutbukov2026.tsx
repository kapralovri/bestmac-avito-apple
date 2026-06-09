"use client";

import Breadcrumbs from "@/components/Breadcrumbs";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const ZapretImportaNoutbukov2026 = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Запрет параллельного импорта ноутбуков в 2026: почему выгоднее MacBook",
          "description": "С 27 мая 2026 Минпромторг исключил из параллельного импорта ноутбуки Asus, HP, Acer, Intel, Samsung и др. Apple в список не попал. Разбираем, что это значит и почему б/у MacBook — рациональный выбор.",
          "image": "https://bestmac.ru/og-image.jpg",
          "datePublished": "2026-06-09",
          "dateModified": "2026-06-09",
          "author": { "@type": "Person", "name": "Роман Капралов" },
          "publisher": { "@type": "Organization", "name": "BestMac", "logo": { "@type": "ImageObject", "url": "https://bestmac.ru/favicon.png" } },
          "mainEntityOfPage": { "@type": "WebPage", "@id": "https://bestmac.ru/blog/zapret-importa-noutbukov-2026" }
        }) }}
      />

      <main className="flex-grow container mx-auto px-4 py-12">
        <Breadcrumbs items={[
          { name: "Главная", url: "/" },
          { name: "Блог", url: "/blog" },
          { name: "Запрет импорта ноутбуков 2026", url: "/blog/zapret-importa-noutbukov-2026" },
        ]} />

        <article className="max-w-4xl mx-auto prose prose-lg">
          <h1 className="text-4xl font-bold mb-6">
            Запрет параллельного импорта ноутбуков в 2026: почему выгоднее взять MacBook
          </h1>

          <p className="text-lg text-muted-foreground mb-8">
            С 27 мая 2026 года рынок ноутбуков в России заметно изменился. Разбираемся, какие бренды
            попали под ограничения, почему Apple это не коснулось и что это значит для тех, кто
            выбирает ноутбук или думает продать старый.
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Что произошло</h2>
            <p className="mb-4">
              Приказом Минпромторга №4769 из перечня параллельного импорта (товаров, которые можно
              ввозить без согласия правообладателя) исключили компьютеры, ноутбуки, серверы,
              процессоры и накопители ряда иностранных брендов. В список попали{" "}
              <strong>Acer, Asus, HP, Hewlett Packard, Fujitsu, Intel, Samsung, Toshiba, Kingston,
              SanDisk, Hynix, IBM, Cisco</strong> и другие.
            </p>
            <p className="mb-4">
              В Минпромторге решение объяснили развитием отечественного производства и появлением
              достаточного числа аналогов. На практике для покупателя это означает одно: ввозить
              ноутбуки этих брендов «в обход» официальных поставок стало нельзя, а значит вероятны
              сокращение предложения и рост цен на Windows-ноутбуки в течение года.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">А что с Apple?</h2>
            <p className="mb-4">
              <strong>Apple в этот список не попал.</strong> MacBook, iMac, Mac mini и другая
              техника Apple по-прежнему доступны для ввоза, а iPhone и вовсе остаются в перечне
              параллельного импорта. То есть ограничения ударили по Windows-сегменту (Asus, HP,
              Acer, на процессорах Intel), но не затронули экосистему Mac.
            </p>
            <div className="bg-muted p-5 rounded-lg mb-4">
              <p className="m-0">
                <strong>Вывод простыми словами:</strong> Windows-ноутбуки рискуют подорожать и
                стать дефицитнее, а Mac — нет. На фоне ограничений MacBook становится более
                предсказуемым и «защищённым» выбором.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Почему MacBook сейчас — рациональный выбор</h2>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Стабильное предложение.</strong> Поставки техники Apple ограничениями не затронуты.</li>
              <li><strong>Долгая поддержка.</strong> Apple обновляет macOS 7+ лет — MacBook 2018–2020 годов всё ещё актуальны.</li>
              <li><strong>Высокая остаточная стоимость.</strong> Mac медленно дешевеет — его легко продать через год-два без больших потерь.</li>
              <li><strong>Автономность и бесшумность.</strong> Чипы Apple Silicon (M1–M4) работают до 18–22 часов без вентиляторов.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Б/у MacBook — оптимально по цене</h2>
            <p className="mb-4">
              Если новый MacBook кажется дорогим, проверенный б/у — золотая середина. Экономия до 40–50%
              от цены нового, при этом устройство полностью рабочее и с гарантией. Особенно выгодны
              сейчас MacBook Air M1/M2 и MacBook Pro 14 на M1 Pro — отличный запас мощности на годы.
            </p>
            <p className="mb-4">
              Все наши устройства проходят проверку по 35 параметрам (батарея, дисплей, клавиатура,
              порты, отвязка iCloud), идут с гарантией 1 месяц, договором и чеком. Это надёжнее, чем
              покупка «с рук» на Авито, где легко нарваться на скрытые дефекты, MDM-профиль или
              заблокированный iCloud.
            </p>
            <div className="flex gap-4 flex-wrap not-prose my-6">
              <Button asChild size="lg">
                <Link href="/buy">Посмотреть MacBook в наличии</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/sell">Продать или обменять свой</Link>
              </Button>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Думаете продать старый ноутбук?</h2>
            <p className="mb-4">
              Если планируете переход на Mac — старый MacBook можно сдать нам в зачёт или продать
              отдельно. Оценим по фото за пару минут и предложим цену до 80% от рынка. Выкупаем Mac
              в любом состоянии — даже{" "}
              <Link href="/vykup/zalitogo-macbook">залитые</Link>,{" "}
              <Link href="/vykup/zablokirovannogo-macbook">заблокированные</Link> и{" "}
              <Link href="/vykup/na-zapchasti">нерабочие на запчасти</Link>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Читайте также</h2>
            <div className="grid md:grid-cols-2 gap-4 not-prose">
              <Link href="/blog/macbook-vs-windows" className="border border-border rounded-lg p-4 hover:bg-muted transition">
                <h3 className="font-semibold mb-2">MacBook или Windows: что выбрать</h3>
                <p className="text-sm text-muted-foreground">Объективное сравнение платформ</p>
              </Link>
              <Link href="/blog/kak-vybrat-macbook-2024" className="border border-border rounded-lg p-4 hover:bg-muted transition">
                <h3 className="font-semibold mb-2">Как выбрать MacBook</h3>
                <p className="text-sm text-muted-foreground">Подбор модели и конфигурации под задачи</p>
              </Link>
            </div>
          </section>

          <p className="text-sm text-muted-foreground">
            Материал носит информационный характер и основан на сообщениях СМИ о приказе Минпромторга
            №4769 (вступил в силу 27.05.2026). Перечень параллельного импорта может меняться —
            уточняйте актуальный статус брендов перед покупкой.
          </p>
        </article>
      </main>
    </div>
  );
};

export default ZapretImportaNoutbukov2026;
