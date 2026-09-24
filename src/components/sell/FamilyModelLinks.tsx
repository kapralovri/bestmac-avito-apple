import Link from 'next/link';
import { loadAvitoPricesServer } from '@/lib/server-prices';
import { BUYOUT_MODELS, modelShortName } from '@/lib/model-slugs';
import { modelPriceSummaries, formatRub } from '@/lib/sell-prices';

/**
 * Страница семейства → страницы моделей. Модельные страницы /sell/<модель>
 * (GST-78) с ценами в HTML были доступны только из sitemap: с семейных
 * страниц на них не вела ни одна ссылка. Модели без надёжных цен тоже
 * показываем — со ссылкой на оценку по фото на их странице.
 */
export default async function FamilyModelLinks({ family }: { family: keyof typeof BUYOUT_MODELS }) {
  const models = BUYOUT_MODELS[family];
  const data = await loadAvitoPricesServer();
  const prices = new Map(modelPriceSummaries(data?.stats, models, new Date()).map((s) => [s.slug, s.maxBuyout]));
  return (
    <section className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">Выкуп {family} по моделям</h2>
        <div className="grid sm:grid-cols-2 gap-x-8">
          {models.map((m) => {
            const price = prices.get(m.slug);
            return (
              <Link
                key={m.slug}
                href={`/sell/${m.slug}`}
                className="flex items-center justify-between border-b border-border/60 py-2 hover:text-primary"
              >
                <span>{modelShortName(m.name)}</span>
                <span className="font-medium whitespace-nowrap">{price ? `до ${formatRub(price)}` : 'оценка по фото'}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
