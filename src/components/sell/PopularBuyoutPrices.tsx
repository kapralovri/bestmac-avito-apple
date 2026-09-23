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
export default async function PopularBuyoutPrices() {
  const data = await loadAvitoPricesServer();
  const rows = modelPriceSummaries(data?.stats, ALL_BUYOUT_MODELS, new Date());
  if (!rows.length) return null;
  return (
    <section className="mb-12" id="skolko-platim">
      <h2 className="text-2xl md:text-3xl font-bold mb-2">Сколько мы платим сейчас</h2>
      <p className="text-muted-foreground mb-6">
        Цена выкупа за лучшую конфигурацию модели — по свежим объявлениям Авито за последние 30 дней.
        Точную сумму за ваш Mac назовём по фото за 15 минут.
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
    </section>
  );
}
