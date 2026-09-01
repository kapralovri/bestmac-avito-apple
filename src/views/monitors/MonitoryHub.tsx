"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import Breadcrumbs from "@/components/Breadcrumbs";
import LeadForm from "@/components/LeadForm";
import FAQ from "@/components/FAQ";
import { Button } from "@/components/ui/button";
import { MONITORS, formatPriceRub } from "@/lib/monitors-data";
import { CheckCircle2, ShieldCheck, Ban, MapPin, PackageCheck, ArrowRight } from "lucide-react";

const breadcrumbItems = [
  { name: "Главная", url: "/" },
  { name: "Мониторы", url: "/monitory" },
];

const faqItems = [
  {
    question: "Как вы проверяете б/у монитор перед продажей?",
    answer:
      "Каждый монитор включаем и тестируем: изображение без битых пикселей и засветов, равномерность подсветки, работа всех портов (DisplayPort/HDMI/VGA — в зависимости от модели), исправность регулировки подставки. При самовывозе вы можете повторно всё проверить лично перед оплатой.",
  },
  {
    question: "Даёте ли вы гарантию на б/у мониторы?",
    answer:
      "Мониторы проверены и рабочие на момент продажи. Как и с любой б/у техникой, рекомендуем протестировать монитор на месте при получении — это лучшая гарантия для обеих сторон. Основные технические характеристики каждой модели указаны на карточке товара.",
  },
  {
    question: "Как забрать монитор — есть ли доставка?",
    answer:
      "Только самовывоз в Москве: м. Киевская, ул. Дениса Давыдова 3. Доставки нет. Предоплата не требуется — оплата после того, как вы осмотрели и проверили монитор на месте.",
  },
  {
    question: "Можно ли купить мониторы оптом?",
    answer:
      "Да, у нас есть партия HP Z24i G2 — 25 штук. Действует скидка при покупке от 3 шт: 7 000 ₽ за штуку вместо 8 000 ₽. Для оснащения офиса или коворкинга это отдельно выгодно — пишите в Telegram или звоните, обсудим объём и удобное время самовывоза.",
  },
  {
    question: "Какое разрешение выбрать — Full HD, QHD или WUXGA?",
    answer:
      "Full HD (1920×1080) — для базовых офисных задач. QHD (2560×1440) — больше пространства и чёткости для работы с таблицами и графикой. WUXGA (1920×1200, формат 16:10) — как у HP Z24i G2 — даёт больше рабочей высоты, чем обычный Full HD, что удобно для кода, документов и таблиц.",
  },
  {
    question: "Почему у б/у монитора цена настолько ниже новой розницы?",
    answer:
      "Это списанные из офисов исправные мониторы бизнес-класса HP и Lenovo. Технически они не уступают новым аналогам, но продаются в 2-4 раза дешевле розничной цены именно потому, что уже были в эксплуатации. Все дефекты внешнего вида, если они есть, указываем честно в карточке модели.",
  },
];

