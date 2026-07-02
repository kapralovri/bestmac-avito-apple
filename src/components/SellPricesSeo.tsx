import Link from 'next/link';
import type { AvitoPricesData, AvitoPriceStat } from '@/types/avito-prices';

/**
 * Серверный SEO-блок страницы /sell: таблицы актуальных цен выкупа из
 * avito-prices.json (обновляются ежедневно). Рендерится при сборке — цены
 * попадают в HTML для поисковиков и AI-ассистентов (главный контент-актив:
 * таких ежедневных данных нет у конкурентов). Без "use client".
 */

const fmt = (n: number) => n.toLocaleString('ru-RU');

const fmtDate = (s?: string) => {
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' :
    d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
};

function topConfigs(stats: AvitoPriceStat[], families: string[], limit: number): AvitoPriceStat[] {
  return stats
    .filter((s) => families.includes(s.family || '') && s.median_price > 0 && s.buyout_price > 0
      && (s.samples_count || 0) >= 5 && s.ram > 0 && s.ssd > 0)
    .sort((a, b) => (b.samples_count || 0) - (a.samples_count || 0))
    .slice(0, limit);
}

function PriceTable({ title, rows }: { title: string; rows: AvitoPriceStat[] }) {
  if (!rows.length) return null;
  return (
    <div className="mb-10">
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium">Модель</th>
              <th className="px-4 py-3 font-medium">Конфигурация</th>
              <th className="px-4 py-3 font-medium">Рынок (медиана)</th>
              <th className="px-4 py-3 font-medium">Выкуп до</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => (
              <tr key={`${s.model_name}-${s.ram}-${s.ssd}-${i}`} className="border-t border-border">
                <td className="px-4 py-3">{s.model_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.ram} / {s.ssd} ГБ</td>
                <td className="px-4 py-3">{fmt(s.median_price)} ₽</td>
                <td className="px-4 py-3 font-semibold text-primary">{fmt(s.buyout_price)} ₽</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SellPricesSeo({ data }: { data: AvitoPricesData }) {
  const stats = data.stats || [];
  const macbooks = topConfigs(stats, ['MacBook Air', 'MacBook Pro', 'MacBook'], 12);
  const desktops = topConfigs(stats, ['Mac mini', 'iMac', 'Mac Studio'], 8);
  const updated = fmtDate(data.generated_at);
  const total = data.total_listings || 0;

  return (
    <section className="bg-background text-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Цены на выкуп MacBook сегодня</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {updated && <>Данные обновлены {updated}. </>}
            Расчёт по {total > 0 ? fmt(total) : '3 000+'} актуальным объявлениям Авито (Москва).
          </p>

          {/* Answer-first: самодостаточный цитируемый абзац */}
          <p className="mb-8 leading-relaxed">
            Сколько стоит продать MacBook в Москве? Мы платим до 80% от текущей рыночной
            медианы: например, за популярные конфигурации MacBook Air и MacBook Pro цены
            выкупа приведены в таблице ниже и пересчитываются каждый день по реальным
            объявлениям Авито — это не «цена до осмотра», а честный ориентир. Итоговая
            сумма зависит от состояния корпуса и экрана, ёмкости аккумулятора (количества
            циклов), комплекта (коробка, зарядка, чек) и отвязки от iCloud. Оценка в
            онлайн-калькуляторе выше занимает 30 секунд, выкуп при встрече в Москве —
            около 30 минут: диагностика при вас, деньги наличными или переводом сразу.
            Принимаем также технику с дефектами — разбитым экраном или изношенной
            батареей — с корректировкой цены.
          </p>

          <PriceTable title="MacBook Air и MacBook Pro — цены выкупа" rows={macbooks} />
          <PriceTable title="Mac mini, iMac и Mac Studio — цены выкупа" rows={desktops} />

          <h3 className="text-xl font-semibold mb-3">Выкуп по категориям</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-10 list-none">
            <li><Link className="text-primary hover:underline" href="/sell/macbook-air">Выкуп MacBook Air (M1–M4)</Link></li>
            <li><Link className="text-primary hover:underline" href="/sell/macbook-pro">Выкуп MacBook Pro (13–16″)</Link></li>
            <li><Link className="text-primary hover:underline" href="/sell/imac">Выкуп iMac</Link></li>
            <li><Link className="text-primary hover:underline" href="/sell/mac-mini">Выкуп Mac mini</Link></li>
            <li><Link className="text-primary hover:underline" href="/sell/broken">Выкуп неисправных MacBook</Link></li>
            <li><Link className="text-primary hover:underline" href="/moskva">Выезд по районам Москвы</Link></li>
          </ul>

          <h3 className="text-xl font-semibold mb-3">Как формируется цена выкупа</h3>
          <p className="mb-4 leading-relaxed text-muted-foreground">
            Каждый день наш парсер собирает цены реальных объявлений Авито по {fmt(206)}+
            конфигурациям Mac и вычисляет рыночную медиану — устойчивую к завышенным и
            «мусорным» ценам. Цена выкупа считается от этой медианы с учётом того, что мы
            берём на себя предпродажную подготовку, гарантию покупателю и риски: обычно
            это 75–80% рынка для техники в отличном состоянии. Поэтому наша оценка не
            меняется «после осмотра» на 30% — как это часто бывает в скупках: вы заранее
            видите и рынок, и нашу цену.
          </p>
          <p className="leading-relaxed text-muted-foreground">
            Полезное по теме: <Link className="text-primary hover:underline" href="/blog/kak-prodat-macbook-vygodno">как продать MacBook выгодно</Link>
            {' '}и <Link className="text-primary hover:underline" href="/blog/proverka-macbook-pered-pokupkoi">как проверить MacBook перед продажей</Link>.
          </p>
        </div>
      </div>
    </section>
  );
}
