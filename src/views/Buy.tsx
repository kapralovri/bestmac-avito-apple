"use client";

import { motion } from "framer-motion";
import AvitoOffers from "@/components/AvitoOffers";
import MarketTrends from "@/components/MarketTrends";
import FAQ from "@/components/FAQ";
import Breadcrumbs from "@/components/Breadcrumbs";
import NewProductsSection from "@/components/NewProductsSection";
import { productOfferSchema, faqData } from "@/lib/schema";

const Buy = () => {
  const breadcrumbItems = [
    { name: "Главная", url: "/" },
    { name: "В продаже", url: "/buy" }
  ];

  const schema = productOfferSchema('buy');

  return (
    <div className="min-h-screen bg-background text-foreground">
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

        <NewProductsSection />

        <MarketTrends />
        
        <FAQ items={faqData.buy} title="Вопросы о покупке" />
      </main>
    </div>
  );
};

export default Buy;
