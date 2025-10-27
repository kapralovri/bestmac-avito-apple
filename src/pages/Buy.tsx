import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AvitoOffers from "@/components/AvitoOffers";
import FAQ from "@/components/FAQ";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";
import { productOfferSchema, faqData } from "@/lib/schema";

const Buy = () => {
  const breadcrumbItems = [
    { name: "Главная", url: "/" },
    { name: "В продаже", url: "/buy" }
  ];

  const schema = productOfferSchema('buy');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead 
        title="Купить MacBook б/у в Москве — техника Apple с гарантией | BestMac"
        description="Купить MacBook б/у в Москве в районах Дорогомилово, Киевская, ЦАО. Большой выбор техники Apple с гарантией. Проверенные MacBook, iMac, iPhone, iPad. Официально, с документами, доставка."
        canonical="/buy"
        schema={schema}
        keywords="купить macbook бу, macbook б/у москва, купить macbook air, купить macbook pro, macbook с гарантией"
      />
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={breadcrumbItems} />
        <section className="py-8">
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold font-apple mb-6">
              Купить MacBook б/у в Москве с гарантией
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Большой выбор проверенной техники Apple с гарантией в районах Дорогомилово, Киевская, ЦАО. 
              Все устройства тщательно протестированы и готовы к использованию. Официальная сделка с документами, 
              самовывоз или доставка по Москве.
            </p>
          </motion.div>
          <AvitoOffers />
        </section>

        <FAQ items={faqData.buy} title="Вопросы о покупке" />
      </main>

      <Footer />
    </div>
  );
};

export default Buy;
