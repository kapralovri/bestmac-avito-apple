import Breadcrumbs from '@/components/Breadcrumbs';
import PhotoEstimate from '@/components/PhotoEstimate';
import LeadForm from '@/components/LeadForm';
import AvitoReviews from '@/components/AvitoReviews';
import PopularBuyoutPrices from '@/components/sell/PopularBuyoutPrices';
import Link from 'next/link';
import { POPULAR_MODELS } from '@/lib/model-slugs';
import { BROKEN_SECTIONS, BROKEN_PRICING, BROKEN_FAQ } from '@/data/broken-hub';

/**
 * /sell/broken — серверный хаб «сломанный макбук» (GST-81). Раньше страница была
 * клиентской, ~2,5 тыс. знаков, и текст почти не попадал в HTML.
 */
export default function SellBrokenHub() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: BROKEN_FAQ.map((f) => ({
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
          { name: 'Сломанный макбук', url: '/sell/broken' },
        ]} />

        <h1 className="text-3xl md:text-5xl font-bold mb-4">Сломался MacBook? Мы купим его сегодня.</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Разбили экран, залили, перестал включаться или заблокирован iCloud — выкупаем макбуки
          в любом состоянии. Пришлите фото — назовём цену за 15 минут. Деньги сразу после проверки:
          наличными или переводом.
        </p>
        <p className="mb-10">
          <a href="https://t.me/romanmanro" target="_blank" rel="noopener noreferrer"
             className="inline-block rounded-xl bg-primary text-primary-foreground px-6 py-3 font-semibold">
            Отправить фото в Telegram
          </a>
        </p>

        <section className="mb-12">
          <PhotoEstimate />
        </section>

        {BROKEN_SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">{s.title}</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">{s.text}</p>
            {s.link && <Link href={s.link.href} className="text-primary underline">{s.link.label}</Link>}
          </section>
        ))}

        <section className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Как мы считаем цену сломанного MacBook</h2>
          <p className="text-muted-foreground leading-relaxed">{BROKEN_PRICING}</p>
        </section>

        <PopularBuyoutPrices
          slugs={POPULAR_MODELS.map((m) => m.slug)}
          title="Цены исправных Mac — от них считаем сломанный"
          intro="Цена выкупа исправного Mac за самую дорогую конфигурацию модели. Для сломанного вычитаем стоимость ремонта — точную сумму назовём по фото."
        />

        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Частые вопросы о продаже сломанного макбука</h2>
          <div className="space-y-4">
            {BROKEN_FAQ.map((f) => (
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
        <LeadForm formType="sell" title="Оценка сломанного Mac" subtitle="Опишите поломку и пришлите фото — назовём цену за 15 минут" />
      </div>
    </main>
  );
}
