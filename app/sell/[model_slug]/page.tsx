import type { Metadata } from 'next';
import { readFile } from 'fs/promises';
import path from 'path';
import { notFound } from 'next/navigation';
import {
  slugToModelName,
  modelShortName,
  modelNameFromSlug,
  ALL_BUYOUT_MODELS,
} from '@/lib/model-slugs';
import { faqData } from '@/lib/schema';
import { generateBreadcrumbSchema } from '@/lib/structured-data';
import SellModel from '@/views/SellModel';

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
  const faqs = faqData.sell;

  // Серверная разметка: хлебные крошки + FAQ. Рендерится в HTML, в отличие от
  // клиентского калькулятора ниже.
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

      {/* Интерактивный калькулятор — клиентский островок. H1/интро резолвятся на сервере через props. */}
      <SellModel modelName={modelName} slug={model_slug} />

      {/* Серверный FAQ-блок: реальный, извлекаемый текст в HTML (для Яндекса и AI-поиска). */}
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
