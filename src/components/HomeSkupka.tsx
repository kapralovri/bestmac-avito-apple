import Link from 'next/link';
import { HOME_SKUPKA } from '@/data/home-skupka';

/** Главная: «Скупка макбуков в Москве» — серверный текст под запрос «скупка макбуков». */
export default function HomeSkupka() {
  const s = HOME_SKUPKA;
  return (
    <section className="apple-section" id="skupka">
      <div className="apple-container max-w-4xl">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">{s.title}</h2>
        <p className="text-lg text-muted-foreground mb-8">{s.intro}</p>
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {s.ways.map((w) => (
            <div key={w.title} className="bg-card border border-border/60 rounded-xl p-5">
              <h3 className="font-semibold mb-2">{w.title}</h3>
              <p className="text-sm text-muted-foreground">{w.text}</p>
            </div>
          ))}
        </div>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground mb-6">
          {s.terms.map((t) => <li key={t}>{t}</li>)}
        </ul>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {s.links.map((l) => (
            <Link key={l.href} href={l.href} className="text-primary underline">{l.text}</Link>
          ))}
        </div>
      </div>
    </section>
  );
}
