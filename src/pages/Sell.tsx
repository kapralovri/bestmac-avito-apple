import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, ArrowRight, Calculator, Clock, Shield, Banknote } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FAQ from "@/components/FAQ";
import { motion } from "framer-motion";
import { sendEmail } from "@/services/email";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";
import { productOfferSchema, serviceSchema, faqData } from "@/lib/schema";
import { trackFormSubmit } from "@/components/Analytics";
import BuyoutTable from "@/components/BuyoutTable";
import type { BuyoutRow } from '@/types/buyout';
import { estimatePrice, loadBuyoutData } from '@/lib/buyout';
import { adjustments } from '@/config/buyout-adjustments';

import Reviews from "@/components/Reviews";

const Sell = () => {
  const initialState = {
    device: "",
    model: "",
    year: "",
    condition: "",
    storage: "",
    description: "",
    phone: ""
  };
  const [formData, setFormData] = useState(initialState);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [buyoutData, setBuyoutData] = useState<BuyoutRow[]>([]);

  useEffect(() => {
    loadBuyoutData().then(setBuyoutData).catch(() => setBuyoutData([]));
  }, []);

  // Калькулятор
  const [calc, setCalc] = useState({
    configId: '', // ID выбранной конфигурации
    condition: 'A' as 'A' | 'B' | 'C',
    batteryCycles: 0,
    displayDefect: false,
    bodyDefect: false,
    hasCharger: true,
    hasBox: true,
    icloudBlocked: false,
  });

  // Получаем выбранную конфигурацию
  const selectedConfig = useMemo(() => {
    return buyoutData.find(r => `${r.model}|${r.ram || ''}|${r.storage || ''}` === calc.configId);
  }, [calc.configId, buyoutData]);

  const estimate = useMemo(() => {
    if (!selectedConfig) return null;
    
    // Используем базовую цену из выбранной конфигурации
    const base = selectedConfig.basePrice;
    
    if (adjustments.icloudBlockedZero && calc.icloudBlocked) {
      return { base, priceMin: 0, priceMax: 0 };
    }

    let price = base;

    // Состояние
    price *= adjustments.condition[calc.condition];

    // Циклы батареи
    const cycles = calc.batteryCycles ?? 0;
    const idx = adjustments.batteryCycles.thresholds.findIndex((t) => cycles < t);
    const penalty = idx === -1
      ? adjustments.batteryCycles.penalties.at(-1)!
      : adjustments.batteryCycles.penalties[idx];
    price -= penalty;

    // Дефекты
    if (calc.displayDefect) price -= base * adjustments.displayDefectPenalty;
    if (calc.bodyDefect) price -= base * adjustments.bodyDefectPenalty;

    // Комплект
    if (calc.hasCharger === false) price -= adjustments.noChargerPenalty;
    if (calc.hasBox === false) price -= adjustments.noBoxPenalty;

    const spread = price * adjustments.minMaxSpreadPct;
    const priceMin = Math.max(0, Math.round(price - spread));
    const priceMax = Math.max(0, Math.round(price + spread));

    return { base, priceMin, priceMax };
  }, [selectedConfig, calc]);

  // Получаем все доступные конфигурации (уникальные)
  const allConfigs = useMemo(() => {
    const seen = new Set<string>();
    return buyoutData.filter(r => {
      const key = `${r.model}|${r.ram || ''}|${r.storage || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        return true;
      }
      return false;
    });
  }, [buyoutData]);

  const breadcrumbItems = [
    { name: "Главная", url: "/" },
    { name: "Выкуп", url: "/sell" }
  ];

  const schema = serviceSchema({
    name: "Выкуп техники Apple",
    description: "Выкуп MacBook и другой техники Apple. Быстрая оценка, наличный расчет, выезд специалиста.",
    url: "https://bestmac.ru/sell",
    aggregateLowRub: 30000,
    aggregateHighRub: 180000
  });

  const priceRanges = {
    "MacBook Air M1": "80,000 - 120,000 ₽",
    "MacBook Pro 14\" M2": "150,000 - 200,000 ₽", 
    "iMac 24\" M1": "100,000 - 150,000 ₽",
    "iPhone 14 Pro": "70,000 - 95,000 ₽",
    "iPhone 13": "50,000 - 70,000 ₽",
    "iPad Pro 12.9\"": "60,000 - 100,000 ₽"
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendEmail({ form: "sell", ...formData });
      trackFormSubmit('sell');
      setIsSubmitted(true);
      setFormData(initialState);
      setTimeout(() => setIsSubmitted(false), 3000);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

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
        duration: 0.6,
        ease: "easeOut" as const
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead 
        title="Выкуп MacBook в Москве — продать технику Apple выгодно | BestMac"
        description="Выкуп MacBook в Москве по выгодным ценам в районах Дорогомилово, Киевская, ЦАО. Быстрая оценка, наличный расчет, выезд специалиста. Работаем официально."
        canonical="/sell"
        schema={schema}
        keywords="продать macbook, выкуп macbook, скупка macbook москва, продать iphone, выкуп техники apple"
      />
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={breadcrumbItems} />

        {/* порядок секций отрегулирован ниже */}
        
        
        {/* Hero Section */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold font-apple mb-6">
            Выкуп техники Apple в Москве
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Честная оценка, быстрая сделка и максимальная цена за вашу технику Apple. 
            Работаем в районах Дорогомилово, Киевская, ЦАО и по всей Москве. 
            Официально через ИП с полным пакетом документов.
          </p>
        </motion.div>

        {/* Full-bleed section for desktop (with inner container to keep site spacing) */}
        <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen mb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="grid grid-cols-1 gap-8 md:mt-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Process Steps */}
          <motion.div variants={itemVariants}>
            <h2 className="text-3xl font-bold font-apple mb-8">Как проходит выкуп</h2>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {[
                {
                  icon: Calculator,
                  title: "Оценка",
                  description: "Бесплатная оценка вашей техники по фото или при личной встрече"
                },
                {
                  icon: Clock,
                  title: "Быстрая сделка",
                  description: "Сделка за 15 минут. Наличный расчет или перевод на карту"
                },
                {
                  icon: Shield,
                  title: "Безопасность",
                  description: "Официальная сделка через ИП с полным пакетом документов"
                },
                {
                  icon: Banknote,
                  title: "Максимальная цена",
                  description: "Предлагаем лучшую цену на рынке за вашу технику"
                }
              ].map((step, index) => (
                <motion.div 
                  key={index}
                  className="flex items-start space-x-4 h-full"
                  whileHover={{ x: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                    <step.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                    <p className="text-muted-foreground min-h-[96px] md:min-h-[120px]">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
        </div>
        </section>
          {/* Здесь не показываем старый блок цен. Вместо него ниже будет таблица цен */}

        {/* Калькулятор выкупа */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold font-apple mb-6">Калькулятор выкупа</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 border border-border rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="config">Конфигурация</Label>
                  <Select value={calc.configId || undefined} onValueChange={(v) => setCalc({ ...calc, configId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите конфигурацию" />
                    </SelectTrigger>
                    <SelectContent className="max-h-96">
                      {allConfigs
                        .filter((config) => config.model && config.model.trim() !== '')
                        .map((config) => {
                          const configId = `${config.model}|${config.ram || ''}|${config.storage || ''}`;
                          const displayName = config.ram || config.storage
                            ? `${config.model}, ${config.ram ? `${config.ram} GB RAM` : ''}${config.ram && config.storage ? ', ' : ''}${config.storage ? `${config.storage} GB SSD` : ''}`
                            : config.model;
                          return (
                            <SelectItem key={configId} value={configId}>
                              {displayName}
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Состояние</Label>
                  <Select value={calc.condition} onValueChange={(v) => setCalc({ ...calc, condition: v as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A — Отличное</SelectItem>
                      <SelectItem value="B">B — Хорошее</SelectItem>
                      <SelectItem value="C">C — Удовлетворительное</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cycles">Циклы батареи</Label>
                  <Input id="cycles" type="number" min={0} max={1500} value={calc.batteryCycles} onChange={(e) => setCalc({ ...calc, batteryCycles: Number(e.target.value || 0) })} />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-6">
                  <div className="flex items-center space-x-2">
                    <input id="displayDefect" type="checkbox" checked={calc.displayDefect} onChange={(e) => setCalc({ ...calc, displayDefect: e.target.checked })} />
                    <Label htmlFor="displayDefect">Дефект дисплея</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input id="bodyDefect" type="checkbox" checked={calc.bodyDefect} onChange={(e) => setCalc({ ...calc, bodyDefect: e.target.checked })} />
                    <Label htmlFor="bodyDefect">Дефект корпуса</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input id="hasCharger" type="checkbox" checked={calc.hasCharger} onChange={(e) => setCalc({ ...calc, hasCharger: e.target.checked })} />
                    <Label htmlFor="hasCharger">Есть зарядка</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input id="hasBox" type="checkbox" checked={calc.hasBox} onChange={(e) => setCalc({ ...calc, hasBox: e.target.checked })} />
                    <Label htmlFor="hasBox">Есть коробка</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input id="icloudBlocked" type="checkbox" checked={calc.icloudBlocked} onChange={(e) => setCalc({ ...calc, icloudBlocked: e.target.checked })} />
                    <Label htmlFor="icloudBlocked">iCloud заблокирован</Label>
                  </div>
                </div>
              </div>
            </div>
            <div className="border border-border rounded-lg p-6">
              <h3 className="font-semibold mb-2">Оценка</h3>
              {estimate && selectedConfig ? (
                <>
                  <p className="text-sm text-muted-foreground mb-2">Базовая цена: {estimate.base.toLocaleString('ru-RU')} ₽</p>
                  <p className="text-xl font-bold">{estimate.priceMin.toLocaleString('ru-RU')} – {estimate.priceMax.toLocaleString('ru-RU')} ₽</p>
                  <p className="text-sm text-muted-foreground mt-2">Точная цена после диагностики. Оставьте телефон — закрепим предложение.</p>
                </>
              ) : (
                <p className="text-muted-foreground">Выберите конфигурацию и параметры для расчёта.</p>
              )}
            </div>
          </div>
        </section>

        {/* Примерные цены выкупа (таблица c RAM/SSD) */}
        <BuyoutTable />
        
        {/* Structured data для таблицы цен */}
        {buyoutData.length > 0 && (
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "PriceSpecification",
              "priceCurrency": "RUB",
              "name": "Примерные цены выкупа MacBook в Москве",
              "description": "Базовая цена выкупа MacBook в зависимости от модели, оперативной памяти и SSD. Цены ориентировочные, зависят от состояния и комплекта.",
              "priceRange": "30000-180000 RUB",
              "itemOffered": buyoutData.slice(0, 20).map(item => ({
                "@type": "Product",
                "name": item.model,
                "description": item.storage ? 
                  `${item.model}, ${item.ram ? `RAM ${item.ram} GB` : ''}, SSD ${item.storage} GB` :
                  item.model,
                "offers": {
                  "@type": "Offer",
                  "price": item.basePrice,
                  "priceCurrency": "RUB",
                  "availability": "https://schema.org/InStock",
                  "priceSpecification": "Базовая цена"
                }
              }))
            })}
          </script>
        )}

        {/* Contact Form */}
        <motion.div 
          className="max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">
                Оставить заявку на выкуп
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="device">Тип устройства</Label>
                    <Select 
                      value={formData.device} 
                      onValueChange={(value) => setFormData({...formData, device: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите устройство" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MacBook Air">MacBook Air</SelectItem>
                        <SelectItem value="MacBook Pro">MacBook Pro</SelectItem>
                        <SelectItem value="iMac">iMac</SelectItem>
                        <SelectItem value="iPhone">iPhone</SelectItem>
                        <SelectItem value="iPad">iPad</SelectItem>
                        <SelectItem value="Другое">Другое</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="model">Модель</Label>
                    <Input
                      id="model"
                      placeholder="Например: M1, M2 Pro, iPhone 14"
                      value={formData.model}
                      onChange={(e) => setFormData({...formData, model: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="year">Год выпуска</Label>
                    <Input
                      id="year"
                      placeholder="2023"
                      value={formData.year}
                      onChange={(e) => setFormData({...formData, year: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="condition">Состояние</Label>
                    <Select 
                      value={formData.condition} 
                      onValueChange={(value) => setFormData({...formData, condition: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите состояние" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Отличное">Отличное</SelectItem>
                        <SelectItem value="Хорошее">Хорошее</SelectItem>
                        <SelectItem value="Удовлетворительное">Удовлетворительное</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="storage">Объем памяти</Label>
                    <Input
                      id="storage"
                      placeholder="256GB, 512GB"
                      value={formData.storage}
                      onChange={(e) => setFormData({...formData, storage: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Дополнительная информация</Label>
                  <Textarea
                    id="description"
                    placeholder="Опишите состояние устройства, комплектацию, дефекты..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Контактный телефон</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+7 (999) 123-45-67"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    required
                  />
                </div>

                <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90">
                  Отправить заявку
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>

              {isSubmitted && (
                <motion.div 
                  className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-800">Заявка отправлена! Мы свяжемся с вами в ближайшее время.</span>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <FAQ items={faqData.sell} title="Частые вопросы о выкупе" />

        {/* Reviews Section */}
        <div className="mt-16">
          <Reviews title="Отзывы о выкупе техники" />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Sell;