const MonitoryHub = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={breadcrumbItems} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Б/у мониторы HP и Lenovo — самовывоз в Москве
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl">
            Партия проверенных офисных мониторов HP и Lenovo. IPS-матрицы, бизнес-класс, честное описание
            состояния. Оплата и проверка на месте, самовывоз у м. Киевская — без предоплаты и доставки.
          </p>
        </motion.div>

        {/* Hero image */}
        <div className="relative w-full h-56 md:h-72 rounded-2xl overflow-hidden mb-12 bg-muted">
          <Image
            src="/images/monitors/hero-monitors.jpg"
            alt="Б/у мониторы HP и Lenovo в наличии — самовывоз в Москве"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 1200px"
            className="object-cover"
          />
        </div>

        {/* Модели */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">Модели в наличии</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {MONITORS.map((m, index) => (
              <motion.div
                key={m.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 * index }}
              >
                <Link
                  href={`/monitory/${m.slug}`}
                  className="group flex flex-col h-full bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="relative w-full h-44 bg-muted">
                    <Image
                      src={m.image}
                      alt={m.imageAlt}
                      fill
                      sizes="(max-width: 768px) 100vw, 400px"
                      className="object-cover"
                    />
                    {m.stock <= 3 && (
                      <span className="absolute top-3 right-3 bg-destructive text-destructive-foreground text-xs font-semibold px-2.5 py-1 rounded-full">
                        Осталось {m.stock} шт
                      </span>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col p-5">
                    <p className="text-xs text-muted-foreground mb-1">{m.brand}</p>
                    <h3 className="text-lg font-bold mb-1 group-hover:text-primary transition-colors">
                      {m.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {m.diagonal} · {m.resolution}
                    </p>
                    <p className="text-sm mb-4 flex-1">{m.keyFeature}</p>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-bold text-primary">{formatPriceRub(m.price)}</p>
                        {m.stock > 3 && (
                          <p className="text-xs text-muted-foreground">В наличии: {m.stock} шт</p>
                        )}
                      </div>
                      <span className="inline-flex items-center text-sm font-medium text-primary">
                        Подробнее
                        <ArrowRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Почему у нас */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">Почему у нас</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex flex-col items-start gap-3 p-5 bg-card rounded-xl border">
              <CheckCircle2 className="w-8 h-8 text-primary" />
              <p className="font-semibold">Проверка при получении</p>
              <p className="text-sm text-muted-foreground">
                Включаем монитор и тестируем изображение и порты вместе с вами перед оплатой
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 p-5 bg-card rounded-xl border">
              <ShieldCheck className="w-8 h-8 text-primary" />
              <p className="font-semibold">Без предоплаты</p>
              <p className="text-sm text-muted-foreground">
                Оплата только после того, как вы лично убедились в исправности монитора
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 p-5 bg-card rounded-xl border">
              <MapPin className="w-8 h-8 text-primary" />
              <p className="font-semibold">Самовывоз м. Киевская</p>
              <p className="text-sm text-muted-foreground">
                ул. Дениса Давыдова 3, Дорогомилово, ЦАО. Доставки нет
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 p-5 bg-card rounded-xl border">
              <PackageCheck className="w-8 h-8 text-primary" />
              <p className="font-semibold">Честное описание</p>
              <p className="text-sm text-muted-foreground">
                Указываем реальные характеристики и особенности каждой модели, без приукрашивания
              </p>
            </div>
          </div>
        </section>

        {/* Опт */}
        <section className="mb-16">
          <div className="bg-card border border-border rounded-2xl p-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Опт: партия HP Z24i G2 — 25 шт</h2>
            <p className="text-muted-foreground mb-4 max-w-2xl">
              Основной объём — 25 мониторов HP Z24i G2 (24&quot;, WUXGA 1920×1200, формат 16:10). Подходит
              для оснащения офиса, коворкинга или учебного класса. Действует скидка от объёма.
            </p>
            <div className="flex flex-wrap gap-6 mb-6">
              <div>
                <p className="text-sm text-muted-foreground">Розничная цена</p>
                <p className="text-2xl font-bold">8 000 ₽ / шт</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Опт от 3 шт</p>
                <p className="text-2xl font-bold text-primary">7 000 ₽ / шт</p>
              </div>
            </div>
            <Button asChild size="lg">
              <Link href="/monitory/hp-z24i-g2">
                Смотреть HP Z24i G2 и условия опта
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* FAQ */}
        <FAQ items={faqItems} title="Частые вопросы о б/у мониторах" />

        {/* Lead form */}
        <section className="mt-4">
          <LeadForm
            title="Не нашли подходящую модель?"
            subtitle="Оставьте заявку — подскажем, какой монитор в наличии подойдёт под ваши задачи"
            formType="buy"
          />
        </section>
      </main>
    </div>
  );
};

export default MonitoryHub;
