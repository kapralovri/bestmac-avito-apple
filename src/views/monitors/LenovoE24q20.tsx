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
import { Flame, PackageCheck } from "lucide-react";

const monitor = getMonitorBySlug("lenovo-thinkvision-e24q-20")!;

const breadcrumbItems = [
  { name: "Главная", url: "/" },
  { name: "Мониторы", url: "/monitory" },
  { name: monitor.name, url: `/monitory/${monitor.slug}` },
];

const faqItems = [
  {
    question: "Чем E24q-20 отличается от S24q-10?",
    answer:
      "Разрешение у обеих моделей одинаковое — QHD 2560×1440. Но E24q-20 даёт полную эргономику подставки: регулировку высоты до 155 мм, поворот экрана (pivot), разворот (swivel) и наклон. У S24q-10 регулируется только наклон. E24q-20 также поддерживает 75 Гц и имеет встроенные колонки.",
  },
  {
    question: "Зачем нужен поворот экрана (pivot) в 90°?",
    answer:
      "В портретном режиме на экран помещается больше текста по вертикали — удобно для чтения длинного кода, PDF-документов и работы с текстом. У E24q-20 pivot поддерживается официально.",
  },
  {
    question: "Почему в наличии всего 2 штуки?",
    answer:
      "E24q-20 — самая продвинутая модель линейки по эргономике, и таких мониторов у нас немного. Если нужна пара для двух рабочих мест — рекомендуем не откладывать бронирование.",
  },
  {
    question: "Как забрать монитор?",
    answer:
      "Самовывоз в Москве, м. Киевская, ул. Дениса Давыдова 3. Доставки нет, оплата после проверки на месте.",
  },
];

const LenovoE24q20 = () => {
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
            QHD-монитор с полной эргономикой подставки: высота, наклон, разворот и поворот (pivot), плюс
            встроенные колонки. Осталось всего {monitor.stock} шт.
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
            <span className="absolute top-4 right-4 bg-destructive text-destructive-foreground text-xs font-semibold px-3 py-1.5 rounded-full">
              Осталось {monitor.stock} шт
            </span>
          </div>

          <div className="flex flex-col justify-center">
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-3xl font-bold text-primary">{formatPriceRub(monitor.price)}</span>
                <span className="text-sm text-muted-foreground">за 1 шт</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-destructive mb-4">
                <Flame className="w-4 h-4" />
                Осталось всего {monitor.stock} шт в наличии
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
            Источник: Lenovo PSREF ThinkVision E24q-20, aventissystems.com.
          </p>
        </section>

        <MonitorConditionBlock
          checks={[
            "Включим монитор и покажем изображение QHD без битых пикселей и засветов",
            "Проверим регулировку высоты, наклона, разворота и поворота (pivot) подставки",
            "Подключим по HDMI и DisplayPort и проверим встроенные колонки",
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
          title="Осталось всего 2 шт — успейте забронировать"
          subtitle="Позвоните или напишите в Telegram, чтобы согласовать самовывоз до продажи модели"
        />

        <FAQ items={faqItems} title="Вопросы про Lenovo ThinkVision E24q-20" />

        <RelatedMonitors currentSlug={monitor.slug} />

        <section>
          <LeadForm
            title="Оставить заявку на Lenovo ThinkVision E24q-20"
            subtitle="Свяжемся и согласуем самовывоз, пока модель в наличии"
            formType="buy"
          />
        </section>
      </main>
    </div>
  );
};

export default LenovoE24q20;
