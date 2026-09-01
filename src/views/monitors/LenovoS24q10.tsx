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
import { AlertTriangle, PackageCheck } from "lucide-react";

const monitor = getMonitorBySlug("lenovo-thinkvision-s24q-10")!;

const breadcrumbItems = [
  { name: "Главная", url: "/" },
  { name: "Мониторы", url: "/monitory" },
  { name: monitor.name, url: `/monitory/${monitor.slug}` },
];

const faqItems = [
  {
    question: "У этого монитора регулируется высота подставки?",
    answer:
      "Нет, у Lenovo ThinkVision S24q-10 подставка регулируется только по наклону (tilt −5°…+22°). Регулировки высоты, поворота (pivot) и разворота (swivel) у этой модели нет. Если нужна полная эргономика при том же разрешении QHD — обратите внимание на Lenovo ThinkVision E24q-20.",
  },
  {
    question: "Какое разрешение и матрица у S24q-10?",
    answer:
      "2560×1440 (QHD), IPS-матрица с углами обзора 178°/178° и покрытием около 99% sRGB. Изображение заметно чётче, чем у обычного Full HD монитора того же размера.",
  },
  {
    question: "Можно ли закрепить монитор на кронштейн VESA?",
    answer: "Да, у модели есть крепление VESA 100×100 — подойдёт стандартный настенный или настольный кронштейн.",
  },
  {
    question: "Как забрать монитор?",
    answer:
      "Только самовывоз в Москве, м. Киевская, ул. Дениса Давыдова 3. Доставки нет. Оплата после проверки монитора на месте, предоплата не требуется.",
  },
];

const LenovoS24q10 = () => {
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
            Компактный QHD-монитор Lenovo с тонкими рамками по самой доступной цене в линейке QHD-моделей.
            5 штук в наличии.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="relative w-full h-72 md:h-full min-h-[280px] rounded-2xl overflow-hidden bg-muted">
            <Image
              src={monitor.image}
              alt={monitor.imageAlt}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 500px"
              className="object-cover"
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

        {monitor.honestNote && (
          <section className="mb-12">
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-5">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{monitor.honestNote}</p>
            </div>
          </section>
        )}

        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Проверенные характеристики</h2>
          <MonitorSpecsTable specs={monitor.specs} />
          <p className="text-xs text-muted-foreground">
            Источник: Lenovo PSREF ThinkVision S24q-10, displayspecifications.com.
          </p>
        </section>

        <MonitorConditionBlock />

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
          title="Готовы забрать Lenovo ThinkVision S24q-10?"
          subtitle="Позвоните или напишите в Telegram — согласуем время самовывоза"
        />

        <FAQ items={faqItems} title="Вопросы про Lenovo ThinkVision S24q-10" />

        <RelatedMonitors currentSlug={monitor.slug} />

        <section>
          <LeadForm
            title="Оставить заявку на Lenovo ThinkVision S24q-10"
            subtitle="Свяжемся и согласуем самовывоз"
            formType="buy"
          />
        </section>
      </main>
    </div>
  );
};

export default LenovoS24q10;
