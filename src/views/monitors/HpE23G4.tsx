"use client";

import Image from "next/image";
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
import { Wallet, PackageCheck } from "lucide-react";

const monitor = getMonitorBySlug("hp-e23-g4")!;

const breadcrumbItems = [
  { name: "Главная", url: "/" },
  { name: "Мониторы", url: "/monitory" },
  { name: monitor.name, url: `/monitory/${monitor.slug}` },
];

const faqItems = [
  {
    question: "Это самый дешёвый монитор в вашей линейке?",
    answer:
      "Да, HP E23 G4 — самый доступный вариант из пяти моделей, при этом с IPS-матрицей и полной эргономикой подставки (высота, наклон, разворот, pivot).",
  },
  {
    question: "Есть ли порт VGA для старого компьютера?",
    answer:
      "Да, у E23 G4 есть VGA вместе с DisplayPort и HDMI — можно подключить и старый системный блок, и современный ноутбук.",
  },
  {
    question: "Какая эргономика у подставки?",
    answer:
      "Полная: высота до 150 мм, наклон −5°…+23°, разворот ±45°, поворот (pivot) ±90°. Плюс антибликовое покрытие и режим низкого синего света.",
  },
  {
    question: "Сколько штук в наличии?",
    answer: "3 штуки. Можно взять сразу несколько для двух-трёх рабочих мест.",
  },
  {
    question: "Как забрать монитор?",
    answer:
      "Самовывоз в Москве, м. Киевская, ул. Дениса Давыдова 3. Доставки нет, оплата после проверки на месте.",
  },
];

const HpE23G4 = () => {
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">{monitor.h1}</h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl">
            Самый доступный монитор нашей линейки: IPS-матрица, полная регулировка подставки и порт VGA
            для старых системных блоков. 3 шт в наличии.
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

              <div className="flex items-start gap-3 bg-primary/10 rounded-lg p-4 mb-4">
                <Wallet className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm">Самая доступная модель линейки — оптимальный вход в IPS-мониторы бизнес-класса.</p>
              </div>

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

        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Проверенные характеристики</h2>
          <MonitorSpecsTable specs={monitor.specs} />
          <p className="text-xs text-muted-foreground">
            Источник: HP QuickSpecs E23 G4 (h20195.www2.hp.com), displayspecifications.com.
          </p>
        </section>

        <MonitorConditionBlock
          checks={[
            "Включим монитор и покажем изображение Full HD без битых пикселей и засветов",
            "Проверим все порты, включая VGA для старых системных блоков",
            "Проверим полную регулировку подставки: высота, наклон, разворот, pivot",
            "Покажем состояние корпуса и рамки честно, без приукрашивания",
          ]}
        />

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

        <MonitorCTASection
          title="Готовы забрать HP E23 G4?"
          subtitle="Позвоните или напишите в Telegram — согласуем удобное время самовывоза"
        />

        <FAQ items={faqItems} title="Вопросы про HP E23 G4" />

        <RelatedMonitors currentSlug={monitor.slug} />

        <section>
          <LeadForm
            title="Оставить заявку на HP E23 G4"
            subtitle="Свяжемся и согласуем самовывоз"
            formType="buy"
          />
        </section>
      </main>
    </div>
  );
};

export default HpE23G4;
