import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import macbookHero from "@/assets/images/macbook-hero.jpg";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";

const Hero = () => {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Smooth spring for buttery animations
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  // Hero text: scales down and fades as you scroll
  const titleScale = useTransform(smoothProgress, [0, 0.4], [1, 0.8]);
  const titleOpacity = useTransform(smoothProgress, [0, 0.35], [1, 0]);
  const titleY = useTransform(smoothProgress, [0, 0.4], [0, -80]);

  // Product image: zooms in dramatically on scroll (like diving into screen)
  const imageScale = useTransform(smoothProgress, [0, 0.5], [1, 1.4]);
  const imageOpacity = useTransform(smoothProgress, [0, 0.15, 0.5], [0.5, 0.7, 0]);
  const imageY = useTransform(smoothProgress, [0, 0.5], [0, -60]);

  // Second image: parallax reveal from right
  const sideImageX = useTransform(smoothProgress, [0.1, 0.45], [200, 0]);
  const sideImageOpacity = useTransform(smoothProgress, [0.1, 0.3, 0.55], [0, 1, 0]);
  const sideImageRotate = useTransform(smoothProgress, [0.1, 0.45], [15, 0]);

  // Glow effect intensifies on scroll
  const glowOpacity = useTransform(smoothProgress, [0, 0.3], [0.04, 0.12]);

  // Features strip slides up
  const featuresY = useTransform(smoothProgress, [0, 0.2], [0, -30]);
  const featuresOpacity = useTransform(smoothProgress, [0.25, 0.4], [1, 0]);

  return (
    <section ref={sectionRef} className="relative h-[200vh]">
      {/* Sticky container */}
      <div className="sticky top-0 h-screen overflow-hidden bg-background flex flex-col items-center justify-center">
        
        {/* Animated glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ opacity: glowOpacity }}
        >
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,_hsl(212_100%_50%_/_0.3)_0%,_transparent_70%)] blur-3xl" />
        </motion.div>

        {/* Main product image - dramatic zoom on scroll */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{ scale: imageScale, opacity: imageOpacity, y: imageY }}
        >
          <img
            src={macbookHero}
            alt="MacBook Pro на тёмном фоне"
            className="w-full h-full object-cover"
            loading="eager"
          />
          {/* Dramatic vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_hsl(0_0%_0%)_100%)]" />
        </motion.div>

        {/* Side MacBook - parallax reveal */}
        <motion.div
          className="absolute right-[5%] top-1/2 -translate-y-1/2 w-[40vw] max-w-[600px] hidden lg:block"
          style={{
            x: sideImageX,
            opacity: sideImageOpacity,
            rotateY: sideImageRotate,
          }}
        >
          <img
            src={macbookSide}
            alt="MacBook вид сбоку"
            className="w-full rounded-2xl shadow-2xl"
            loading="eager"
          />
        </motion.div>

        {/* Content - scales and fades on scroll */}
        <motion.div
          className="relative z-10 text-center px-4 max-w-5xl mx-auto"
          style={{ scale: titleScale, opacity: titleOpacity, y: titleY }}
        >
          {/* Eyebrow */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/40 bg-card/40 backdrop-blur-sm mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-apple-green animate-pulse" />
            <span className="text-xs text-muted-foreground tracking-wide">MacBook · iMac · Mac mini · Mac Pro</span>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            className="text-6xl sm:text-7xl md:text-[5.5rem] lg:text-[7rem] font-bold tracking-tighter leading-[0.9] mb-6"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <span className="text-gradient">Техника Apple.</span>
            <br />
            <span className="text-gradient-blue">Выгодно.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            Продажа и выкуп б/у техники Apple в Москве.
            <br className="hidden sm:block" />
            Гарантия · Проверка · Документы
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            <Button
              size="lg"
              className="rounded-full px-10 h-14 text-base font-medium bg-primary hover:bg-primary/90 shadow-elegant transition-all duration-300 hover:shadow-[0_30px_80px_-20px_hsl(212_100%_48%_/_0.4)]"
              onClick={() => navigate("/buy")}
            >
              Смотреть каталог
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full px-10 h-14 text-base font-medium border-border/50 bg-card/30 backdrop-blur-sm hover:bg-card/60 text-foreground transition-all duration-300"
              onClick={() => navigate("/sell")}
            >
              Продать технику
            </Button>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          style={{ opacity: featuresOpacity }}
        >
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Листайте</span>
          <motion.div
            className="w-5 h-8 rounded-full border border-border/50 flex items-start justify-center p-1"
            initial={{}}
          >
            <motion.div
              className="w-1 h-2 rounded-full bg-muted-foreground"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>

        {/* Bottom features */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 z-10 pb-6"
          style={{ y: featuresY, opacity: featuresOpacity }}
        >
          <div className="apple-container-wide">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden bg-border/20">
              {[
                { title: "Гарантия", desc: "1 месяц на все" },
                { title: "Через ИП", desc: "Документы и чек" },
                { title: "Доставка", desc: "По всей России" },
                { title: "Выкуп", desc: "Деньги сразу" },
              ].map((f, i) => (
                <motion.div
                  key={i}
                  className="bg-card/40 backdrop-blur-md p-5 text-center hover:bg-card/60 transition-colors duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + i * 0.1, duration: 0.6 }}
                >
                  <p className="text-sm font-medium text-foreground mb-0.5">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
