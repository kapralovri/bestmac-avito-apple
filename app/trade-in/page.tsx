import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import LeadForm from '@/components/LeadForm';
import AvitoReviews from '@/components/AvitoReviews';
import PopularBuyoutPrices from '@/components/sell/PopularBuyoutPrices';
import { POPULAR_MODELS } from '@/lib/model-slugs';
import {
  TRADE_IN_BONUS_PERCENT, tradeInBonusText, tradeInFaq,
  TRADE_IN_STEPS, TRADE_IN_OPTIONS, TRADE_IN_COMPARISON,
} from '@/data/trade-in';

export const metadata: Metadata = {
  title: 'Трейд-ин макбука в Москве — сдать MacBook в зачёт нового или б/у',
  description:
    'Трейд-ин MacBook, iMac и Mac mini в Москве: сдайте старый макбук в зачёт б/у Mac из наличия или нового под заказ. Доплачиваем к цене выкупа, одна встреча, договор.',
  alternates: { canonical: '/trade-in' },
};

// GST-81: ~200 запросов в месяц по Москве («трейд ин макбук», «сдать макбук в трейд ин»).
export default function TradeInPage() {
  const bonus = tradeInBonusText(TRADE_IN_BONUS_PERCENT);
  const faq = tradeInFaq(TRADE_IN_BONUS_PERCENT);
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };

  return (
    <main className="container mx-auto px-4 py-10 md:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div className="max-w-4xl mx-auto">
        <Breadcrumbs items={[
          { name: 'Главная', url: '/' },
          { name: 'Выкуп', url: '/sell' },
          { name: 'Трейд-ин', url: '/trade-in' },
        ]} />

        <h1 className="text-3xl md:text-5xl font-bold mb-4">Трейд-ин макбука: сдайте старый MacBook в зачёт другого</h1>
        <p className="text-lg text-muted-foreground mb-10">
          Меняете Mac на более новый? Сдайте старый нам в зачёт: {bonus}. Всё решаем на одной
          встрече у м. Киевская или с выездом по Москве: проверяем старый Mac, засчитываем его
          и оформляем покупку.
        </p>

        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Как проходит трейд-ин</h2>
          <ol className="grid md:grid-cols-3 gap-4">
            {TRADE_IN_STEPS.map((s, i) => (
              <li key={s.title} className="bg-card border border-border/60 rounded-xl p-5">
                <div className="text-primary font-bold mb-2">Шаг {i + 1}</div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Что можно взять в зачёт старого Mac</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {TRADE_IN_OPTIONS.map((o) => (
              <div key={o.title} className="bg-card border border-border/60 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-2">{o.title}</h3>
                <p className="text-muted-foreground mb-4">{o.text}</p>
                {o.external ? (
                  <a href={o.href} target="_blank" rel="noopener noreferrer" className="text-primary underline">{o.cta}</a>
                ) : (
                  <Link href={o.href} className="text-primary underline">{o.cta}</Link>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Почему трейд-ин удобнее, чем продавать самому</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>При зачёте {bonus}.</li>
            <li>Одна встреча вместо двух сделок: не нужно сначала продавать старый MacBook, а потом искать новый.</li>
            <li>Не нужно выставлять объявление на Авито, торговаться и встречаться с незнакомыми покупателями.</li>
            <li>Официальных магазинов Apple в России нет, программы Apple Trade In тоже — зачёт старого Mac остаётся за независимыми продавцами.</li>
          </ul>
        </section>

        <PopularBuyoutPrices
          slugs={POPULAR_MODELS.map((m) => m.slug)}
          allLink
          title="Сколько стоит ваш старый Mac сейчас"
          intro={`Цена выкупа за самую дорогую конфигурацию модели по свежим данным рынка. При трейд-ине ${bonus}.`}
        />

        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Трейд-ин, продажа на Авито или скупка</h2>
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="p-3" />
                  {TRADE_IN_COMPARISON.columns.map((c) => <th key={c} className="p-3 font-semibold">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {TRADE_IN_COMPARISON.rows.map((r) => (
                  <tr key={r.label} className="border-t border-border/60">
                    <th className="p-3 text-left font-medium">{r.label}</th>
                    {r.cells.map((c, i) => <td key={i} className="p-3 text-muted-foreground">{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Частые вопросы о трейд-ине</h2>
          <div className="space-y-4">
            {faq.map((f) => (
              <div key={f.question} className="bg-card border border-border/60 rounded-xl p-5">
                <h3 className="font-semibold mb-2">{f.question}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <AvitoReviews limit={3} />

      <div className="max-w-3xl mx-auto">
        <LeadForm
          formType="sell"
          title="Заявка на трейд-ин"
          subtitle="Напишите, какой Mac сдаёте и какой хотите взять, — посчитаем доплату"
        />
      </div>
    </main>
  );
}
