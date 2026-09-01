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
import { Sparkles, PackageCheck } from "lucide-react";

const monitor = getMonitorBySlug("hp-z24f-g3")!;

const breadcrumbItems = [
  { name: "Главная", url: "/" },
  { name: "Мониторы", url: "/monitory" },
  { name: monitor.name, url: `/monitory/${monitor.slug}` },
];

const faqItems = [
  {
    question: "Правда, что новый HP Z24f G3 стоит около 37 000 ₽?",
    answer:
      "Да, это розничная цена нового монитора этой модели (данные zworkstation.ru). Наш экземпляр б/у, проверенный, продаётся за 9 000 ₽ — это примерно четверть цены нового.",
  },
  {
    question: "Что значит daisy-chain через DisplayPort?",
    answer:
      "У монитора есть DisplayPort вход и DisplayPort выход. Это позволяет подключить второй такой же монитор «цепочкой» через один порт видеокарты, без второго кабеля от компьютера напрямую.",
  },
  {
    question: "Почему в наличии только 1 штука?",
    answer:
      "Z24f G3 — премиальная модель Z-серии HP, таких у нас в партии не было много. Это единственный экземпляр, поэтому рекомендуем не откладывать, если модель подходит.",
  },
  {
    question: "Какая эргономика у подставки?",
    answer:
      "Полная: высота до 150 мм, наклон −5°…+20°, разворот ±45°, поворот экрана (pivot) ±90°. Корпус алюминиевый, безрамочный дизайн.",
  },
  {
    question: "Как забрать монитор?",
    answer:
      "Самовывоз в Москве, м. Киевская, ул. Дениса Давыдова 3. Доставки нет, оплата после проверки на месте.",
  },
];

const HpZ24fG3 = () => {
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
            Топовая модель Z-серии HP: алюминиевый безрамочный корпус, daisy-chain через DisplayPort,
            встроенный USB-хаб. Единственный экземпляр в наличии.
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
            <span className="absolute top-4 right-4 bg-destructive text-destructive-foreground text-xs font-semibold px-3 py-1.5 rounded-full">
              Единственный экземпляр
            </span>
          </div>

          <div className="flex flex-col justify-center">
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-3xl font-bold text-primary">{formatPriceRub(monitor.price)}</span>
                <span className="text-sm text-muted-foreground line-through">~37 000 ₽ новый</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">В наличии: 1 шт — уникальный лот</p>

              {monitor.newPriceNote && (
                <div className="flex items-start gap-3 bg-primary/10 rounded-lg p-4 mb-4">
                  <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{monitor.newPriceNote}</p>
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

        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Проверенные характеристики</h2>
          <MonitorSpecsTable specs={monitor.specs} />
          <p className="text-xs text-muted-foreground">
            Источник: HP QuickSpecs Z24f G3 (h20195.www2.hp.com), iconicmicro.com.
          </p>
        </section>

        <MonitorConditionBlock
          checks={[
            "Включим монитор и покажем изображение Full HD без битых пикселей и засветов",
            "Проверим daisy-chain через DisplayPort IN/OUT",
            "Проверим порты USB 3.2 и зарядку через USB на портах с поддержкой",
            "Проверим полную регулировку подставки: высота, наклон, разворот, pivot",
            "Покажем состояние алюминиевого корпуса честно, без приукрашивания",
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
          title="Единственный экземпляр — успейте забрать"
          subtitle="Позвоните или напишите в Telegram, чтобы согласовать самовывоз"
        />

        <FAQ items={faqItems} title="Вопросы про HP Z24f G3" />

        <RelatedMonitors currentSlug={monitor.slug} />

        <section>
          <LeadForm
            title="Оставить заявку на HP Z24f G3"
            subtitle="Свяжемся и согласуем самовывоз, пока монитор не продан"
            formType="buy"
          />
        </section>
      </main>
    </div>
  );
};

export default HpZ24fG3;
