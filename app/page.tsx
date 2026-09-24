import type { Metadata } from 'next';
import Hero from "@/components/Hero";
import AboutSection from "@/components/AboutSection";
import ContactSection from "@/components/ContactSection";
import OffersSection from "@/components/OffersSection";
import AvitoReviews from "@/components/AvitoReviews";
import FAQ from "@/components/FAQ";
import BlogPreview from "@/components/BlogPreview";
import SEOContent from "@/components/SEOContent";
import LeadForm from "@/components/LeadForm";
import { faqData } from "@/lib/schema";
import PopularBuyoutPrices from "@/components/sell/PopularBuyoutPrices";
import { POPULAR_MODELS } from "@/lib/model-slugs";

export const metadata: Metadata = {
  title: { absolute: 'BestMac — скупка и продажа макбуков в Москве с гарантией' },
  description: 'Продать или сдать макбук в Москве по цене рынка: скупка MacBook, iMac, Mac mini и Mac Studio через ИП, онлайн-калькулятор оценки, выезд на дом. Продажа б/у MacBook с гарантией 1 месяц. Офис у м. Киевская.',
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Hero />
      <AboutSection />
      <OffersSection />

      {/* Цены выкупа популярных моделей в HTML главной — главной точки входа
          на сайт; раньше цифр выкупа на ней не было вовсе. */}
      <div className="apple-container max-w-4xl pt-12">
        <PopularBuyoutPrices slugs={POPULAR_MODELS.map((m) => m.slug)} allLink />
      </div>
      <AvitoReviews />
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
