import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Smartphone,
  Laptop,
  Monitor,
  Tablet,
  ArrowLeft,
  ExternalLink,
  Phone,
  MessageCircle,
  Heart,
  Share2,
  Shield,
  CheckCircle
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import SEOHead from "@/components/SEOHead";
import { useNavigate } from "react-router-dom";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);

  // Mock product data - would be fetched from Avito API by ID
  const product = {
    id: "1",
    title: "MacBook Pro 14\" M2 Pro 512GB Space Gray",
    price: 185000,
    originalPrice: 250000,
    images: [
      "/api/placeholder/600/400",
      "/api/placeholder/600/400",
      "/api/placeholder/600/400",
      "/api/placeholder/600/400"
    ],
    condition: "Отличное",
    category: "MacBook",
    location: "Москва, м. Сокольники",
    publishDate: "2024-01-10",
    views: 1247,
    avitoUrl: "https://www.avito.ru/moskva/noutbuki/macbook_pro_14_m2_pro_512gb",
    seller: {
      name: "BestMac",
      rating: 4.9,
      reviews: 156,
      verified: true
    },
    specifications: {
      "Процессор": "Apple M2 Pro (10-ядерный)",
      "Оперативная память": "16 GB",
      "Накопитель": "512 GB SSD",
      "Экран": "14.2\" Liquid Retina XDR",
      "Разрешение": "3024 × 1964",
      "Графика": "16-ядерный GPU",
      "Год выпуска": "2023",
      "Состояние": "Отличное, без дефектов",
      "Комплектация": "Полная (коробка, документы, зарядное)"
    },
    description: `
Продаю MacBook Pro 14" с процессором M2 Pro в отличном состоянии. 

Ноутбук использовался аккуратно для работы, никогда не падал, не ремонтировался. 
Экран без царапин и битых пикселей, клавиатура и тачпад работают идеально.

✅ Полная комплектация: коробка, документы, зарядное устройство MagSafe 3
✅ Гарантия от продавца 1 месяц
✅ Возможна проверка при покупке
✅ Официальные документы купли-продажи

Причина продажи: переход на iMac для стационарной работы.

Торг возможен при осмотре. Обмен не интересует.
    `
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'MacBook': return Laptop;
      case 'iMac': return Monitor;
      case 'iPhone': return Smartphone;
      case 'iPad': return Tablet;
      default: return Laptop;
    }
  };

  const IconComponent = getCategoryIcon(product.category);
  const discountPercent = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);

  const breadcrumbItems = [
    { name: "Главная", url: "/" },
    { name: "В продаже", url: "/buy" },
    { name: product.title, url: `/product/${id}` }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${product.title} — купить в Москве | BestMac`}
        description={`Купить ${product.title} в Москве. ${product.condition} состояние. Цена: ${product.price.toLocaleString('ru-RU')} ₽. Гарантия, проверка при покупке.`}
        canonical={`/product/${id}`}
        noindex={true}
      />
      <Header />

      <main className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={breadcrumbItems} />

          {/* Back Button */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-apple-gray hover:text-primary"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Назад к объявлениям</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Images Section */}
            <div>
              <div className="mb-4">
                <img
                  src={product.images[selectedImage]}
                  alt={product.title}
                  className="w-full h-96 object-cover rounded-lg border border-border"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative rounded-lg overflow-hidden border-2 transition-all ${selectedImage === index ? 'border-primary' : 'border-border hover:border-apple-gray'
                      }`}
                  >
                    <img
                      src={image}
                      alt={`${product.title} ${index + 1}`}
                      className="w-full h-20 object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Product Info */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <IconComponent className="w-6 h-6 text-primary" />
                  <Badge variant="secondary" className="bg-apple-green text-white">
                    {product.condition}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Heart className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <h1 className="text-3xl font-bold font-apple mb-4">{product.title}</h1>

              <div className="flex items-center space-x-4 mb-6">
                <div className="text-4xl font-bold text-primary">
                  {product.price.toLocaleString('ru-RU')} ₽
                </div>
                {product.originalPrice && (
                  <div className="space-y-1">
                    <div className="text-lg text-apple-gray line-through">
                      {product.originalPrice.toLocaleString('ru-RU')} ₽
                    </div>
                    <Badge variant="outline" className="text-apple-green border-apple-green">
                      -{discountPercent}% экономия
                    </Badge>
                  </div>
                )}
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-2 text-apple-gray">
                  <span>📍 {product.location}</span>
                </div>
                <div className="flex items-center space-x-2 text-apple-gray">
                  <span>👁️ {product.views} просмотров</span>
                </div>
                <div className="flex items-center space-x-2 text-apple-gray">
                  <span>📅 Размещено {new Date(product.publishDate).toLocaleDateString('ru-RU')}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 mb-8">
                <Button
                  className="w-full bg-gradient-primary hover:opacity-90"
                  onClick={() => window.open(product.avitoUrl, '_blank')}
                >
                  Смотреть на Avito
                  <ExternalLink className="ml-2 w-4 h-4" />
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                    <Phone className="mr-2 w-4 h-4" />
                    Позвонить
                  </Button>
                  <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                    <MessageCircle className="mr-2 w-4 h-4" />
                    Написать
                  </Button>
                </div>
              </div>

              {/* Seller Info */}
              <Card className="bg-card border-border mb-8">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">B</span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">{product.seller.name}</span>
                          {product.seller.verified && (
                            <CheckCircle className="w-4 h-4 text-apple-green" />
                          )}
                        </div>
                        <div className="text-sm text-apple-gray">
                          ⭐ {product.seller.rating} ({product.seller.reviews} отзывов)
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Профиль
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Guarantees */}
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center">
                    <Shield className="w-5 h-5 text-apple-green mr-2" />
                    Гарантии
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-apple-green" />
                      <span>Гарантия 1 месяц от продавца</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-apple-green" />
                      <span>Проверка при покупке</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-apple-green" />
                      <span>Официальные документы</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Specifications */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold font-apple mb-6">Характеристики</h2>
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(product.specifications).map(([key, value], index) => (
                    <div key={index}>
                      <div className="flex justify-between py-3">
                        <span className="text-apple-gray">{key}</span>
                        <span className="font-medium text-right">{value}</span>
                      </div>
                      {index < Object.entries(product.specifications).length - 1 && (
                        <Separator />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold font-apple mb-6">Описание</h2>
            <Card className="bg-card border-border">
              <CardContent className="p-6">
                <div className="prose max-w-none">
                  {product.description.split('\n').map((paragraph, index) => (
                    paragraph.trim() && (
                      <p key={index} className="mb-4 last:mb-0">
                        {paragraph}
                      </p>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetail;