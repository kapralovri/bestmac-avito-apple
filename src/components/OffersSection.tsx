import { motion } from "framer-motion";
import AvitoOffers from "@/components/AvitoOffers";

const OffersSection = () => {
  return (
    <section className="apple-section relative overflow-hidden">
      {/* Abstract gradient background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/3 left-1/4 w-[700px] h-[500px] rounded-full bg-[radial-gradient(ellipse_at_center,_hsl(260_80%_60%_/_0.05)_0%,_hsl(212_100%_48%_/_0.03)_40%,_transparent_70%)] blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[400px] rounded-full bg-[radial-gradient(ellipse_at_center,_hsl(212_100%_50%_/_0.04)_0%,_transparent_70%)] blur-3xl" />
      </div>

      <div className="apple-container-wide relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-gradient">
            Актуальные предложения
          </h2>
          <p className="text-lg text-muted-foreground">
            Лучшие предложения с Avito
          </p>
        </motion.div>
        <AvitoOffers />
      </div>
    </section>
  );
};

export default OffersSection;
