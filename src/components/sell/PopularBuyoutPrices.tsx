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
const DEFAULT_INTRO =
  'Цена выкупа за самую дорогую конфигурацию модели, по которой у нас надёжные данные: свежие '
  + 'объявления Авито или наши сделки. Точную сумму за ваш Mac назовём по фото за 15 минут.';

export default async function PopularBuyoutPrices(
  { slugs, allLink = false, title = 'Сколько мы платим сейчас', intro = DEFAULT_INTRO }:
  { slugs?: string[]; allLink?: boolean; title?: string; intro?: string } = {},
) {
  const data = await loadAvitoPricesServer();
  // slugs — подмножество моделей (главная показывает только популярные).
  const catalog = slugs ? ALL_BUYOUT_MODELS.filter((m) => slugs.includes(m.slug)) : ALL_BUYOUT_MODELS;
  const rows = modelPriceSummaries(data?.stats, catalog, new Date());
  if (!rows.length) return null;
  return (
    // data-shared-block: общий блок нескольких страниц — проверка уникальности (GST-81) его не считает
    <section className="mb-12" id="skolko-platim" data-shared-block="prices">
      <h2 className="text-2xl md:text-3xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground mb-6">{intro}</p>
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
