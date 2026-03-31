"use client";

import Hero from "@/components/Hero";
import AboutSection from "@/components/AboutSection";
import ContactSection from "@/components/ContactSection";
import OffersSection from "@/components/OffersSection";
import Reviews from "@/components/Reviews";
import FAQ from "@/components/FAQ";
import BlogPreview from "@/components/BlogPreview";
import SEOContent from "@/components/SEOContent";
import LeadForm from "@/components/LeadForm";
import { organizationSchema, faqData } from "@/lib/schema";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
<Hero />
      <AboutSection />

      {/* Актуальные предложения */}
      <OffersSection />

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
};

export default Index;
