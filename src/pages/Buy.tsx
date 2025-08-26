import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Smartphone, Laptop, Monitor, Tablet, Filter, Search } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import AvitoOffers from "@/components/AvitoOffers";

const Buy = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priceRange, setPriceRange] = useState("all");

  // Mock products data - would be fetched from Avito API
  const products = [
    {
      id: "1",
      title: "MacBook Pro 14\" M2 Pro 512GB",
      price: 185000,
      originalPrice: 250000,
      image: "/placeholder.svg",
      condition: "Отличное",
      category: "MacBook",
      specifications: ["Apple M2 Pro", "16GB RAM", "512GB SSD", "2023 год"],
      location: "Москва",
      sellerRating: 4.9,
      avitoUrl: "https://www.avito.ru/moskva/noutbuki/macbook_pro_14_m2_pro_512gb"
    },
    {
      id: "2",
      title: "iMac 24\" M1 256GB",
      price: 120000,
      originalPrice: 180000,
      image: "/placeholder.svg",
      condition: "Хорошее",
      category: "iMac",
      specifications: ["Apple M1", "8GB RAM", "256GB SSD", "2021 год"],
      location: "Москва",
      sellerRating: 4.8,
      avitoUrl: "https://www.avito.ru/moskva/nastolnye_kompyutery/imac_24_m1"
    },
    {
      id: "3",
      title: "iPhone 14 Pro 128GB",
      price: 85000,
      originalPrice: 110000,
      image: "/placeholder.svg",
      condition: "Отличное",
      category: "iPhone",
      specifications: ["A16 Bionic", "128GB", "ProRAW", "2022 год"],
      location: "Москва",
      sellerRating: 5.0,
      avitoUrl: "https://www.avito.ru/moskva/telefony/iphone_14_pro_128gb"
    }
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'MacBook': return Laptop;
      case 'iMac': return Monitor;
      case 'iPhone': return Smartphone;
      case 'iPad': return Tablet;
      default: return Laptop;
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    const matchesPrice = priceRange === "all" || 
      (priceRange === "under100k" && product.price < 100000) ||
      (priceRange === "100k-200k" && product.price >= 100000 && product.price <= 200000) ||
      (priceRange === "over200k" && product.price > 200000);
    
    return matchesSearch && matchesCategory && matchesPrice;
  });

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
        ease: "easeOut" as const
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold font-apple mb-6">
              Купить технику Apple
            </h1>
            <p className="text-xl text-apple-gray max-w-3xl mx-auto mb-8">
              Широкий выбор проверенной техники Apple с гарантией качества. 
              Все устройства проходят тщательную диагностику перед продажей.
            </p>
          </motion.div>

          {/* Search and Filters */}
          <motion.div 
            className="bg-card rounded-lg border border-border p-6 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-apple-gray w-4 h-4" />
                <Input
                  placeholder="Поиск по модели или характеристикам..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Категория" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все категории</SelectItem>
                  <SelectItem value="MacBook">MacBook</SelectItem>
                  <SelectItem value="iMac">iMac</SelectItem>
                  <SelectItem value="iPhone">iPhone</SelectItem>
                  <SelectItem value="iPad">iPad</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Цена" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Любая цена</SelectItem>
                  <SelectItem value="under100k">До 100 000 ₽</SelectItem>
                  <SelectItem value="100k-200k">100 000 - 200 000 ₽</SelectItem>
                  <SelectItem value="over200k">Свыше 200 000 ₽</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {/* Products Grid */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {filteredProducts.map((product, index) => {
              const IconComponent = getCategoryIcon(product.category);
              
              return (
                <motion.div key={product.id} variants={itemVariants}>
                  <Card className="bg-card border-border shadow-card hover:shadow-elegant transition-all duration-500 group transform hover:-translate-y-2 hover:scale-105">
                    <CardContent className="p-0">
                      <div className="relative overflow-hidden">
                        <img
                          src={product.image}
                          alt={product.title}
                          className="w-full h-48 object-cover rounded-t-lg transition-transform duration-500 group-hover:scale-110"
                        />
                        <Badge 
                          variant="secondary" 
                          className="absolute top-4 left-4 bg-apple-green text-white"
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
                          <Badge variant="outline" className="text-apple-green border-apple-green">
                            -{Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)}%
                          </Badge>
                        </div>
                        
                        <div className="flex gap-2">
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex-1"
                          >
                            <Button 
                              className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-300 hover:shadow-lg"
                              onClick={() => window.open(product.avitoUrl, '_blank')}
                            >
                              Смотреть на Avito
                            </Button>
                          </motion.div>
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                              Связаться
                            </Button>
                          </motion.div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Актуальные предложения из Avito */}
          <motion.div 
            className="mt-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold font-apple mb-4">
                Актуальные предложения
              </h2>
              <p className="text-lg text-apple-gray">
                Мои лучшие предложения с Avito
              </p>
            </div>
            
            <AvitoOffers />
          </motion.div>

          {/* Advantages Section */}
          <motion.div 
            className="mt-16 bg-card rounded-lg border border-border p-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold font-apple text-center mb-8">
              Почему выбирают нас
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { emoji: "🛡️", title: "Гарантия 1 месяц", description: "Полная проверка и гарантия на всю технику" },
                { emoji: "📋", title: "Полный пакет документов", description: "Продажа через ИП, все документы в порядке" },
                { emoji: "🚚", title: "Доставка", description: "По городу и регионам России" },
                { emoji: "🔄", title: "Обмен", description: "Выгодные условия обмена старой техники" }
              ].map((advantage, index) => (
                <motion.div 
                  key={index}
                  className="text-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05, y: -5 }}
                >
                  <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-2xl">{advantage.emoji}</span>
                  </div>
                  <h3 className="font-semibold mb-2">{advantage.title}</h3>
                  <p className="text-sm text-apple-gray">{advantage.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Buy;