import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";
import AvitoOffers from "@/components/AvitoOffers";
import LeadForm from "@/components/LeadForm";
import { generateProductSchema, generateBreadcrumbSchema } from "@/lib/structured-data";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle, Shield, Clock } from "lucide-react";

const MacbookAirM2Buy = () => {
  const breadcrumbItems = [
    { name: "Главная", url: "/" },
    { name: "Купить", url: "/buy" },
    { name: "MacBook Air M2 16GB б/у", url: "/buy/macbook-air-m2-16gb" }
  ];

  const productSchema = generateProductSchema({
    name: "MacBook Air M2 16GB 512GB б/у",
    price: 75000,
    condition: "б/у",
    description: "Купить MacBook Air M2 с 16GB RAM и 512GB SSD в отличном состоянии. Гарантия 1 месяц, проверка при покупке."
  });

  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems);

  const combinedSchema = {
    "@context": "https://schema.org",
    "@graph": [productSchema, breadcrumbSchema]
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Купить MacBook Air M2 16GB 512GB б/у в Москве — от 75,000₽ | BestMac"
        description="Купить MacBook Air M2 16GB 512GB б/у в Москве. Отличное состояние, гарантия 1 месяц. Проверка при покупке. Цена от 75,000₽. Доставка по Москве."
        canonical="/buy/macbook-air-m2-16gb"
        keywords="купить macbook air m2 16gb, macbook air m2 бу, macbook air 16gb 512gb москва, macbook air m2 цена"
        schema={combinedSchema}
      />
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={breadcrumbItems} />
        
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Купить MacBook Air M2 16GB б/у в Москве
        </h1>
        
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="flex items-center space-x-3 p-4 bg-card rounded-lg border">
            <CheckCircle className="w-8 h-8 text-primary" />
            <div>
              <p className="font-semibold">16GB RAM</p>
              <p className="text-sm text-muted-foreground">Идеально для работы</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-4 bg-card rounded-lg border">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <p className="font-semibold">Гарантия 1 месяц</p>
              <p className="text-sm text-muted-foreground">Официально</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-4 bg-card rounded-lg border">
            <Clock className="w-8 h-8 text-primary" />
            <div>
              <p className="font-semibold">Доставка 1-2 дня</p>
              <p className="text-sm text-muted-foreground">По Москве</p>
            </div>
          </div>
        </div>

        <div className="prose max-w-none mb-12">
          <h2 className="text-3xl font-bold mb-4">Почему MacBook Air M2 16GB — лучший выбор?</h2>
          <p className="text-lg text-muted-foreground mb-6">
            MacBook Air M2 с 16GB оперативной памяти и 512GB SSD — идеальный баланс производительности 
            и цены. Этой конфигурации хватит для любых задач: от офисной работы до легкого монтажа видео.
          </p>

          <h3 className="text-2xl font-bold mb-3">Технические характеристики</h3>
          <ul className="list-disc pl-6 space-y-2 mb-6">
            <li><strong>Процессор:</strong> Apple M2 (8-ядерный CPU)</li>
            <li><strong>Оперативная память:</strong> 16GB unified memory</li>
            <li><strong>Накопитель:</strong> 512GB SSD</li>
            <li><strong>Дисплей:</strong> 13.6" Liquid Retina (2560×1664)</li>
            <li><strong>Автономность:</strong> до 18 часов</li>
            <li><strong>Вес:</strong> 1.24 кг</li>
          </ul>

          <h3 className="text-2xl font-bold mb-3">Для кого подойдет?</h3>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="border border-border rounded-lg p-6">
              <h4 className="font-semibold mb-2">✓ Разработчики</h4>
              <p className="text-sm text-muted-foreground">
                16GB достаточно для Xcode, Android Studio, Docker, нескольких IDE одновременно
              </p>
            </div>
            <div className="border border-border rounded-lg p-6">
              <h4 className="font-semibold mb-2">✓ Дизайнеры</h4>
              <p className="text-sm text-muted-foreground">
                Комфортная работа в Figma, Photoshop, Sketch с большими проектами
              </p>
            </div>
            <div className="border border-border rounded-lg p-6">
              <h4 className="font-semibold mb-2">✓ Видеомонтаж</h4>
              <p className="text-sm text-muted-foreground">
                Final Cut Pro, DaVinci Resolve — легкие проекты 1080p/4K
              </p>
            </div>
            <div className="border border-border rounded-lg p-6">
              <h4 className="font-semibold mb-2">✓ Студенты</h4>
              <p className="text-sm text-muted-foreground">
                Множество вкладок, офисные приложения, онлайн-обучение без тормозов
              </p>
            </div>
          </div>

          <h3 className="text-2xl font-bold mb-3">Цены на MacBook Air M2 16GB б/у</h3>
          <div className="bg-card rounded-lg p-6 border mb-6">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Конфигурация</th>
                  <th className="text-left py-2">Состояние</th>
                  <th className="text-right py-2">Цена</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2">M2 16GB 256GB</td>
                  <td className="py-2">Отличное</td>
                  <td className="text-right py-2 font-semibold">от 65,000₽</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">M2 16GB 512GB</td>
                  <td className="py-2">Отличное</td>
                  <td className="text-right py-2 font-semibold text-primary">от 75,000₽</td>
                </tr>
                <tr>
                  <td className="py-2">M2 16GB 1TB</td>
                  <td className="py-2">Отличное</td>
                  <td className="text-right py-2 font-semibold">от 85,000₽</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-2xl font-bold mb-3">Почему покупать у нас?</h3>
          <ul className="list-disc pl-6 space-y-2 mb-6">
            <li>✓ Все устройства проверены и протестированы</li>
            <li>✓ Гарантия 1 месяц на все MacBook</li>
            <li>✓ Проверка при покупке — принесите свои программы</li>
            <li>✓ Официальные документы купли-продажи</li>
            <li>✓ Возможен trade-in вашего старого устройства</li>
            <li>✓ Доставка по Москве или самовывоз у метро Киевская</li>
          </ul>
        </div>

        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center">Актуальные предложения</h2>
          <AvitoOffers />
        </section>

        <section className="mb-12">
          <div className="bg-gradient-primary rounded-lg p-8 text-white text-center mb-8">
            <h2 className="text-2xl font-bold mb-4">Готовы купить MacBook Air M2 16GB?</h2>
            <p className="mb-6">Оставьте заявку, и мы подберем лучший вариант под ваш бюджет</p>
            <div className="flex gap-4 justify-center">
              <Button asChild size="lg" variant="secondary">
                <Link to="/buy">Смотреть все MacBook</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-white text-primary hover:bg-white/90">
                <a href="tel:+79032990029">Позвонить</a>
              </Button>
            </div>
          </div>
        </section>

        <section>
          <LeadForm 
            title="Не нашли нужную конфигурацию?"
            subtitle="Оставьте заявку, и мы найдем MacBook Air M2 16GB специально для вас"
            formType="selection"
          />
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default MacbookAirM2Buy;
