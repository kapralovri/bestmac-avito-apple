"use client";

import Breadcrumbs from "@/components/Breadcrumbs";
import LeadForm from "@/components/LeadForm";
import PhotoEstimate from "@/components/PhotoEstimate";
import BuyoutTable from "@/components/BuyoutTable";
import { Button } from "@/components/ui/button";
import { generateLocalBusinessSchema } from "@/lib/structured-data";
import type { VykupLandingConfig } from "@/data/vykup-landings";
import {
  Truck, Camera, Banknote, FileText, Droplets, Power, Lock, Building2,
  KeyRound, ShieldCheck, Zap, Clock, Wrench, Cpu, DollarSign,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Truck, Camera, Banknote, FileText, Droplets, Power, Lock, Building2,
  KeyRound, ShieldCheck, Zap, Clock, Wrench, Cpu, DollarSign,
};

const VykupLanding = ({ landing }: { landing: VykupLandingConfig }) => {
  const breadcrumbItems = [
    { name: "Главная", url: "/" },
    { name: "Продать", url: "/sell" },
    { name: landing.nav, url: `/vykup/${landing.slug}` },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: landing.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const localBusinessSchema = generateLocalBusinessSchema();

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={breadcrumbItems} />

        <h1 className="text-4xl md:text-5xl font-bold mb-6">{landing.h1}</h1>

        {/* Фичи */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
          {landing.features.map((f, i) => {
            const Icon = ICONS[f.icon] || ShieldCheck;
            return (
              <div key={i} className="flex flex-col items-center text-center p-4 bg-card rounded-lg border">
                <Icon className="w-8 h-8 text-primary mb-2" />
                <p className="font-semibold">{f.title}</p>
                <p className="text-sm text-muted-foreground">{f.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Вступление */}
        <div className="prose max-w-none mb-10">
          {landing.intro.split("\n\n").map((p, i) => (
            <p key={i} className="text-lg text-muted-foreground mb-4">{p}</p>
          ))}
        </div>

        {/* Виджет AI-оценки по фото */}
        {landing.showPhoto && (
          <section className="mb-12 max-w-3xl">
            <PhotoEstimate />
          </section>
        )}

        {/* Контентные секции */}
        <div className="prose max-w-none mb-12 space-y-8">
          {landing.sections.map((s, i) => (
            <div key={i}>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">{s.h}</h2>
              {s.p && <p className="text-muted-foreground mb-4">{s.p}</p>}
              {s.bullets && (
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  {s.bullets.map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              )}
            </div>
          ))}

          {landing.priceExamples && landing.priceExamples.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
              <p className="font-semibold mb-2">💡 Примерные цены</p>
              <ul className="text-sm space-y-1">
                {landing.priceExamples.map((p, i) => (
                  <li key={i}>• {p.label} — {p.price}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-2">*Цены ориентировочные, зависят от конфигурации и состояния</p>
            </div>
          )}
        </div>

        {/* Таблица цен */}
        {landing.showTable && (
          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-center">Актуальные цены выкупа MacBook</h2>
            <BuyoutTable />
          </section>
        )}

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6">Частые вопросы</h2>
          <div className="space-y-4">
            {landing.faq.map((f, i) => (
              <div key={i} className="border border-border rounded-lg p-4">
                <p className="font-semibold mb-2">{f.q}</p>
                <p className="text-sm text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mb-12">
          <div className="bg-gradient-primary rounded-lg p-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-4">{landing.cta.title}</h2>
            <p className="mb-6">{landing.cta.sub}</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button asChild size="lg" variant="secondary">
                <a href="https://t.me/romanmanro" target="_blank" rel="noopener noreferrer">Написать в Telegram</a>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-white text-primary hover:bg-white/90">
                <a href="tel:+79032990029">Позвонить сейчас</a>
              </Button>
            </div>
          </div>
        </section>

        {/* Форма */}
        <section>
          <LeadForm
            title="Оставьте заявку на выкуп"
            subtitle="Опишите устройство — назовём точную цену и согласуем встречу"
            formType="sell"
          />
        </section>
      </main>
    </div>
  );
};

export default VykupLanding;
