import type { Metadata } from 'next';
import { readFile } from 'fs/promises';
import path from 'path';
import { slugToModelName, modelShortName, POPULAR_MODELS } from '@/lib/model-slugs';
import SellModel from '@/views/SellModel';

interface AvitoUrlsData {
  entries: Array<{ model_name: string }>;
}

async function resolveModelName(slug: string): Promise<string | undefined> {
  // Check popular models first (no file I/O needed)
  const popular = POPULAR_MODELS.find(m => m.slug === slug);
  if (popular) return popular.name;

  try {
    const filePath = path.join(process.cwd(), 'public/data/avito-urls.json');
    const raw = await readFile(filePath, 'utf-8');
    const data: AvitoUrlsData = JSON.parse(raw);
    const allModels = [...new Set(data.entries.map(e => e.model_name))];
    return slugToModelName(slug, allModels);
  } catch {
    return undefined;
  }
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

export default function SellModelPage() {
  return <SellModel />;
}
