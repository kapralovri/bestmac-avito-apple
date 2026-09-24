import type { Metadata } from 'next';
import { readFile } from 'fs/promises';
import path from 'path';
import { notFound } from 'next/navigation';
import {
  slugToModelName,
  modelShortName,
  modelNameFromSlug,
  modelMatchFromSlug,
  modelToSlug,
  ALL_BUYOUT_MODELS,
} from '@/lib/model-slugs';
import { generateBreadcrumbSchema } from '@/lib/structured-data';
import { loadAvitoPricesServer } from '@/lib/server-prices';
import { getPriceModelSlugs } from '@/lib/price-pages';
import { buildSellModelPrices, buildModelFaq, ageDays } from '@/lib/sell-prices';
import { FAMILY_FAQ } from '@/data/family-faq';
import SellModel from '@/views/SellModel';
import SellPriceBlock from '@/components/sell/SellPriceBlock';
import AvitoReviews from '@/components/AvitoReviews';

interface AvitoUrlsData {
  entries: Array<{ model_name: string }>;
}

async function resolveModelName(slug: string): Promise<string | undefined> {
  // Каталог — основной источник истины (без файлового I/O, работает на этапе сборки).
  const fromCatalog = modelNameFromSlug(slug);
  if (fromCatalog) return fromCatalog;

  // Фолбэк: модели, присутствующие только в данных Avito.
  try {
    const filePath = path.join(process.cwd(), 'public/data/avito-urls.json');
    const raw = await readFile(filePath, 'utf-8');
    const data: AvitoUrlsData = JSON.parse(raw);
    const allModels = [...new Set(data.entries.map((e) => e.model_name))];
    return slugToModelName(slug, allModels);
  } catch {
    return undefined;
  }
}

// Пререндерим весь канонический каталог моделей (sitemap == маршрут == canonical).
export function generateStaticParams() {
  return ALL_BUYOUT_MODELS.map((m) => ({ model_slug: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ model_slug: string }>;
}): Promise<Metadata> {
  const { model_slug } = await params;
  const modelName = await resolveModelName(model_slug);
  const shortName = modelName ? modelShortName(modelName) : null;

  const title = shortName
    ? `Выкуп ${shortName} в Москве дорого`
    : 'Выкуп MacBook в Москве — онлайн-оценка';

  const description = shortName
    ? `Узнайте реальную стоимость выкупа вашего ${shortName}. Прозрачная оценка, выплата до 80% от рынка, деньги сразу.`
    : 'Онлайн-оценка стоимости выкупа вашей модели MacBook. Узнайте рыночную цену за 10 секунд и продайте выгодно в BestMac.';

  return {
    title,
    description,
    alternates: { canonical: `/sell/${model_slug}` },
  };
}

export default async function SellModelPage({
  params,
}: {
  params: Promise<{ model_slug: string }>;
}) {
  const { model_slug } = await params;
  const modelName = await resolveModelName(model_slug);

  // Несуществующая модель → 404 вместо «мягкого» soft-404 (закрывает бесконечную
  // индексируемую поверхность из произвольных slug).
  if (!modelName) notFound();

  const shortName = modelShortName(modelName);

  // GST-78: цены модели по семейству, диагонали и чипу (не по названию).
  const match = modelMatchFromSlug(model_slug);
  const data = await loadAvitoPricesServer();
  const now = new Date();
  const prices = buildSellModelPrices(data?.stats, match, now);
  const updatedLabel = prices.latestUpdate && ageDays(prices.latestUpdate, now) !== null
    ? formatUpdated(prices.latestUpdate)
    : '';

  // Рыночные цены: страница /ceny той же модели, если строки лежат под одним
  // названием и такая страница есть; иначе общий индекс.
  const cenySlugs = await getPriceModelSlugs();
  const onlyName = prices.sourceModelNames.length === 1 ? modelToSlug(prices.sourceModelNames[0]) : '';
  const cenyHref = onlyName && cenySlugs.includes(onlyName) ? `/ceny/${onlyName}` : '/ceny';

  const faqs = [...buildModelFaq(shortName, prices), ...(match ? FAMILY_FAQ[match.family] ?? [] : [])];

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Главная', url: '/' },
    { name: 'Выкуп', url: '/sell' },
    { name: shortName, url: `/sell/${model_slug}` },
  ]);
  const faqSchema = {
    '@context': 'https://schema.org',
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
          __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': [breadcrumbSchema, faqSchema] }),
        }}
      />

      {/* Интерактивный калькулятор — клиентский островок; конфигурации приходят с сервера. */}
      <SellModel
        modelName={modelName}
        slug={model_slug}
        configs={prices.configs}
        totalListings={data?.total_listings ?? 0}
        updatedLabel={updatedLabel}
      />

      <SellPriceBlock shortName={shortName} prices={prices} updatedLabel={updatedLabel} cenyHref={cenyHref} />

      <AvitoReviews limit={3} />

      {/* Серверный FAQ: вопросы модели из данных + блок семейства (GST-78). */}
      <section className="container mx-auto px-4 pb-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Частые вопросы о выкупе {shortName}
          </h2>
          <div className="space-y-4">
            {faqs.map((f) => (
              <div key={f.question} className="bg-card border border-border/60 rounded-xl p-5">
                <h3 className="font-semibold mb-2">{f.question}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

/** «2026-09-21 09:00» → «21 сентября 2026». Старый формат парсера — через Date. */
function formatUpdated(updatedAt: string): string {
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(updatedAt);
  const d = new Date(iso ? `${iso[1]}T12:00:00` : updatedAt);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}
