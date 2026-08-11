import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getModelPriceBySlug,
  getPriceModelSlugs,
  formatConfig,
  formatRub,
  type ModelPrice,
} from '@/lib/price-pages';
import { generateBreadcrumbSchema } from '@/lib/structured-data';

// Пререндерим страницу для каждой модели, у которой есть ценовые данные.
export async function generateStaticParams() {
  const slugs = await getPriceModelSlugs();
  return slugs.map((slug) => ({ model_slug: slug }));
}

function humanDate(raw?: string): string {
  if (!raw) return '';
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return raw.split(' ')[0] ?? '';
  return new Date(t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

const CURRENT_YEAR = new Date().getFullYear();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ model_slug: string }>;
}): Promise<Metadata> {
  const { model_slug } = await params;
  const model = await getModelPriceBySlug(model_slug);

  if (!model) {
    return { title: 'Цена не найдена', robots: { index: false, follow: true } };
  }

  const title = `Цена ${model.displayName} б/у в Москве — сколько стоит в ${CURRENT_YEAR}`;
  const description =
    `Сколько стоит ${model.displayName} б/у в Москве: от ${formatRub(model.minPrice)} ` +
    `до ${formatRub(model.maxPrice)}, медиана ${formatRub(model.medianPrice)}. ` +
    `Актуальные рыночные цены по конфигурациям, данные обновляются ежедневно.`;

  return {
    title,
    description,
    alternates: { canonical: `/ceny/${model_slug}` },
  };
}

// FAQ, специфичный для модели и её цен — извлекаемый текст для Яндекса и AI-поиска.
function buildFaqs(model: ModelPrice): Array<{ question: string; answer: string }> {
  return [
    {
      question: `Сколько стоит ${model.displayName} б/у в Москве?`,
      answer:
        `Цена ${model.displayName} б/у в Москве — от ${formatRub(model.minPrice)} до ` +
        `${formatRub(model.maxPrice)}, медианная рыночная цена ${formatRub(model.medianPrice)}. ` +
        `Стоимость зависит от объёма памяти, накопителя, процессора и состояния устройства.`,
    },
    {
      question: `От чего зависит цена ${model.displayName}?`,
      answer:
        `Главные факторы — процессор (чип Apple), объём оперативной памяти и накопителя (SSD), ` +
        `а также состояние: наличие царапин, ёмкость аккумулятора, комплектность. ` +
        `В таблице выше видно, как цена меняется по конфигурациям.`,
    },
    {
      question: `Где продать ${model.displayName} в Москве?`,
      answer:
        `BestMac выкупает ${model.displayName} с выплатой сразу — наличными или переводом. ` +
        `Оценка онлайн за несколько минут, ориентир выкупа для этой модели — около ` +
        `${formatRub(model.buyoutPrice)}. Оформите заявку на странице выкупа.`,
    },
    {
      question: `Насколько актуальны эти цены?`,
      answer:
        `Цены рассчитаны по объявлениям Авито в Москве и обновляются ежедневно. ` +
        `Последнее обновление: ${humanDate(model.updatedAt)}. Всего в расчёте учтено ` +
        `${model.samplesCount} объявлений.`,
    },
  ];
}

