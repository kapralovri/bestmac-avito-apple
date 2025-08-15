import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";

const Footer = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <motion.footer 
      className="bg-card border-t border-border"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Логотип и описание */}
          <motion.div className="col-span-1 md:col-span-2" variants={itemVariants}>
            <div className="flex items-center space-x-2 mb-4">
              <motion.div 
                className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.2 }}
              >
                <span className="text-white font-bold text-lg">M</span>
              </motion.div>
              <div>
                <h1 className="text-xl font-bold font-apple">BestMac</h1>
                <p className="text-xs text-apple-gray">THE</p>
              </div>
            </div>
            <p className="text-apple-gray mb-4 max-w-md">
              Надежный партнер в мире техники Apple. Продаем качественные устройства 
              с гарантией и полным сервисом поддержки.
            </p>
            <p className="text-sm text-apple-gray">
              ИП Капралов Р.И. | ИНН: 123456789012
            </p>
          </motion.div>
          
          {/* Услуги */}
          <motion.div variants={itemVariants}>
            <h3 className="font-semibold mb-4">Услуги</h3>
            <ul className="space-y-2 text-apple-gray">
              <li><Link to="/buy" className="hover:text-primary transition-colors">Покупка техники</Link></li>
              <li><Link to="/sell" className="hover:text-primary transition-colors">Продажа техники</Link></li>
              <li><Link to="/selection" className="hover:text-primary transition-colors">Обмен устройств</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Доставка</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Гарантийное обслуживание</Link></li>
            </ul>
          </motion.div>
          
          {/* Категории */}
          <motion.div variants={itemVariants}>
            <h3 className="font-semibold mb-4">Категории</h3>
            <ul className="space-y-2 text-apple-gray">
              <li><Link to="/buy" className="hover:text-primary transition-colors">MacBook</Link></li>
              <li><Link to="/buy" className="hover:text-primary transition-colors">iMac</Link></li>
              <li><Link to="/buy" className="hover:text-primary transition-colors">iPhone</Link></li>
              <li><Link to="/buy" className="hover:text-primary transition-colors">iPad</Link></li>
              <li><Link to="/buy" className="hover:text-primary transition-colors">Аксессуары</Link></li>
            </ul>
          </motion.div>
        </div>
        
        <motion.div 
          className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center"
          variants={itemVariants}
        >
          <p className="text-apple-gray text-sm">
            © 2025 BestMac. Все права защищены.
          </p>
          <div className="flex items-center space-x-4 text-sm text-apple-gray mt-4 md:mt-0">
            <Link to="/privacy" className="hover:text-primary transition-colors">Политика конфиденциальности</Link>
            <Link to="/terms" className="hover:text-primary transition-colors">Условия использования</Link>
          </div>
        </motion.div>
        
        <motion.div 
          className="text-center mt-4"
          variants={itemVariants}
        >
          <p className="text-xs text-apple-gray flex items-center justify-center">
            Сделано с <motion.span whileHover={{ scale: 1.2 }}><Heart className="w-4 h-4 mx-1 text-red-500" fill="currentColor" /></motion.span> для любителей Apple
          </p>
        </motion.div>
      </div>
    </motion.footer>
  );
};

export default Footer;