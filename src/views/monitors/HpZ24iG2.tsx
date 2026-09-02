"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import Breadcrumbs from "@/components/Breadcrumbs";
import LeadForm from "@/components/LeadForm";
import FAQ from "@/components/FAQ";
import MonitorSpecsTable from "@/components/monitors/MonitorSpecsTable";
import MonitorConditionBlock from "@/components/monitors/MonitorConditionBlock";
import MonitorCTASection from "@/components/monitors/MonitorCTASection";
import RelatedMonitors from "@/components/monitors/RelatedMonitors";
import { generateProductSchema } from "@/lib/structured-data";
import { getMonitorBySlug, formatPriceRub } from "@/lib/monitors-data";
import { Layers, PackageCheck } from "lucide-react";

const monitor = getMonitorBySlug("hp-z24i-g2")!;

const breadcrumbItems = [
  { name: "Главная", url: "/" },
  { name: "Мониторы", url: "/monitory" },
  { name: monitor.name, url: `/monitory/${monitor.slug}` },
];

const faqItems = [
  {
    question: "Чем WUXGA 1920×1200 лучше обычного Full HD 1920×1080?",
    answer:
      "Формат 16:10 у HP Z24i G2 даёт на 120 пикселей больше по высоте, чем у Full HD 16:9. На практике это заметно больше рабочего пространства в коде, таблицах Excel и документах Word — меньше прокрутки, видно больше строк одновременно.",
  },
  {
    question: "Можно ли купить несколько штук HP Z24i G2 со скидкой?",
    answer:
      "Да, партия — 25 штук. При заказе от 3 шт цена снижается до 7 000 ₽ за монитор вместо 8 000 ₽. Для офиса или коворкинга это ощутимая экономия — пишите в Telegram, обсудим объём.",
  },
  {
    question: "Какая эргономика подставки у HP Z24i G2?",
    answer:
      "Подтверждена регулировка наклона (−5°…+22°), разворота (±45°) и поддержка поворота экрана (pivot). Датащит HP также указывает наличие функции регулировки высоты, но точное значение в мм производитель не публикует.",
  },
  {
    question: "Какие порты у HP Z24i G2?",
    answer:
      "DisplayPort, HDMI, VGA — подключится практически к любому компьютеру, включая старую технику через VGA. Также есть 2 порта USB 3.0 Type-A, то есть монитор работает как небольшой USB-хаб.",
  },
  {
    question: "Как забрать монитор и нужно ли платить заранее?",
    answer:
      "Самовывоз в Москве, м. Киевская, ул. Дениса Давыдова 3. Доставки нет. Предоплата не требуется — вы приезжаете, включаете монитор, проверяете картинку и порты, и только после этого платите.",
  },
];

