import Header from "@/components/Header";
import Hero from "@/components/Hero";
import AboutSection from "@/components/AboutSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import AvitoOffers from "@/components/AvitoOffers";
import Reviews from "@/components/Reviews";
import FAQ from "@/components/FAQ";
import BlogPreview from "@/components/BlogPreview";
import SEOHead from "@/components/SEOHead";
import { organizationSchema, faqData } from "@/lib/schema";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead 
        title="BestMac - Купить MacBook, продать MacBook, скупка MacBook в Москве | Техника Apple"
        description="Купить MacBook, продать MacBook, скупка MacBook в Москве. Продажа подержанной техники Apple с гарантией 1 месяц. Выкуп MacBook, iMac, iPhone. Через ИП без НДС."
        canonical="/"
        schema={organizationSchema}
        keywords="купить macbook, продать macbook, скупка macbook, бу macbook, macbook москва, macbook apple, imac купить, iphone продать, техника apple, apple москва"
      />
      <Header />
      <Hero />
      <AboutSection />
      
      {/* Секция интеграции с Avito - ЗАКОММЕНТИРОВАНА */}
      {/* <section className="py-20 bg-card/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold font-apple mb-4">
              Подключение к Avito
            </h2>
            <p className="text-lg text-apple-gray">
              Настройте интеграцию для отображения ваших объявлений
            </p>
          </div>
          <AvitoAuth />
        </div>
      </section> */}
      
      {/* Секция Актуальные предложения */}
      <section className="py-20 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold font-apple mb-4">
              Актуальные предложения
            </h2>
            <p className="text-lg text-apple-gray">
              Мои лучшие предложения с Avito
            </p>
          </div>
          
          {/* Динамическая загрузка предложений */}
          <AvitoOffers />
        </div>
      </section>

      <Reviews />
      
      <BlogPreview />
      
      <FAQ items={faqData.home} />
      
      <ContactSection />
      <Footer />
    </div>
  );
};

export default Index;
