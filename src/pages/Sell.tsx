import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Calculator, Clock, Shield, Banknote } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FAQ from "@/components/FAQ";
import { motion } from "framer-motion";
import { sendEmail } from "@/services/email";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";
import { serviceSchema } from "@/lib/schema";
import { trackFormSubmit } from "@/components/Analytics";
import BuyoutTable from "@/components/BuyoutTable";
import type { BuyoutRow } from '@/types/buyout';
import { loadBuyoutData } from '@/lib/buyout';
import { adjustments } from '@/config/buyout-adjustments';
import Reviews from "@/components/Reviews";

const Sell = () => {
  const [buyoutData, setBuyoutData] = useState<BuyoutRow[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Форма заявки
  const [formData, setFormData] = useState({
    model: "",
    condition: "",
    phone: "",
    description: ""
  });

  // Калькулятор
  const [calc, setCalc] = useState({
    selectedModel: '',
    condition: 'A' as 'A' | 'B' | 'C',
    batteryCycles: 0,
    displayDefect: false,
    bodyDefect: false,
    hasCharger: true,
    hasBox: true,
    icloudBlocked: false,
  });

  useEffect(() => {
    loadBuyoutData()
      .then(data => setBuyoutData(data))
      .catch(() => setBuyoutData([]));
  }, []);

  // Получаем уникальные модели для выбора
  const uniqueModels = useMemo(() => {
    const models = new Set<string>();
    buyoutData.forEach(item => {
      if (item.model && item.model.trim()) {
        models.add(item.model);
      }
    });
    return Array.from(models).sort();
  }, [buyoutData]);

  // Получаем конфигурации для выбранной модели
  const availableConfigs = useMemo(() => {
    if (!calc.selectedModel) return [];
    return buyoutData.filter(item => item.model === calc.selectedModel);
  }, [calc.selectedModel, buyoutData]);

  // Расчет цены
  const estimate = useMemo(() => {
    const configs = availableConfigs;
    if (!configs.length) return null;

    // Берем среднюю базовую цену для этой модели
    const avgBase = Math.round(
      configs.reduce((sum, c) => sum + c.basePrice, 0) / configs.length
    );

    if (adjustments.icloudBlockedZero && calc.icloudBlocked) {
      return { base: avgBase, priceMin: 0, priceMax: 0 };
    }

    let price = avgBase;

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
    if (calc.displayDefect) price -= avgBase * adjustments.displayDefectPenalty;
    if (calc.bodyDefect) price -= avgBase * adjustments.bodyDefectPenalty;

    // Комплект
    if (!calc.hasCharger) price -= adjustments.noChargerPenalty;
    if (!calc.hasBox) price -= adjustments.noBoxPenalty;

    const spread = price * adjustments.minMaxSpreadPct;
    const priceMin = Math.max(0, Math.round(price - spread));
    const priceMax = Math.max(0, Math.round(price + spread));

    return { base: avgBase, priceMin, priceMax };
  }, [calc, availableConfigs]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendEmail({ form: "sell", ...formData });
      trackFormSubmit('sell');
      setIsSubmitted(true);
      setFormData({ model: "", condition: "", phone: "", description: "" });
      setTimeout(() => setIsSubmitted(false), 3000);
    } catch (error) {
      console.error("Error sending message:", error);
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

        {/* Process Steps */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold font-apple mb-8">Как проходит выкуп</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                className="flex flex-col items-center text-center p-6 border border-border rounded-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <div className="w-16 h-16 bg-gradient-primary rounded-lg flex items-center justify-center mb-4">
                  <step.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Калькулятор выкупа */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold font-apple mb-6">Калькулятор выкупа</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 border border-border rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Выбор модели */}
                <div className="md:col-span-2">
                  <Label htmlFor="model-select">Модель</Label>
                  <Select 
                    value={calc.selectedModel} 
                    onValueChange={(v) => setCalc({ ...calc, selectedModel: v })}
                  >
                    <SelectTrigger id="model-select">
                      <SelectValue placeholder="Выберите модель MacBook" />
                    </SelectTrigger>
                    <SelectContent className="max-h-96">
                      {uniqueModels.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Состояние */}
                <div>
                  <Label>Состояние</Label>
                  <Select 
                    value={calc.condition} 
                    onValueChange={(v) => setCalc({ ...calc, condition: v as 'A' | 'B' | 'C' })}
                  >
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

                {/* Циклы батареи */}
                <div>
                  <Label htmlFor="cycles">Циклы батареи</Label>
                  <Input 
                    id="cycles" 
                    type="number" 
                    min={0} 
                    max={1500} 
                    value={calc.batteryCycles} 
                    onChange={(e) => setCalc({ ...calc, batteryCycles: Number(e.target.value || 0) })} 
                  />
                </div>

                {/* Чекбоксы */}
                <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <input 
                      id="displayDefect" 
                      type="checkbox" 
                      checked={calc.displayDefect} 
                      onChange={(e) => setCalc({ ...calc, displayDefect: e.target.checked })} 
                      className="h-4 w-4"
                    />
                    <Label htmlFor="displayDefect" className="cursor-pointer">Дефект дисплея</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      id="bodyDefect" 
                      type="checkbox" 
                      checked={calc.bodyDefect} 
                      onChange={(e) => setCalc({ ...calc, bodyDefect: e.target.checked })} 
                      className="h-4 w-4"
                    />
                    <Label htmlFor="bodyDefect" className="cursor-pointer">Дефект корпуса</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      id="hasCharger" 
                      type="checkbox" 
                      checked={calc.hasCharger} 
                      onChange={(e) => setCalc({ ...calc, hasCharger: e.target.checked })} 
                      className="h-4 w-4"
                    />
                    <Label htmlFor="hasCharger" className="cursor-pointer">Есть зарядка</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      id="hasBox" 
                      type="checkbox" 
                      checked={calc.hasBox} 
                      onChange={(e) => setCalc({ ...calc, hasBox: e.target.checked })} 
                      className="h-4 w-4"
                    />
                    <Label htmlFor="hasBox" className="cursor-pointer">Есть коробка</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      id="icloudBlocked" 
                      type="checkbox" 
                      checked={calc.icloudBlocked} 
                      onChange={(e) => setCalc({ ...calc, icloudBlocked: e.target.checked })} 
                      className="h-4 w-4"
                    />
                    <Label htmlFor="icloudBlocked" className="cursor-pointer">iCloud заблокирован</Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Результат оценки */}
            <div className="border border-border rounded-lg p-6 flex flex-col">
              <h3 className="font-semibold text-xl mb-4">Оценка</h3>
              {estimate && calc.selectedModel ? (
                <div className="flex-1 flex flex-col justify-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Базовая цена: {estimate.base.toLocaleString('ru-RU')} ₽
                  </p>
                  <p className="text-3xl font-bold mb-4">
                    {estimate.priceMin.toLocaleString('ru-RU')} – {estimate.priceMax.toLocaleString('ru-RU')} ₽
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Точная цена после диагностики. Оставьте телефон — закрепим предложение.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-muted-foreground text-center">
                    Выберите модель и параметры для расчёта стоимости
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Таблица цен на выкуп */}
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

        {/* Форма заявки */}
        <motion.div 
          className="max-w-2xl mx-auto mb-16"
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
              {isSubmitted ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Заявка отправлена!</h3>
                  <p className="text-muted-foreground">Мы свяжемся с вами в ближайшее время</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="form-model">Модель устройства *</Label>
                    <Input
                      id="form-model"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      placeholder="Например: MacBook Pro 14 2023"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="form-condition">Состояние *</Label>
                    <Select
                      value={formData.condition}
                      onValueChange={(value) => setFormData({ ...formData, condition: value })}
                      required
                    >
                      <SelectTrigger id="form-condition">
                        <SelectValue placeholder="Выберите состояние" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent">Отличное (как новый)</SelectItem>
                        <SelectItem value="good">Хорошее (небольшие потертости)</SelectItem>
                        <SelectItem value="fair">Удовлетворительное (есть царапины)</SelectItem>
                        <SelectItem value="poor">Требует ремонта</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="form-phone">Телефон *</Label>
                    <Input
                      id="form-phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+7 (___) ___-__-__"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="form-description">Дополнительная информация</Label>
                    <Textarea
                      id="form-description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Расскажите о комплектации, дефектах, циклах батареи и т.д."
                      rows={4}
                    />
                  </div>

                  <Button type="submit" className="w-full" size="lg">
                    Отправить заявку
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Отзывы */}
        <Reviews />

        {/* FAQ */}
        <FAQ items={[
          {
            question: "Как происходит выкуп техники?",
            answer: "Процесс очень прост: вы оставляете заявку, мы оцениваем вашу технику, согласовываем цену и проводим сделку. Весь процесс занимает не более 15 минут."
          },
          {
            question: "Какие документы нужны для продажи?",
            answer: "Для продажи техники нужен только паспорт. Мы работаем официально через ИП и предоставляем все необходимые документы."
          },
          {
            question: "Какую технику вы принимаете?",
            answer: "Мы выкупаем MacBook, iMac, Mac Mini, Mac Pro, iPhone, iPad и другую технику Apple в любом состоянии."
          },
          {
            question: "Можно ли продать технику с дефектами?",
            answer: "Да, мы выкупаем технику в любом состоянии. Цена будет зависеть от типа и серьезности дефектов."
          },
          {
            question: "Как быстро происходит оплата?",
            answer: "Оплата производится сразу после диагностики и оформления документов. Наличными или переводом на карту."
          },
          {
            question: "Можете ли вы выехать для оценки?",
            answer: "Да, мы можем выехать для оценки и выкупа техники по Москве. Это бесплатно при сумме сделки от 30 000 ₽."
          }
        ]} />
      </main>

      <Footer />
    </div>
  );
};

export default Sell;
