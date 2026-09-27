import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import LeadForm from '@/components/LeadForm';
import AvitoReviews from '@/components/AvitoReviews';
import { loadAvitoPricesServer } from '@/lib/server-prices';
import { ALL_BUYOUT_MODELS, modelToSlug } from '@/lib/model-slugs';
import { getPriceModelSlugs } from '@/lib/price-pages';
import { officePriceRows, formatRub, configLabel } from '@/lib/sell-prices';
import { serviceSchema } from '@/lib/schema';
import {
  OFFICE_MODEL_SLUGS, BUSINESS_INTRO, BUSINESS_TERMS, BUSINESS_REASONS,
  BUSINESS_STEPS, BUSINESS_DOCS, BUSINESS_FAQ,
} from '@/data/business';

export const metadata: Metadata = {
  title: 'Б/у MacBook для компаний — безнал без НДС, договор, партии',
  description:
    'Б/у MacBook Air и Pro для офиса и команд: оплата на расчётный счёт, договор, счёт, акт и ТОРГ-12. '
    + 'Партии одинаковых конфигураций под заказ, проверка каждого Mac, Москва.',
  alternates: { canonical: '/business' },
};

function formatUpdated(updatedAt: string): string {
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(updatedAt);
  const d = new Date(iso ? `${iso[1]}T12:00:00` : updatedAt);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function BusinessPage() {
  const data = await loadAvitoPricesServer();
  const { rows, latestUpdate } = officePriceRows(data?.stats, ALL_BUYOUT_MODELS, OFFICE_MODEL_SLUGS, new Date());
  // Дата по-русски заканчивается на «г.» — вторую точку не ставим.
  const note = `Медиана объявлений на Авито в Москве${latestUpdate ? `, обновлено ${formatUpdated(latestUpdate)}` : ''}`;
  const sourceNote = note.endsWith('.') ? note : `${note}.`;
  const cenySlugs = await getPriceModelSlugs();
  const cenyHref = (names: string[]) => {
    const s = names.length === 1 ? modelToSlug(names[0]) : '';
    return s && cenySlugs.includes(s) ? `/ceny/${s}` : null;
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: BUSINESS_FAQ.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
  const service = serviceSchema({
    name: 'Продажа б/у MacBook компаниям',
    description: 'Б/у MacBook для компаний: безнал без НДС, договор, счёт, акт и ТОРГ-12, партии под заказ',
    url: 'https://bestmac.ru/business',
  });

  return (
    <main className="container mx-auto px-4 py-10 md:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(service) }} />
      <div className="max-w-4xl mx-auto">
        <Breadcrumbs items={[
          { name: 'Главная', url: '/' },
          { name: 'Для бизнеса', url: '/business' },
        ]} />

        <h1 className="text-3xl md:text-5xl font-bold mb-4">Б/у MacBook для компаний и команд</h1>
        <p className="text-lg text-muted-foreground mb-6">{BUSINESS_INTRO}</p>
        <ul className="grid sm:grid-cols-2 gap-3 mb-6">
          {BUSINESS_TERMS.map((t) => (
            <li key={t} className="bg-card border border-border/60 rounded-xl p-4 font-medium">{t}</li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-4 mb-12">
          <a href="#zayavka" className="inline-flex items-center rounded-lg bg-primary px-5 py-3 text-primary-foreground font-semibold">
            Отправить запрос
          </a>
          <a
            href="https://t.me/romanmanro"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg border border-border px-5 py-3 font-semibold"
          >
            Написать в Telegram
          </a>
        </div>

        {rows.length > 0 && (
          <section className="mb-12" id="ceny">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Сколько стоят б/у MacBook для офиса</h2>
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    <th className="p-3 font-semibold">Модель</th>
                    <th className="p-3 font-semibold">Типичная конфигурация</th>
                    <th className="p-3 font-semibold">Цена на рынке</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const href = cenyHref(r.sourceModelNames);
                    return (
                      <tr key={r.slug} className="border-t border-border/60">
                        <th className="p-3 text-left font-medium">
                          {href ? <Link href={href} className="text-primary underline">{r.name}</Link> : r.name}
                        </th>
                        <td className="p-3 text-muted-foreground">{configLabel(r.config)}</td>
                        <td className="p-3 font-semibold">≈ {formatRub(r.config.medianPrice)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              {sourceNote}{' '}
              Цену партии назовём в КП: она зависит от состояния, комплектации и количества.
            </p>
          </section>
        )}

        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Почему компании берут б/у Mac</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {BUSINESS_REASONS.map((r) => (
              <div key={r.title} className="bg-card border border-border/60 rounded-xl p-5">
                <h3 className="font-semibold mb-2">{r.title}</h3>
                <p className="text-sm text-muted-foreground">{r.text}</p>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mt-4">
            Старые Mac сотрудников можно{' '}
            <Link href="/trade-in" className="text-primary underline">сдать в трейд-ин</Link>{' '}
            в зачёт других Mac.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Как проходит закупка</h2>
          <ol className="grid md:grid-cols-5 gap-4">
            {BUSINESS_STEPS.map((s, i) => (
              <li key={s.title} className="bg-card border border-border/60 rounded-xl p-4">
                <div className="text-primary font-bold mb-2">Шаг {i + 1}</div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Документы и оплата</h2>
          <p className="text-muted-foreground leading-relaxed">{BUSINESS_DOCS}</p>
        </section>

        <Link href="/vykup/dlya-yurlits" className="block mb-12 bg-card border border-primary/40 hover:border-primary rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-1">Продаёте старый парк при обновлении?</h2>
          <p className="text-muted-foreground text-sm">Выкупим от 3 устройств: безнал и документы для списания →</p>
        </Link>

        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Частые вопросы компаний</h2>
          <div className="space-y-4">
            {BUSINESS_FAQ.map((f) => (
              <div key={f.question} className="bg-card border border-border/60 rounded-xl p-5">
                <h3 className="font-semibold mb-2">{f.question}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {f.answer}
                  {f.href && <> <Link href={f.href} className="text-primary underline">{f.linkText}</Link></>}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <AvitoReviews limit={3} />

      <div className="max-w-3xl mx-auto" id="zayavka">
        <LeadForm
          formType="buy"
          title="Запрос на б/у MacBook для компании"
          subtitle="Напишите, сколько Mac нужно и для каких задач, — пришлём КП"
        />
      </div>
    </main>
  );
}
