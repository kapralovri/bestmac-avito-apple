import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Smartphone, Laptop, Monitor, Tablet, ArrowRight, ExternalLink } from "lucide-react";
import { avitoApiService, type AvitoProduct } from "@/services/avitoApi";
import { motion } from "framer-motion";

const ProductCatalog = () => {
  const [products, setProducts] = useState<AvitoProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await avitoApiService.getMyProducts();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'MacBook': return Laptop;
      case 'iMac': return Monitor;
      case 'iPhone': return Smartphone;
      case 'iPad': return Tablet;
      default: return Laptop;
    }
  };

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
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  if (loading) {
    return (
      <section id="catalog" className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold font-apple mb-6">
              Актуальные предложения
            </h2>
            <p className="text-xl text-apple-gray max-w-2xl mx-auto">
              Загружаем ваши объявления с Avito...
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 h-64 rounded-t-lg mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="catalog" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl font-bold font-apple mb-6">
            Актуальные предложения
          </h2>
          <p className="text-xl text-apple-gray max-w-2xl mx-auto">
            Подержанная техника Apple с гарантией качества. 
            Все устройства проверены и готовы к использованию.
          </p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {products.map((product, index) => {
            const IconComponent = getCategoryIcon(product.category);
            
            return (
              <motion.div key={product.id} variants={itemVariants}>
                <Card className="bg-card border-border shadow-card hover:shadow-elegant transition-all duration-500 group transform hover:-translate-y-2 hover:scale-105">
                  <CardContent className="p-0">
                    <div className="relative overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-64 object-cover rounded-t-lg transition-transform duration-500 group-hover:scale-110"
                      />
                      <Badge 
                        variant="secondary" 
                        className="absolute top-4 left-4 bg-apple-green text-white animate-pulse"
                      >
                        {product.condition}
                      </Badge>
                      <div className="absolute top-4 right-4">
                        <IconComponent className="w-6 h-6 text-primary" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    
                    <div className="p-6">
                      <h3 className="text-lg font-semibold mb-3 group-hover:text-primary transition-colors duration-300">
                        {product.title}
                      </h3>
                      
                      <div className="mb-4">
                        {product.specifications.map((spec, index) => (
                          <span key={index} className="text-sm text-apple-gray mr-3">
                            {spec}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-2xl font-bold text-primary">
                            {product.price.toLocaleString('ru-RU')} ₽
                          </div>
                          {product.originalPrice && (
                            <div className="text-sm text-apple-gray line-through">
                              {product.originalPrice.toLocaleString('ru-RU')} ₽
                            </div>
                          )}
                        </div>
                        {product.originalPrice && (
                          <Badge variant="outline" className="text-apple-green border-apple-green animate-bounce">
                            Экономия {((product.originalPrice - product.price) / 1000).toFixed(0)}к
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1 bg-gradient-primary hover:opacity-90 transition-all duration-300 hover:shadow-lg"
                          disabled={!product.isAvailable}
                          onClick={() => window.open(product.avitoUrl, '_blank')}
                        >
                          {product.isAvailable ? 'Смотреть на Avito' : 'Нет в наличии'}
                          {product.isAvailable && <ExternalLink className="ml-2 w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Button 
            variant="outline" 
            size="lg"
            className="px-8 py-4 text-lg border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-105 hover:shadow-lg"
            onClick={() => window.open('https://www.avito.ru/user/your-profile', '_blank')}
          >
            Смотреть все объявления на Avito
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default ProductCatalog;