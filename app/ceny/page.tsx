import type { Metadata } from 'next';
import Link from 'next/link';
import {
  getAllModelPrices,
  groupByFamily,
  formatRub,
  getPricesGeneratedAt,
} from '@/lib/price-pages';
import { generateBreadcrumbSchema } from '@/lib/structured-data';

export const metadata: Metadata = {
  title: 'Цены на технику Apple б/у в Москве — индекс цен MacBook, iMac, Mac',
  description:
    'Актуальные цены на б/у MacBook Air, MacBook Pro, iMac, Mac mini и Mac Studio в Москве. Индекс рыночных цен по данным Авито, обновляется ежедневно.',
  alternates: { canonical: '/ceny' },
};

// Форматирует дату снимка цен в человекочитаемый вид (без времени).
function humanDate(raw?: string): string {
  if (!raw) return '';
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return raw.split(' ')[0] ?? '';
  return new Date(t).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function PriceIndexPage() {
  const models = await getAllModelPrices();
  const groups = groupByFamily(models);
  const generatedAt = await getPricesGeneratedAt();
  const updated = humanDate(generatedAt);

  const breadcrumb = generateBreadcrumbSchema([
    { name: 'Главная', url: '/' },
    { name: 'Цены на технику Apple', url: '/ceny' },
  ]);

  // ItemList из всех моделей — машиночитаемый индекс цен для AI-поиска и Яндекса.
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Цены на технику Apple б/у в Москве',
    numberOfItems: models.length,
    itemListElement: models.map((m, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `${m.displayName} б/у`,
      url: `https://bestmac.ru/ceny/${m.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': [breadcrumb, itemList] }),
        }}
      />

      <main className="container mx-auto px-4 py-10 md:py-14">
        <div className="max-w-4xl mx-auto">
          <nav aria-label="Хлебные крошки" className="text-sm text-muted-foreground mb-6">
            <Link href="/" className="hover:underline">Главная</Link>
            <span className="mx-2">/</span>
            <span>Цены</span>
          </nav>

          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Цены на технику Apple б/у в Москве
          </h1>

          <p className="text-muted-foreground leading-relaxed mb-2 max-w-3xl">
            Индекс актуальных рыночных цен на подержанные MacBook Air, MacBook Pro, iMac,
            Mac mini и Mac Studio. Цены рассчитаны по объявлениям Авито в Москве:
            минимальная, медианная и максимальная стоимость по каждой модели.
            Выберите модель, чтобы увидеть цену по конфигурациям (процессор, память, накопитель).
          </p>
          {updated && (
            <p className="text-sm text-muted-foreground mb-8">
              Обновлено: <time dateTime={generatedAt}>{updated}</time> · данные обновляются ежедневно
            </p>
          )}

          {groups.map(({ family, models: familyModels }) => (
            <section key={family} className="mb-10">
              <h2 className="text-2xl font-bold mb-4">{family} б/у — цены</h2>
              <div className="overflow-x-auto rounded-xl border border-border/60">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left">
                      <th className="px-4 py-3 font-semibold">Модель</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Цена от</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Медиана</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">До</th>
                      <th className="px-4 py-3 font-semibold" />
                    </tr>
                  </thead>
                  <tbody>
                    {familyModels.map((m) => (
                      <tr key={m.slug} className="border-t border-border/60 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">
                          <Link href={`/ceny/${m.slug}`} className="hover:underline">
                            {m.displayName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatRub(m.minPrice)}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-semibold">{formatRub(m.medianPrice)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatRub(m.maxPrice)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <Link href={`/ceny/${m.slug}`} className="text-primary hover:underline">
                            Подробнее →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}

          <section className="mt-12 bg-card border border-border/60 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-3">Как формируются цены</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Мы ежедневно анализируем тысячи объявлений о продаже техники Apple на Авито в Москве.
              Для каждой модели и конфигурации считаем минимальную (P10), медианную и максимальную (P90)
              цену. Это честный рыночный ориентир: за столько реально покупают и продают б/у Mac в Москве.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Хотите продать свой Mac? BestMac выкупает технику Apple с выплатой сразу —{' '}
              <Link href="/sell" className="text-primary hover:underline">оцените стоимость выкупа</Link>.
              Ищете, что купить? Смотрите{' '}
              <Link href="/buy" className="text-primary hover:underline">каталог MacBook б/у с гарантией</Link>.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