export default async function ModelPricePage({
  params,
}: {
  params: Promise<{ model_slug: string }>;
}) {
  const { model_slug } = await params;
  const model = await getModelPriceBySlug(model_slug);

  // Несуществующая модель → 404 (закрывает индексацию произвольных slug).
  if (!model) notFound();

  const faqs = buildFaqs(model);
  const updated = humanDate(model.updatedAt);

  const breadcrumb = generateBreadcrumbSchema([
    { name: 'Главная', url: '/' },
    { name: 'Цены', url: '/ceny' },
    { name: `${model.displayName} б/у`, url: `/ceny/${model.slug}` },
  ]);

  // priceValidUntil — 30 дней вперёд (цены пересчитываются ежедневно).
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // Product + AggregateOffer: диапазон рыночных цен как машиночитаемый факт.
  const productSchema = {
    '@type': 'Product',
    name: `${model.displayName} б/у`,
    description:
      `Подержанный ${model.displayName} в Москве. Рыночная цена от ` +
      `${formatRub(model.minPrice)} до ${formatRub(model.maxPrice)} по данным Авито.`,
    category: 'Компьютеры и ноутбуки',
    brand: { '@type': 'Brand', name: 'Apple' },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'RUB',
      lowPrice: String(model.minPrice),
      highPrice: String(model.maxPrice),
      offerCount: String(model.samplesCount),
      priceValidUntil: validUntil,
      itemCondition: 'https://schema.org/UsedCondition',
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'BestMac' },
      url: `https://bestmac.ru/ceny/${model.slug}`,
    },
  };

  const faqSchema = {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [breadcrumb, productSchema, faqSchema],
          }),
        }}
      />

      <main className="container mx-auto px-4 py-10 md:py-14">
        <div className="max-w-4xl mx-auto">
          <nav aria-label="Хлебные крошки" className="text-sm text-muted-foreground mb-6">
            <Link href="/" className="hover:underline">Главная</Link>
            <span className="mx-2">/</span>
            <Link href="/ceny" className="hover:underline">Цены</Link>
            <span className="mx-2">/</span>
            <span>{model.displayName}</span>
          </nav>

          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Цена {model.displayName} б/у в Москве
          </h1>

          <p className="text-muted-foreground leading-relaxed mb-6 max-w-3xl">
            Сколько стоит {model.displayName} б/у в Москве в {CURRENT_YEAR} году: рыночная цена
            от <strong className="text-foreground">{formatRub(model.minPrice)}</strong> до{' '}
            <strong className="text-foreground">{formatRub(model.maxPrice)}</strong>, медианная
            стоимость — <strong className="text-foreground">{formatRub(model.medianPrice)}</strong>.
            Данные рассчитаны по объявлениям Авито в Москве
            {updated && <> и обновлены {updated}</>}.
          </p>

          {/* Сводка цен — ключевые числа сверху */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            {[
              { label: 'Цена от', value: formatRub(model.minPrice) },
              { label: 'Медиана рынка', value: formatRub(model.medianPrice), accent: true },
              { label: 'Максимум', value: formatRub(model.maxPrice) },
              { label: 'Выкуп до', value: formatRub(model.buyoutPrice) },
            ].map((c) => (
              <div
                key={c.label}
                className={`rounded-xl border p-4 ${c.accent ? 'border-primary/50 bg-primary/5' : 'border-border/60 bg-card'}`}
              >
                <div className="text-xs text-muted-foreground mb-1">{c.label}</div>
                <div className="text-lg md:text-xl font-bold">{c.value}</div>
              </div>
            ))}
          </div>

          {/* Таблица цен по конфигурациям — покрывает длинный хвост «M2 256 ГБ» и т.п. */}
          {model.configs.length > 0 && (
            <section className="mb-10">
              <h2 className="text-2xl font-bold mb-4">
                Цена {model.displayName} по конфигурациям
              </h2>
              <div className="overflow-x-auto rounded-xl border border-border/60">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left">
                      <th className="px-4 py-3 font-semibold">Процессор</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">RAM / SSD</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Цена от</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Медиана</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">До</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.configs.map((c, i) => (
                      <tr key={i} className="border-t border-border/60">
                        <td className="px-4 py-3">{c.processor || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatConfig(c.ram, c.ssd) || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatRub(c.minPrice)}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-semibold">{formatRub(c.medianPrice)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatRub(c.maxPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Цены в рублях по рынку б/у Москвы. Медиана — типичная цена, «от» и «до» — границы P10–P90.
              </p>
            </section>
          )}

          {/* CTA-блок: продать / купить */}
          <section className="grid md:grid-cols-2 gap-4 mb-12">
            <div className="rounded-xl border border-border/60 bg-card p-6">
              <h2 className="text-lg font-bold mb-2">Продать {model.displayName}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                BestMac выкупает {model.displayName} дорого — ориентир {formatRub(model.buyoutPrice)},
                оценка онлайн, деньги сразу.
              </p>
              <Link
                href="/sell"
                className="inline-block rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90"
              >
                Оценить выкуп →
              </Link>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-6">
              <h2 className="text-lg font-bold mb-2">Купить {model.displayName} б/у</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                Проверенные MacBook и Mac б/у с гарантией. Диагностика перед продажей,
                возврат в течение 7 дней.
              </p>
              <Link
                href="/buy"
                className="inline-block rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
              >
                Смотреть каталог →
              </Link>
            </div>
          </section>

          {/* FAQ — извлекаемый текст в HTML */}
          <section>
            <h2 className="text-2xl font-bold mb-6">
              Частые вопросы о цене {model.displayName}
            </h2>
            <div className="space-y-4">
              {faqs.map((f) => (
                <div key={f.question} className="bg-card border border-border/60 rounded-xl p-5">
                  <h3 className="font-semibold mb-2">{f.question}</h3>
                  <p className="text-muted-foreground leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
          </section>

          <p className="text-sm text-muted-foreground mt-10">
            ← Вернуться к{' '}
            <Link href="/ceny" className="text-primary hover:underline">индексу цен на технику Apple</Link>
          </p>
        </div>
      </main>
    </>
  );
}
