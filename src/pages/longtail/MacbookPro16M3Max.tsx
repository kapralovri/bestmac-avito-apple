import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, ArrowRight, Shield, Clock, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import AvitoOffers from "@/components/AvitoOffers";
import LeadForm from "@/components/LeadForm";
import { generateProductSchema, generateBreadcrumbSchema } from "@/lib/structured-data";

const MacbookPro16M3Max = () => {
  const breadcrumbItems = [
    { name: "Главная", url: "/" },
    { name: "Купить MacBook", url: "/buy" },
    { name: "MacBook Pro 16 M3 Max", url: "/buy/macbook-pro-16-m3-max" }
  ];

  const productSchema = generateProductSchema({
    name: "MacBook Pro 16 M3 Max",
    price: 280000,
    condition: "UsedCondition",
    description: "Купить MacBook Pro 16 M3 Max б/у в отличном состоянии. Мощная рабочая станция для профессионалов. 36GB RAM, 1TB SSD. Гарантия, доставка по Москве.",
    sku: "MBP16-M3MAX-36-1TB"
  });

  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead 
        title="Купить MacBook Pro 16 M3 Max б/у в Москве | BestMac"
        description="MacBook Pro 16 M3 Max б/у от 280,000₽. Мощная профессиональная рабочая станция для видео, 3D, разработки. 36GB RAM, до 1TB SSD. Гарантия 6 месяцев. Доставка в день заказа."
        canonical="/buy/macbook-pro-16-m3-max"
        keywords="macbook pro 16 m3 max купить, macbook pro 16 m3 max бу, macbook pro 16 m3 max цена москва"
        schema={[productSchema, breadcrumbSchema]}
      />
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbItems} />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              MacBook Pro 16" M3 Max б/у
            </h1>
            
            <div className="flex flex-wrap gap-4 mb-8">
              <div className="flex items-center gap-2 text-primary">
                <Shield className="w-5 h-5" />
                <span className="font-semibold">Гарантия 6 месяцев</span>
              </div>
              <div className="flex items-center gap-2 text-primary">
                <Clock className="w-5 h-5" />
                <span className="font-semibold">Доставка сегодня</span>
              </div>
              <div className="flex items-center gap-2 text-primary">
                <Zap className="w-5 h-5" />
                <span className="font-semibold">Максимальная мощность</span>
              </div>
            </div>

            {/* Hero Section */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div>
                <h2 className="text-2xl font-bold mb-4">Профессиональная рабочая станция</h2>
                <p className="text-muted-foreground mb-6">
                  MacBook Pro 16" M3 Max — флагманская модель для самых требовательных профессионалов. 
                  Идеален для монтажа 8K видео, 3D-моделирования, рендеринга, научных вычислений 
                  и разработки сложных приложений. Чип M3 Max обеспечивает невероятную производительность 
                  на уровне настольных рабочих станций.
                </p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Чип Apple M3 Max</p>
                      <p className="text-sm text-muted-foreground">14 или 16-ядерный CPU, до 40-ядерный GPU</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">До 128GB единой памяти</p>
                      <p className="text-sm text-muted-foreground">Обработка огромных файлов без задержек</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Liquid Retina XDR 16.2"</p>
                      <p className="text-sm text-muted-foreground">ProMotion 120Hz, 1000 нит SDR, 1600 нит HDR</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Автономность до 22 часов</p>
                      <p className="text-sm text-muted-foreground">Весь рабочий день без подзарядки</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Профессиональная связность</p>
                      <p className="text-sm text-muted-foreground">3× Thunderbolt 4, HDMI 2.1, SDXC, MagSafe 3</p>
                    </div>
                  </div>
                </div>
              </div>

              <Card className="p-6">
                <h3 className="text-xl font-bold mb-4">Технические характеристики</h3>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Процессор</span>
                    <span className="font-semibold">Apple M3 Max</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">RAM</span>
                    <span className="font-semibold">36GB / 48GB / 128GB</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">SSD</span>
                    <span className="font-semibold">1TB / 2TB / 4TB / 8TB</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Дисплей</span>
                    <span className="font-semibold">16.2" Liquid Retina XDR</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Разрешение</span>
                    <span className="font-semibold">3456×2234 (254 PPI)</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Графика</span>
                    <span className="font-semibold">До 40-ядерный GPU</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Батарея</span>
                    <span className="font-semibold">До 22 часов</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Вес</span>
                    <span className="font-semibold">2.15 кг</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <p className="text-2xl font-bold text-primary mb-2">от 280,000 ₽</p>
                  <p className="text-sm text-muted-foreground mb-4">Цена зависит от конфигурации и состояния</p>
                  <Button className="w-full mb-2" size="lg" asChild>
                    <a href="https://t.me/romanmanro" target="_blank" rel="noopener noreferrer">
                      Связаться в Telegram
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <a href="tel:+79999999999">Позвонить</a>
                  </Button>
                </div>
              </Card>
            </div>

            {/* Pricing Table */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold mb-6">Цены на разные конфигурации</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="p-6">
                  <h3 className="text-xl font-bold mb-2">Базовая</h3>
                  <p className="text-3xl font-bold text-primary mb-4">280,000 ₽</p>
                  <ul className="space-y-2 text-sm mb-6">
                    <li>• M3 Max (14-core CPU)</li>
                    <li>• 30-core GPU</li>
                    <li>• 36GB RAM</li>
                    <li>• 1TB SSD</li>
                  </ul>
                  <Button variant="outline" className="w-full">Выбрать</Button>
                </Card>

                <Card className="p-6 border-2 border-primary relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold">
                    ПОПУЛЯРНАЯ
                  </div>
                  <h3 className="text-xl font-bold mb-2">Расширенная</h3>
                  <p className="text-3xl font-bold text-primary mb-4">350,000 ₽</p>
                  <ul className="space-y-2 text-sm mb-6">
                    <li>• M3 Max (16-core CPU)</li>
                    <li>• 40-core GPU</li>
                    <li>• 48GB RAM</li>
                    <li>• 2TB SSD</li>
                  </ul>
                  <Button className="w-full">Выбрать</Button>
                </Card>

                <Card className="p-6">
                  <h3 className="text-xl font-bold mb-2">Максимальная</h3>
                  <p className="text-3xl font-bold text-primary mb-4">520,000 ₽</p>
                  <ul className="space-y-2 text-sm mb-6">
                    <li>• M3 Max (16-core CPU)</li>
                    <li>• 40-core GPU</li>
                    <li>• 128GB RAM</li>
                    <li>• 8TB SSD</li>
                  </ul>
                  <Button variant="outline" className="w-full">Выбрать</Button>
                </Card>
              </div>
            </section>

            {/* Use Cases */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold mb-6">Для кого этот MacBook?</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-xl font-semibold mb-3">✅ Отлично подходит</h3>
                  <ul className="space-y-2 text-sm">
                    <li>• Монтаж 8K видео в Final Cut Pro, DaVinci Resolve</li>
                    <li>• 3D-моделирование в Blender, Cinema 4D, Maya</li>
                    <li>• Разработка игр в Unreal Engine</li>
                    <li>• Обработка RAW-фото (100+ изображений)</li>
                    <li>• Научные расчеты и машинное обучение</li>
                    <li>• Работа с виртуальными машинами</li>
                    <li>• Музыкальное производство (200+ треков)</li>
                  </ul>
                </Card>

                <Card className="p-6">
                  <h3 className="text-xl font-semibold mb-3">⚠️ Избыточно для</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Офисной работы и интернет-серфинга</li>
                    <li>• Просмотра видео и стриминга</li>
                    <li>• Базовой обработки фото</li>
                    <li>• Учебы и конспектирования</li>
                    <li>• Легкого программирования</li>
                  </ul>
                  <p className="text-sm mt-4 font-semibold">
                    Для этих задач рекомендуем <Link to="/buy/macbook-air-m2-16gb" className="text-primary hover:underline">MacBook Air M2</Link>
                  </p>
                </Card>
              </div>
            </section>

            {/* Why Buy from Us */}
            <section className="mb-12 bg-gradient-primary text-white rounded-lg p-8">
              <h2 className="text-3xl font-bold mb-6">Почему покупать у нас?</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <Shield className="w-10 h-10 mb-3" />
                  <h3 className="font-bold mb-2">Гарантия 6 месяцев</h3>
                  <p className="text-sm opacity-90">Полное гарантийное обслуживание. Замена или возврат при любых проблемах.</p>
                </div>
                <div>
                  <Check className="w-10 h-10 mb-3" />
                  <h3 className="font-bold mb-2">Профессиональная проверка</h3>
                  <p className="text-sm opacity-90">Диагностика всех компонентов перед продажей. Проверка батареи, экрана, портов.</p>
                </div>
                <div>
                  <Clock className="w-10 h-10 mb-3" />
                  <h3 className="font-bold mb-2">Быстрая доставка</h3>
                  <p className="text-sm opacity-90">Доставка курьером по Москве в день заказа. Самовывоз из центра.</p>
                </div>
              </div>
            </section>

            {/* Related Offers */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold mb-6">Похожие предложения</h2>
              <AvitoOffers limit={3} />
              <div className="text-center mt-6">
                <Button variant="outline" size="lg" asChild>
                  <Link to="/buy">
                    Смотреть все MacBook <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </section>

            {/* Lead Form */}
            <section>
              <h2 className="text-3xl font-bold mb-4 text-center">Не нашли нужную конфигурацию?</h2>
              <p className="text-center text-muted-foreground mb-8">Оставьте заявку — подберем MacBook под ваши задачи</p>
              <LeadForm />
            </section>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default MacbookPro16M3Max;
