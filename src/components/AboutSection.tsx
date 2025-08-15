import { ShieldCheck, Award, Handshake, HeartHandshake } from "lucide-react";
import { motion } from "framer-motion";

const AboutSection = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut" as const
      }
    }
  };

  const featureVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut" as const
      }
    }
  };

  return (
    <section className="py-20 bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div variants={itemVariants}>
            <div className="flex items-center space-x-6 mb-6">
              <motion.div 
                className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <img 
                  src="/hero-apple-devices.jpg" 
                  alt="Роман Капралов - основатель BestMac" 
                  className="w-full h-full object-cover"
                />
              </motion.div>
              <div>
                <h2 className="text-3xl font-bold">Обо мне</h2>
                <p className="text-lg text-muted-foreground">Роман Капралов</p>
              </div>
            </div>
            <div className="space-y-4 text-lg text-muted-foreground">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
              >
                Меня зовут <span className="font-semibold text-foreground">Роман</span>, я уже более 
                <span className="font-semibold text-primary"> 6 лет</span> занимаюсь подбором и продажей 
                подержанной техники Apple.
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true }}
              >
                Я продаю технику с минимальным пробегом в отличном состоянии. 
                Все аппараты тщательно тестируются перед продажей.
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                viewport={{ once: true }}
              >
                Помогу подобрать для вас подходящее устройство под ваши задачи и бюджет.
              </motion.p>
            </div>
          </motion.div>
          
          <motion.div 
            className="grid grid-cols-2 gap-6"
            variants={itemVariants}
          >
            {[
              {
                icon: ShieldCheck,
                title: "Безупречный внешний вид",
                description: "Без следов эксплуатации"
              },
              {
                icon: Award,
                title: "Идеальное состояние",
                description: "Техническая исправность"
              },
              {
                icon: Handshake,
                title: "Гарантия",
                description: "1 месяц на все устройства"
              },
              {
                icon: HeartHandshake,
                title: "Личный подход",
                description: "Индивидуальная консультация"
              }
            ].map((feature, index) => (
              <motion.div 
                key={index}
                className="text-center p-6 bg-background rounded-lg border border-border hover:shadow-lg transition-all duration-300 cursor-pointer"
                variants={featureVariants}
                whileHover={{ 
                  scale: 1.05, 
                  y: -5,
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)"
                }}
                whileTap={{ scale: 0.95 }}
              >
                <feature.icon className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection;