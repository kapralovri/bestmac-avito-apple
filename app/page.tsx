import type { Metadata } from 'next';
import Hero from "@/components/Hero";
import AboutSection from "@/components/AboutSection";
import ContactSection from "@/components/ContactSection";
import OffersSection from "@/components/OffersSection";
import Reviews from "@/components/Reviews";
import FAQ from "@/components/FAQ";
import BlogPreview from "@/components/BlogPreview";
import SEOContent from "@/components/SEOContent";
import LeadForm from "@/components/LeadForm";
import { faqData } from "@/lib/schema";
import PopularBuyoutPrices from "@/components/sell/PopularBuyoutPrices";
import { POPULAR_MODELS } from "@/lib/model-slugs";

export const metadata: Metadata = {
  title: { absolute: 'BestMac — Честный выкуп и продажа MacBook в Москве с гарантией' },
  description: 'Купить или продать MacBook б/у в Москве с гарантией 1 месяц. Официальная скупка MacBook, iMac, iPhone через ИП. Дорогомилово, Киевская, ЦАО. Онлайн-калькулятор оценки, выезд на дом.',
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Hero />
      <AboutSection />
      <OffersSection />

      {/* Цены выкупа популярных моделей в HTML главной — главная точка входа
          на сайт, а на страницы моделей с ценами с неё не вела ни одна ссылка. */}
      <section className="apple-section">
        <div className="apple-container max-w-4xl">
          <PopularBuyoutPrices slugs={POPULAR_MODELS.map((m) => m.slug)} />
          <p className="text-center">
            <a href="/sell" className="text-primary underline">Все модели и калькулятор выкупа →</a>
          </p>
        </div>
      </section>
      <Reviews />
      <SEOContent />

      <section className="apple-section bg-card/30">
        <div className="apple-container">
          <LeadForm
            title="Получите бесплатную консультацию"
            subtitle="Ответим на все вопросы о покупке или продаже MacBook"
            formType="general"
          />
        </div>
      </section>

      <BlogPreview />
      <FAQ items={faqData.home} />
      <ContactSection />
    </div>
  );
}
