import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import PopularBuyoutPrices from '@/components/sell/PopularBuyoutPrices';
import { POPULAR_MODELS } from '@/lib/model-slugs';
import { APGREID_FACTS, apgreidFaq } from '@/data/apgreid';
import { TRADE_IN_BONUS_PERCENT, tradeInBonusText } from '@/data/trade-in';

const TITLE = 'Апгрейд макбука: можно ли увеличить память и SSD на MacBook Air и Pro';
const DESCRIPTION =
  'Что можно заменить в макбуке на M1–M5 и Intel: оперативная память, SSD, аккумулятор. '
  + 'Почему MacBook на M-чипах не апгрейдятся и что делать, если не хватает памяти.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/blog/macbook-apgreid' },
};

// Google: ~1 000 показов за 3 месяца по «апгрейд макбука / macbook pro / эйр»,
// 13–22 место. Статья честно отвечает «нет» для M-чипов и ведёт в трейд-ин.
export default function MacbookApgreidPage() {
  const bonus = tradeInBonusText(TRADE_IN_BONUS_PERCENT);
  const faq = apgreidFaq(bonus);
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: TITLE,
        description: DESCRIPTION,
        image: 'https://bestmac.ru/og-image.jpg',
        datePublished: '2025-08-12',
        dateModified: '2026-10-09',
        author: { '@type': 'Person', name: 'Роман Капралов' },
        publisher: { '@type': 'Organization', name: 'BestMac', logo: { '@type': 'ImageObject', url: 'https://bestmac.ru/favicon.png' } },
        mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://bestmac.ru/blog/macbook-apgreid' },
      },
      {
        '@type': 'FAQPage',
        mainEntity: faq.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      },
    ],
  };

  return (
    <main className="container mx-auto px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <Breadcrumbs items={[
        { name: 'Главная', url: '/' },
        { name: 'Блог', url: '/blog' },
        { name: 'Апгрейд макбука', url: '/blog/macbook-apgreid' },
      ]} />

      <article className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-6">Апгрейд макбука: что можно заменить в MacBook Air и Pro</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Короткий ответ: MacBook на чипах M1–M5 не апгрейдятся — ни память, ни SSD штатно не меняются.
          У старых Intel-моделей кое-что заменить можно, но всё меньше с каждым годом. Разбираем по
          деталям и что делать, если Mac перестал справляться.
        </p>

        <section className="mb-10 bg-muted p-6 rounded-xl">
          <h2 className="text-2xl font-semibold mb-3">Главное про MacBook на M-чипах</h2>
          <p className="mb-3">
            Оперативная память у Apple Silicon находится в одном корпусе с чипом, а SSD распаян на
            плате. Поэтому конфигурацию, выбранную при покупке, потом не увеличить: 8 ГБ памяти
            останутся 8 ГБ, а 256 ГБ диска — 256 ГБ.
          </p>
          <p>
            Покупаете Mac на несколько лет — берите память и диск с запасом. А если уже не хватает,
            выход один: сменить Mac на конфигурацию побольше.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">Что можно заменить: M-чипы и Intel</h2>
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="p-3 font-semibold">Деталь</th>
                  <th className="p-3 font-semibold">MacBook на M1–M5</th>
                  <th className="p-3 font-semibold">MacBook на Intel</th>
                </tr>
              </thead>
              <tbody>
                {APGREID_FACTS.map((f) => (
                  <tr key={f.part} className="border-t border-border/60 align-top">
                    <th className="p-3 text-left font-medium">{f.part}</th>
                    <td className="p-3 text-muted-foreground">{f.appleSilicon}</td>
                    <td className="p-3 text-muted-foreground">{f.intel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">Не хватает места: что делать без апгрейда</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Внешний SSD.</strong> Через USB-C или Thunderbolt скорость близка к встроенному диску — подойдёт для фото, видео и архивов.</li>
            <li><strong>iCloud Drive с оптимизацией хранилища.</strong> macOS сама держит в облаке редко используемые файлы.</li>
            <li><strong>Чистка.</strong> «Системные настройки → Основные → Хранилище» показывает, что занимает место: старые резервные копии iPhone, кэш, загрузки.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">Не хватает памяти: признаки, что пора менять Mac</h2>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>«Мониторинг системы» → «Память» показывает жёлтое или красное давление памяти при обычной работе.</li>
            <li>Переключение между программами и вкладками заметно тормозит.</li>
            <li>Растёт «Использовано подкачки» — Mac пишет память на диск.</li>
          </ul>
          <p>
            На M-чипе это не лечится апгрейдом. Выгоднее сдать Mac и взять модель с 16 ГБ памяти и
            больше — например, через{' '}
            <Link href="/trade-in" className="text-primary underline">трейд-ин</Link>: при зачёте {bonus}.
          </p>
        </section>

        <PopularBuyoutPrices
          slugs={POPULAR_MODELS.map((m) => m.slug)}
          allLink
          title="Сколько стоит ваш MacBook, если менять его на новый"
          intro={`Цена выкупа за самую дорогую конфигурацию модели по свежим данным рынка. При трейд-ине ${bonus}.`}
        />

        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-6">Частые вопросы об апгрейде макбука</h2>
          <div className="space-y-4">
            {faq.map((f) => (
              <div key={f.question} className="bg-card border border-border/60 rounded-xl p-5">
                <h3 className="font-semibold mb-2">{f.question}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-primary/10 p-6 rounded-xl border-l-4 border-primary">
          <h2 className="text-2xl font-semibold mb-3">Сменить Mac вместо апгрейда</h2>
          <p className="mb-4">
            Выкупим ваш MacBook или возьмём его в зачёт другого — б/у из наличия или нового под заказ.
            Оценка по фото за 15 минут.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/trade-in" className="inline-flex rounded-lg bg-primary text-primary-foreground font-semibold px-6 py-3">Трейд-ин</Link>
            <Link href="/sell" className="inline-flex rounded-lg border border-primary text-primary font-semibold px-6 py-3">Узнать цену выкупа</Link>
            <Link href="/buy" className="inline-flex rounded-lg border border-primary text-primary font-semibold px-6 py-3">Б/у MacBook в наличии</Link>
          </div>
        </section>
      </article>
    </main>
  );
}
