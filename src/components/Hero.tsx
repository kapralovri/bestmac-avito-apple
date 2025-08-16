import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, FileText, Truck, RefreshCw } from "lucide-react";
import heroImage from "@/assets/hero-apple-devices.jpg";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const Hero = () => {
  const navigate = useNavigate();
  
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
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut" as const
      }
    }
  };

  const featureVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut" as const
      }
    }
  };

  return (
    <section className="relative min-h-screen flex items-center">
      <div className="absolute inset-0 bg-gradient-hero" />
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      <motion.div 
        className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-3xl">
          <motion.h1 
            className="text-5xl md:text-7xl font-bold font-apple mb-8 leading-tight"
            variants={itemVariants}
          >
            Купите{" "}
            <span className="text-transparent bg-clip-text bg-gradient-primary">
              iMac и MacBook
            </span>
            <br />
            в Москве выгодно
          </motion.h1>
          
          <motion.p 
            className="text-xl text-apple-gray-light mb-12 leading-relaxed"
            variants={itemVariants}
          >
            Продажа подержанной техники Apple с гарантией 1 месяц. 
            Проверка перед покупкой, полный комплект документов, доставка по всей России.
          </motion.p>

          <motion.div 
            className="flex flex-col sm:flex-row gap-4 mb-16"
            variants={itemVariants}
          >
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Button 
                size="lg" 
                className="bg-gradient-primary hover:opacity-90 shadow-elegant px-8 py-4 text-lg"
                onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Смотреть каталог
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Button 
                variant="outline" 
                size="lg"
                className="border-border hover:bg-secondary px-8 py-4 text-lg"
                onClick={() => navigate('/sell')}
              >
                Продать технику
              </Button>
            </motion.div>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={itemVariants}
          >
            {[
              {
                icon: Shield,
                title: "Гарантия 1 месяц",
                description: "Проверка перед покупкой"
              },
              {
                icon: FileText,
                title: "Через ИП без НДС",
                description: "Полный комплект документов"
              },
              {
                icon: Truck,
                title: "Доставка",
                description: "По городу и регионам"
              },
              {
                icon: RefreshCw,
                title: "Выкуп и обмен",
                description: "На выгодных условиях"
              }
            ].map((feature, index) => (
              <motion.div 
                key={index}
                className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 hover:bg-card/80 transition-all duration-300 cursor-pointer"
                variants={featureVariants}
                whileHover={{ 
                  scale: 1.05, 
                  y: -5,
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                }}
                whileTap={{ scale: 0.95 }}
              >
                <feature.icon className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-apple-gray">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;