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
    { name: "Купить MacBook", url: "/buy" }
  ];

  const schema = productOfferSchema('buy');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead 
        title="Купить MacBook б/у в Москве — гарантия, доставка | BestMac"
        description="Купить MacBook б/у в Москве с гарантией. Широкий выбор MacBook Air и MacBook Pro по выгодным ценам. Доставка по Москве и области."
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
            <h1 className="text-3xl font-bold font-apple mb-2">Актуальные предложения</h1>
            <p className="text-muted-foreground">Мои лучшие предложения с Avito</p>
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
