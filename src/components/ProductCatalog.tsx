import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Smartphone, Laptop, Monitor, Tablet, ArrowRight } from "lucide-react";

interface Product {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  image: string;
  condition: string;
  category: 'MacBook' | 'iMac' | 'iPhone' | 'iPad';
  specifications: string[];
  isAvailable: boolean;
}

const ProductCatalog = () => {
  // Mock data - в реальном приложении будет загружаться с Avito API
  const products: Product[] = [
    {
      id: "1",
      title: "MacBook Pro 14\" M2 Pro 512GB",
      price: 185000,
      originalPrice: 250000,
      image: "/api/placeholder/400/300",
      condition: "Отличное",
      category: "MacBook",
      specifications: ["Apple M2 Pro", "16GB RAM", "512GB SSD", "2023 год"],
      isAvailable: true
    },
    {
      id: "2", 
      title: "iMac 24\" M1 256GB",
      price: 120000,
      originalPrice: 180000,
      image: "/api/placeholder/400/300",
      condition: "Хорошее",
      category: "iMac",
      specifications: ["Apple M1", "8GB RAM", "256GB SSD", "2021 год"],
      isAvailable: true
    },
    {
      id: "3",
      title: "iPhone 14 Pro 128GB",
      price: 85000,
      originalPrice: 110000,
      image: "/api/placeholder/400/300",
      condition: "Отличное",
      category: "iPhone",
      specifications: ["A16 Bionic", "128GB", "ProRAW", "2022 год"],
      isAvailable: true
    }
  ];

  const getCategoryIcon = (category: Product['category']) => {
    switch (category) {
      case 'MacBook': return Laptop;
      case 'iMac': return Monitor;
      case 'iPhone': return Smartphone;
      case 'iPad': return Tablet;
      default: return Laptop;
    }
  };

  return (
    <section id="catalog" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold font-apple mb-6">
            Актуальные предложения
          </h2>
          <p className="text-xl text-apple-gray max-w-2xl mx-auto">
            Подержанная техника Apple с гарантией качества. 
            Все устройства проверены и готовы к использованию.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {products.map((product) => {
            const IconComponent = getCategoryIcon(product.category);
            
            return (
              <Card key={product.id} className="bg-card border-border shadow-card hover:shadow-elegant transition-all duration-300 group">
                <CardContent className="p-0">
                  <div className="relative">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-64 object-cover rounded-t-lg"
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
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-3 group-hover:text-primary transition-colors">
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
                        Экономия {((product.originalPrice! - product.price) / 1000).toFixed(0)}к
                      </Badge>
                    </div>
                    
                    <Button 
                      className="w-full bg-gradient-primary hover:opacity-90"
                      disabled={!product.isAvailable}
                    >
                      {product.isAvailable ? 'Подробнее' : 'Нет в наличии'}
                      {product.isAvailable && <ArrowRight className="ml-2 w-4 h-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <Button 
            variant="outline" 
            size="lg"
            className="px-8 py-4 text-lg border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            Смотреть все объявления
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProductCatalog;