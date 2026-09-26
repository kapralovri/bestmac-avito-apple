import Link from 'next/link';
import type { ReactNode } from 'react';
import Breadcrumbs from '@/components/Breadcrumbs';
import { ARTICLES, type Article, type ArticleBlock } from '@/data/articles';

/**
 * Серверный шаблон статей блога пачки 3 (GST-81): весь текст — в HTML,
 * разметка Article и FAQPage строится из тех же данных, что и видимый текст.
 */

// Ссылки в тексте статьи записаны как [текст](/путь)
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const [, label, href] = m;
    out.push(href.startsWith('/')
      ? <Link key={m.index} href={href} className="text-primary underline">{label}</Link>
      : <a key={m.index} href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">{label}</a>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Block({ b }: { b: ArticleBlock }) {
  switch (b.type) {
    case 'p':
      return <p className="mb-4 leading-relaxed">{inline(b.text)}</p>;
    case 'note':
      return <p className="mb-4 leading-relaxed bg-muted/40 border border-border/60 rounded-xl p-4">{inline(b.text)}</p>;
    case 'steps':
      return <ol className="list-decimal pl-6 mb-4 space-y-2">{b.items.map((i) => <li key={i}>{inline(i)}</li>)}</ol>;
    case 'list':
      return <ul className="list-disc pl-6 mb-4 space-y-2">{b.items.map((i) => <li key={i}>{inline(i)}</li>)}</ul>;
    case 'table':
      return (
        <div className="overflow-x-auto rounded-xl border border-border/60 mb-4">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/50 text-left">{b.head.map((h) => <th key={h} className="p-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {b.rows.map((r) => (
                <tr key={r.join('|')} className="border-t border-border/60">
                  {r.map((c, i) => <td key={i} className="p-3">{inline(c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

const plain = (s: string) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

export default function ArticlePage({ article }: { article: Article }) {
  const url = `https://bestmac.ru/blog/${article.slug}`;
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: article.h1,
        description: article.description,
        datePublished: article.published,
        dateModified: article.published,
        image: 'https://bestmac.ru/og-image.jpg',
        author: { '@type': 'Organization', name: 'BestMac' },
        publisher: { '@type': 'Organization', name: 'BestMac' },
        mainEntityOfPage: url,
      },
      {
        '@type': 'FAQPage',
        mainEntity: article.faq.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: plain(f.answer) },
        })),
      },
    ],
  };
  const related = ARTICLES.filter((a) => a.slug !== article.slug);

  return (
    <main className="container mx-auto px-4 py-10 md:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <article className="max-w-3xl mx-auto">
        <Breadcrumbs items={[
          { name: 'Главная', url: '/' },
          { name: 'Блог', url: '/blog' },
          { name: article.category, url: `/blog/${article.slug}` },
        ]} />
        <h1 className="text-3xl md:text-4xl font-bold mb-3">{article.h1}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {article.category} · <time dateTime={article.published}>{new Date(`${article.published}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</time> · {article.readTime}
        </p>
        <p className="text-lg leading-relaxed mb-8">{inline(article.lead)}</p>

        <nav aria-label="Содержание" className="bg-card border border-border/60 rounded-xl p-5 mb-10">
          <h2 className="font-semibold mb-3">Содержание</h2>
          <ol className="list-decimal pl-6 space-y-1">
            {article.sections.map((s) => <li key={s.id}><a href={`#${s.id}`} className="text-primary hover:underline">{s.title}</a></li>)}
          </ol>
        </nav>

        {article.sections.map((s) => (
          <section key={s.id} id={s.id} className="mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">{s.title}</h2>
            {s.blocks.map((b, i) => <Block key={i} b={b} />)}
          </section>
        ))}

        <section className="mb-10 bg-primary/5 border-2 border-primary/20 rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-2">{article.cta.title}</h2>
          <p className="leading-relaxed">{inline(article.cta.text)}</p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Частые вопросы</h2>
          <div className="space-y-4">
            {article.faq.map((f) => (
              <div key={f.question} className="bg-card border border-border/60 rounded-xl p-5">
                <h3 className="font-semibold mb-2">{f.question}</h3>
                <p className="text-muted-foreground leading-relaxed">{inline(f.answer)}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">Читайте также</h2>
          <ul className="space-y-2">
            {related.map((a) => <li key={a.slug}><Link href={`/blog/${a.slug}`} className="text-primary hover:underline">{a.h1}</Link></li>)}
            <li><Link href="/blog/kak-prodat-macbook-vygodno" className="text-primary hover:underline">Как продать MacBook выгодно</Link></li>
          </ul>
        </section>
      </article>
    </main>
  );
}
