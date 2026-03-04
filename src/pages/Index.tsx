import Header from "@/components/Header";
import Hero from "@/components/Hero";
import AboutSection from "@/components/AboutSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import OffersSection from "@/components/OffersSection";
import Reviews from "@/components/Reviews";
import FAQ from "@/components/FAQ";
import BlogPreview from "@/components/BlogPreview";
import SEOHead from "@/components/SEOHead";
import SEOContent from "@/components/SEOContent";
import LeadForm from "@/components/LeadForm";
import { organizationSchema, faqData } from "@/lib/schema";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="BestMac — Честный выкуп и продажа MacBook в Москве с гарантией"
        description="Купить или продать MacBook б/у в Москве с гарантией 1 месяц. Официальная скупка MacBook, iMac, iPhone через ИП. Районы: Дорогомилово, Киевская, ЦАО. Онлайн-калькулятор оценки, выезд на дом, безналичный расчет."
        canonical="/"
        schema={organizationSchema}
        keywords="купить macbook, продать macbook, скупка macbook, бу macbook, macbook москва, macbook apple, imac купить, iphone продать, техника apple, apple москва"
      />
      <Header />
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
      <Footer />
    </div>
  );
};

export default Index;
