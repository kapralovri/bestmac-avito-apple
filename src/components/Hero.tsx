import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-apple-devices.jpg";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[100svh] flex flex-col items-center justify-center overflow-hidden bg-background">
      {/* Dramatic product image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Коллекция техники Apple: MacBook, iMac и другие устройства"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          loading="eager"
        />
        {/* Top fade */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/60 to-transparent" style={{ height: '40%' }} />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/80 to-transparent" style={{ height: '50%' }} />
        {/* Subtle radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(212_100%_48%_/_0.04)_0%,_transparent_70%)]" />
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 text-center px-4 max-w-4xl mx-auto"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <motion.p
          className="text-sm md:text-base text-muted-foreground mb-4 tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          MacBook · iMac · Mac mini · Mac Pro
        </motion.p>

        <motion.h1
          className="text-5xl sm:text-6xl md:text-8xl font-bold tracking-tight leading-[0.95] mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <span className="text-gradient">Техника Apple.</span>
          <br />
          <span className="text-gradient-blue">Выгодно.</span>
        </motion.h1>

        <motion.p
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          Продажа и выкуп подержанной техники Apple в Москве.
          <br className="hidden sm:block" />
          Гарантия. Проверка. Документы.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
        >
          <Button
            size="lg"
            className="rounded-full px-8 h-12 text-base bg-primary hover:bg-primary/90 shadow-elegant"
            onClick={() => navigate('/buy')}
          >
            Смотреть каталог
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="rounded-full px-8 h-12 text-base border-border/60 bg-secondary/50 hover:bg-secondary text-foreground"
            onClick={() => navigate('/sell')}
          >
            Продать технику
          </Button>
        </motion.div>
      </motion.div>

      {/* Bottom features strip */}
      <motion.div
        className="relative z-10 w-full mt-auto pb-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        <div className="apple-container-wide">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/30 rounded-2xl overflow-hidden">
            {[
              { title: "Гарантия", desc: "1 месяц на все" },
              { title: "Через ИП", desc: "Документы и чек" },
              { title: "Доставка", desc: "По всей России" },
              { title: "Выкуп", desc: "Деньги сразу" },
            ].map((f, i) => (
              <div
                key={i}
                className="bg-card/60 backdrop-blur-sm p-6 text-center hover:bg-card/80 transition-colors"
              >
                <p className="text-sm font-medium text-foreground mb-1">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;