const HpZ24iG2 = () => {
  const productSchema = generateProductSchema({
    name: monitor.fullName,
    price: monitor.price,
    condition: "б/у",
    description: monitor.metaDescription,
    image: `https://bestmac.ru${monitor.image}`,
    brand: monitor.brand,
    url: `https://bestmac.ru/monitory/${monitor.slug}`,
    priceValidUntil: "2026-12-31",
  });

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={breadcrumbItems} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-5xl font-bold mb-4">{monitor.h1}</h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl">
            Главная партия нашей продажи мониторов — 25 штук HP Z24i G2 в наличии. Формат 16:10 WUXGA
            даёт больше рабочей высоты экрана, чем обычный Full HD, — заметное преимущество для работы с
            кодом, таблицами и документами.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="relative w-full h-72 md:h-full min-h-[280px] rounded-2xl overflow-hidden bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300">
            <Image
              src={monitor.image}
              alt={monitor.imageAlt}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 500px"
              className="object-contain p-6"
            />
          </div>

          <div className="flex flex-col justify-center">
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-3xl font-bold text-primary">{formatPriceRub(monitor.price)}</span>
                <span className="text-sm text-muted-foreground">за 1 шт</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                В наличии: <strong className="text-foreground">{monitor.stock} шт</strong>
              </p>

              {monitor.bulk && (
                <div className="flex items-center gap-3 bg-primary/10 rounded-lg p-4 mb-4">
                  <Layers className="w-6 h-6 text-primary flex-shrink-0" />
                  <p className="text-sm">
                    <strong>Опт от {monitor.bulk.fromQty} шт — {formatPriceRub(monitor.bulk.price)}</strong> за
                    монитор. Подходит для оснащения офиса или класса.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3 text-sm text-muted-foreground mb-6">
                <PackageCheck className="w-5 h-5 text-primary flex-shrink-0" />
                <span>Самовывоз, м. Киевская. Доставки нет. Проверка на месте, без предоплаты</span>
              </div>

              <div className="flex flex-col gap-3">
                <a
                  href="tel:+79032990029"
                  className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-11 px-6 font-medium hover:bg-primary/90 transition-colors"
                >
                  Позвонить +7 (903) 299-00-29
                </a>
                <a
                  href="https://t.me/romanmanro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md border border-border h-11 px-6 font-medium hover:bg-muted transition-colors"
                >
                  Написать в Telegram
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* УТП 16:10 */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-4">Главное отличие: формат 16:10, а не 16:9</h2>
          <p className="text-lg mb-4">
            HP Z24i G2 — редкий для вторичного рынка формат <strong>WUXGA 1920×1200</strong>, а не привычный
            Full HD 1920×1080. Разница — 120 пикселей по высоте: физически больше строк кода, больше видимых
            строк в таблице, больше высоты страницы документа помещается на экран без прокрутки. Формат
            16:10 — это классика для мониторов, ориентированных на продуктивную работу, а не просмотр видео.
          </p>
          <p className="text-muted-foreground mb-4">
            Это не «ещё один Full HD» — если вы весь день работаете с текстом, таблицами или кодом, разница
            в высоте рабочей области ощущается уже в первый день использования. Подробнее о разнице между
            WUXGA и Full HD читайте в нашей статье{" "}
            <Link href="/blog/wuxga-vs-full-hd" className="text-primary hover:underline">
              «WUXGA vs Full HD — какой монитор выбрать для работы»
            </Link>
            .
          </p>
        </section>

        {/* Характеристики */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Проверенные характеристики</h2>
          <MonitorSpecsTable specs={monitor.specs} />
          <p className="text-xs text-muted-foreground">
            Источник: официальный datasheet HP (support.hp.com), обновлён 02/2021.
          </p>
        </section>

        <MonitorConditionBlock
          note="Каждый монитор из партии проходит одинаковую проверку перед выдачей, но советуем повторить её лично при самовывозе — это не займёт больше 5 минут."
        />

        {/* Для кого */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Для кого подойдёт</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {monitor.forWhom.map((item) => (
              <div key={item} className="border border-border rounded-lg p-5 bg-card">
                <p>{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Опт подробно */}
        {monitor.bulk && (
          <section className="mb-12">
            <div className="bg-card border border-border rounded-2xl p-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Опт: выгодно для офиса</h2>
              <p className="text-muted-foreground mb-4">
                Партия — 25 штук, поэтому можем предложить хорошую цену при покупке от {monitor.bulk.fromQty}{" "}
                мониторов. Все мониторы из одной партии, проверены по одной методике, состояние сопоставимое.
              </p>
              <div className="grid sm:grid-cols-2 gap-4 max-w-md">
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">1–2 шт</p>
                  <p className="text-xl font-bold">{formatPriceRub(monitor.price)}</p>
                </div>
                <div className="bg-primary/10 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">от {monitor.bulk.fromQty} шт</p>
                  <p className="text-xl font-bold text-primary">{formatPriceRub(monitor.bulk.price)}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        <MonitorCTASection
          title="Готовы забрать HP Z24i G2?"
          subtitle="Позвоните или напишите в Telegram — согласуем удобное время самовывоза"
        />

        <FAQ items={faqItems} title="Вопросы про HP Z24i G2" />

        <RelatedMonitors currentSlug={monitor.slug} />

        <section>
          <LeadForm
            title="Оставить заявку на HP Z24i G2"
            subtitle="Укажите нужное количество — свяжемся и согласуем самовывоз"
            formType="buy"
          />
        </section>
      </main>
    </div>
  );
};

export default HpZ24iG2;
