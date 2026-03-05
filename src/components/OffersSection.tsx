import { motion } from "framer-motion";
import { useRef, useCallback, useState } from "react";
import AvitoOffers from "@/components/AvitoOffers";

const OffersSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }, []);

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      className="apple-section relative overflow-hidden"
    >
      {/* Mouse-following gradient */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute w-[700px] h-[500px] rounded-full blur-3xl transition-transform duration-700 ease-out"
          style={{
            left: `${mousePos.x}%`,
            top: `${mousePos.y}%`,
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(ellipse at center, hsl(260 80% 60% / 0.25) 0%, hsl(212 100% 48% / 0.12) 40%, transparent 70%)',
          }}
        />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[400px] rounded-full bg-[radial-gradient(ellipse_at_center,_hsl(212_100%_50%_/_0.18)_0%,_transparent_70%)] blur-3xl" />
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
