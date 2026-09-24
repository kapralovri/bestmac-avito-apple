import Link from 'next/link';
import { loadAvitoPricesServer } from '@/lib/server-prices';
import { ALL_BUYOUT_MODELS, modelShortName } from '@/lib/model-slugs';
import { modelPriceSummaries, formatRub } from '@/lib/sell-prices';

/**
 * «Сколько мы платим сейчас» — серверный блок для посадочных /vykup/*.
 * Таблица цен ниже на этих страницах клиентская, и поисковик видел лендинг
 * выкупа без цифр. Здесь — «до X ₽» по моделям с надёжными ценами (правило
 * GST-78) и ссылки на страницы моделей.
 */
export default async function PopularBuyoutPrices(
  { slugs, allLink = false }: { slugs?: string[]; allLink?: boolean } = {},
) {
  const data = await loadAvitoPricesServer();
  // slugs — подмножество моделей (главная показывает только популярные).
  const catalog = slugs ? ALL_BUYOUT_MODELS.filter((m) => slugs.includes(m.slug)) : ALL_BUYOUT_MODELS;
  const rows = modelPriceSummaries(data?.stats, catalog, new Date());
  if (!rows.length) return null;
  return (
    <section className="mb-12" id="skolko-platim">
      <h2 className="text-2xl md:text-3xl font-bold mb-2">Сколько мы платим сейчас</h2>
      <p className="text-muted-foreground mb-6">
        Цена выкупа за самую дорогую конфигурацию модели, по которой у нас надёжные данные: свежие
        объявления Авито или наши сделки. Точную сумму за ваш Mac назовём по фото за 15 минут.
      </p>
      <div className="grid sm:grid-cols-2 gap-x-8">
        {rows.map((r) => (
          <Link
            key={r.slug}
            href={`/sell/${r.slug}`}
            className="flex items-center justify-between border-b border-border/60 py-2 hover:text-primary"
          >
            <span>{modelShortName(r.name)}</span>
            <span className="font-medium whitespace-nowrap">до {formatRub(r.maxBuyout)}</span>
          </Link>
        ))}
      </div>
      {allLink && (
        <p className="text-center mt-6">
          <Link href="/sell" className="text-primary underline">Все модели и калькулятор выкупа →</Link>
        </p>
      )}
    </section>
  );
}
