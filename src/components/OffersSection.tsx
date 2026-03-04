import { motion } from "framer-motion";
import AvitoOffers from "@/components/AvitoOffers";
import offersBgVideo from "@/assets/videos/offers-bg.mp4";

const OffersSection = () => {
  return (
    <section className="apple-section relative overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-15"
        >
          <source src={offersBgVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/60 to-background" />
        <div className="absolute inset-0 bg-background/50" />
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
