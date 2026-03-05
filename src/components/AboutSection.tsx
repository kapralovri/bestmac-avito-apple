import { ShieldCheck, Award, Handshake, HeartHandshake } from "lucide-react";
import { motion } from "framer-motion";
import romanPhoto from "@/assets/about-me.png";

const AboutSection = () => {
  return (
    <section className="apple-section bg-background relative overflow-hidden">
      {/* Abstract gradient background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,_hsl(260_80%_60%_/_0.25)_0%,_hsl(212_100%_48%_/_0.12)_40%,_transparent_70%)] blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] rounded-full bg-[radial-gradient(ellipse_at_center,_hsl(212_100%_48%_/_0.15)_0%,_transparent_70%)] blur-3xl" />
      </div>

      <div className="apple-container relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-gradient">
            Обо мне
          </h2>
          <p className="text-lg text-muted-foreground">
            Более 10 лет в мире Apple
          </p>
        </motion.div>

        <motion.div
          className="flex flex-col lg:flex-row items-center gap-12 mb-20"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-border flex-shrink-0">
            <img
              src={romanPhoto}
              alt="Роман Капралов - основатель BestMac"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-center lg:text-left space-y-4 text-muted-foreground text-lg leading-relaxed max-w-2xl">
            <p>
              Меня зовут <span className="text-foreground font-medium">Роман</span>. Я уже более
              <span className="text-primary font-medium"> 10 лет</span> занимаюсь подбором и продажей подержанной техники Apple.
            </p>
            <p>
              Продаю технику с минимальным пробегом в отличном состоянии. Все аппараты тщательно тестируются перед продажей.
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: ShieldCheck, title: "Безупречный вид", desc: "Без следов эксплуатации" },
            { icon: Award, title: "Идеальное состояние", desc: "Техническая исправность" },
            { icon: Handshake, title: "Гарантия", desc: "1 месяц на все устройства" },
            { icon: HeartHandshake, title: "Личный подход", desc: "Индивидуальная консультация" },
          ].map((f, i) => (
            <motion.div
              key={i}
              className="text-center p-8 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 hover:border-border transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <f.icon className="w-8 h-8 text-primary mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
