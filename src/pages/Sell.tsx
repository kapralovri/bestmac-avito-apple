import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  loadAvitoPrices,
  loadAvitoUrls,
  getModelsFromConfig,
  getProcessorsFromConfig,
  getRamFromConfig,
  getSsdFromConfig,
  findPriceStat,
  calculateBuyoutPrice,
  formatSsd,
  formatPrice,
  filterModels
} from '@/lib/avito-prices';
import type { ConditionValue, AvitoPricesData } from '@/types/avito-prices';
import { CONDITIONS } from '@/types/avito-prices';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import SEOHead from '@/components/SEOHead';
import FAQ from '@/components/FAQ';
import { Clock, Wallet, TrendingUp, Shield, BarChart3, Cpu, HardDrive, MemoryStick, Sparkles, Search, X, Check, CheckCircle2, MapPin, RefreshCw, Monitor, Laptop, AlertTriangle } from 'lucide-react';
import { generateProductSchema } from '@/lib/structured-data';


interface AvitoUrlsData {
  description: string;
  updated_at: string;
  entries: Array<{
    model_name: string;
    processor: string;
    ram: number;
    ssd: number;
    url: string;
  }>;
}

const Sell = () => {
  const [data, setData] = useState<AvitoPricesData | null>(null);
  const [urlsData, setUrlsData] = useState<AvitoUrlsData | null>(null);
  const [totalListings, setTotalListings] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // Форма
  const [modelName, setModelName] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [processor, setProcessor] = useState('');
  const [ram, setRam] = useState<number | ''>('');
  const [ssd, setSsd] = useState<number | ''>('');
  const [condition, setCondition] = useState<ConditionValue>('excellent');

  // Результат
  const [result, setResult] = useState<{
    marketMin: number;
    marketMax: number;
    marketMedian: number;
    buyoutPrice: number;
    samplesCount: number;
    isRareModel?: boolean;
  } | null>(null);

  // Загрузка данных
  useEffect(() => {
    loadAvitoUrls().then(setUrlsData);
    loadAvitoPrices().then((loadedData) => {
      setData(loadedData);
      setTotalListings(loadedData.total_listings);
      if (loadedData.generated_at) {
        const date = new Date(loadedData.generated_at);
        setLastUpdate(date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }));
      }
    });
  }, []);

  // Список моделей из конфигурации
  const models = useMemo(() => {
    if (!urlsData) return [];
    return filterModels(getModelsFromConfig(urlsData), modelSearch);
  }, [urlsData, modelSearch]);

  // Опции процессоров из конфигурации
  const processorOptions = useMemo(() => {
    if (!urlsData || !modelName) return [];
    return getProcessorsFromConfig(urlsData, modelName);
  }, [urlsData, modelName]);

  // Опции RAM из конфигурации
  const ramOptions = useMemo(() => {
    if (!urlsData || !modelName || !processor) return [];
    return getRamFromConfig(urlsData, modelName, processor);
  }, [urlsData, modelName, processor]);

  // Опции SSD из конфигурации
  const ssdOptions = useMemo(() => {
    if (!urlsData || !modelName || !processor || !ram) return [];
    return getSsdFromConfig(urlsData, modelName, processor, Number(ram));
  }, [urlsData, modelName, processor, ram]);

  // Сброс зависимых полей
  useEffect(() => {
    setProcessor('');
    setRam('');
    setSsd('');
    setResult(null);
  }, [modelName]);

  useEffect(() => {
    setRam('');
    setSsd('');
    setResult(null);
  }, [processor]);

  useEffect(() => {
    setSsd('');
    setResult(null);
  }, [ram]);

  // Расчет
  const handleCalculate = () => {
    if (!data || !modelName || !processor || !ram || !ssd) return;

    const stat = findPriceStat(data.stats, modelName, Number(ram), Number(ssd), processor);

    if (!stat || stat.samples_count < 2) {
      setResult({
        marketMin: 0,
        marketMax: 0,
        marketMedian: 0,
        buyoutPrice: 0,
        samplesCount: stat?.samples_count ?? 0,
        isRareModel: true,
      });
      return;
    }

    const priceResult = calculateBuyoutPrice(stat, condition);
    setResult({
      marketMin: priceResult.marketMin,
      marketMax: priceResult.marketMax,
      marketMedian: priceResult.marketMedian,
      buyoutPrice: priceResult.buyoutPrice,
      samplesCount: priceResult.samplesCount,
      isRareModel: false,
    });
  };

  const isFormComplete = modelName && processor && ram && ssd;

  const sellFaqItems = [
    { question: "Сколько стоит выкуп моего MacBook?", answer: "Цена зависит от модели, процессора, объема RAM и SSD, а также состояния устройства. Воспользуйтесь нашим онлайн-калькулятором — он покажет рыночную стоимость и рекомендуемую цену выкупа за 30 секунд. Мы платим до 80% от рыночной цены." },
    { question: "Как быстро вы выкупаете MacBook?", answer: "Весь процесс занимает от 30 минут до часа. Вы получаете онлайн-оценку, приезжаете в офис на м. Киевская (или мы отправляем курьера), диагностика занимает 10–15 минут, после чего деньги сразу переводятся на карту или выдаются наличными." },
    { question: "Принимаете ли вы сломанные MacBook?", answer: "Да, мы выкупаем MacBook в любом состоянии: залитые водой, с разбитым экраном, не включающиеся, заблокированные (MDM, EFI, iCloud). Оценку проблемных устройств проводим по фото за 5 минут — напишите в Telegram." },
    { question: "Откуда берутся цены в калькуляторе?", answer: "Калькулятор анализирует реальные объявления на Авито в режиме реального времени. Мы обрабатываем более 800 предложений ежедневно и рассчитываем медианную рыночную цену для каждой конфигурации — модель, процессор, RAM и SSD." },
    { question: "Чем вы лучше продажи на Авито?", answer: "При продаже на Авито вы тратите дни на общение с покупателями, рискуете нарваться на мошенников и вынуждены торговаться. У нас: прозрачная цена за 30 секунд, безопасная сделка в офисе, моментальная выплата. Экономия времени — до 2 недель." },
    { question: "Нужны ли документы для продажи?", answer: "Для сделки достаточно паспорта. Коробка и чек — плюс, но не обязательны. Мы составляем договор купли-продажи, который защищает обе стороны." },
    { question: "Вы работаете только в Москве?", answer: "Офис находится в Москве на м. Киевская (ул. Дениса Давыдова 3). Мы также отправляем курьера по Москве и МО бесплатно. Для регионов возможна отправка через СДЭК с предварительной оценкой по фото." },
  ];

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "BestMac — скупка MacBook",
    "url": "https://bestmac.ru",
    "telephone": "+79032990029",
    "image": "https://bestmac.ru/og-image.jpg",
    "priceRange": "$$$",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "ул. Дениса Давыдова 3",
      "addressLocality": "Москва",
      "addressCountry": "RU"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 55.7369,
      "longitude": 37.5165
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "156"
    }
  };

  const faqPageSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": sellFaqItems.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };

  const productSchema = generateProductSchema({
    name: "Выкуп MacBook в Москве",
    price: 50000,
    condition: "UsedCondition",
    description: "Узнайте реальную рыночную стоимость вашего MacBook. Оценка на основе анализа открытого рынка."
  });

  const schemaGraph = {
    "@context": "https://schema.org",
    "@graph": [productSchema, localBusinessSchema, faqPageSchema]
  };

  const handleModelSelect = (model: string) => {
    setModelName(model);
    setModelSearch('');
    setIsModelOpen(false);
  };

  const clearModel = () => {
    setModelName('');
    setModelSearch('');
  };

  if (!urlsData || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Загрузка данных...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEOHead
        title="Продать MacBook в Москве дорого | Скупка макбуков б/у — BestMac"
        description="Выкуп Apple MacBook (Pro, Air) за 30 минут. Онлайн-калькулятор оценки стоимости по рынку. Платим наличными или на карту. Скупка старых и сломанных макбуков в Москве."
        canonical="/sell"
        keywords="продать macbook, скупка macbook москва, продать макбук дорого, скупка apple macbook, где продать macbook, выкуп macbook бу, сдать macbook на запчасти"
        schema={schemaGraph}
      />
      <Header />

      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={[
          { name: 'Главная', url: '/' },
          { name: 'Оценка MacBook', url: '/sell' }
        ]} />

        <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Скупка MacBook в Москве дорого
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
              Узнайте реальную рыночную стоимость в онлайн-калькуляторе.
              Оценка на основе анализа {totalListings > 0 ? totalListings.toLocaleString('ru-RU') : '800+'} предложений.
            </p>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
                <Clock className="w-4 h-4 text-primary" />
                <span>30 секунд</span>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span>Реальные цены рынка</span>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span>Обновление ежедневно</span>
              </div>
            </div>
          </motion.div>

          <Tabs defaultValue="evaluation" className="w-full">
            <div className="flex justify-center mb-12">
              <TabsList className="grid w-full max-w-[400px] grid-cols-2 h-12">
                <TabsTrigger value="evaluation" className="text-base">Оценка</TabsTrigger>
                <TabsTrigger value="buyout" className="text-base">Скупка</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="evaluation">
              <div className="grid lg:grid-cols-2 gap-8 mb-16">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        Параметры устройства
                      </CardTitle>
                      <CardDescription>
                        Выберите характеристики вашего MacBook
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">1</span>
                            Модель
                          </label>
                          {modelName && (
                            <button onClick={clearModel} className="text-xs text-primary hover:underline">
                              Сбросить
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              placeholder={modelName || "Поиск модели..."}
                              value={modelSearch}
                              onChange={(e) => {
                                setModelSearch(e.target.value);
                                setIsModelOpen(true);
                              }}
                              onFocus={() => setIsModelOpen(true)}
                              className="pl-10 pr-10"
                            />
                            {(modelSearch || modelName) && (
                              <button onClick={clearModel} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          {isModelOpen && models.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-64 overflow-auto">
                              {models.map((model) => (
                                <button
                                  key={model}
                                  onClick={() => handleModelSelect(model)}
                                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-accent flex items-center justify-between ${modelName === model ? 'bg-accent' : ''}`}
                                >
                                  <span>{model}</span>
                                  {modelName === model && <Check className="w-4 h-4 text-primary" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {modelName && !isModelOpen && (
                          <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-md border border-primary/20">
                            <Check className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">{modelName}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">2</span>
                          <Cpu className="w-4 h-4" />
                          Процессор
                        </label>
                        <Select value={processor} onValueChange={setProcessor} disabled={!modelName || processorOptions.length === 0}>
                          <SelectTrigger>
                            <SelectValue placeholder={processorOptions.length === 0 && modelName ? "Нет данных" : "Выберите процессор"} />
                          </SelectTrigger>
                          <SelectContent>
                            {processorOptions.map((p) => (
                              <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">3</span>
                          <MemoryStick className="w-4 h-4" />
                          Оперативная память
                        </label>
                        <Select value={ram ? String(ram) : ''} onValueChange={(v) => setRam(Number(v))} disabled={!processor || ramOptions.length === 0}>
                          <SelectTrigger>
                            <SelectValue placeholder={ramOptions.length === 0 && processor ? "Нет данных" : "Выберите RAM"} />
                          </SelectTrigger>
                          <SelectContent>
                            {ramOptions.map((r) => (
                              <SelectItem key={r} value={String(r)}>{r} GB</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">4</span>
                          <HardDrive className="w-4 h-4" />
                          Накопитель SSD
                        </label>
                        <Select value={ssd ? String(ssd) : ''} onValueChange={(v) => setSsd(Number(v))} disabled={!ram || ssdOptions.length === 0}>
                          <SelectTrigger>
                            <SelectValue placeholder={ssdOptions.length === 0 && ram ? "Нет данных" : "Выберите SSD"} />
                          </SelectTrigger>
                          <SelectContent>
                            {ssdOptions.map((s) => (
                              <SelectItem key={s} value={String(s)}>{formatSsd(s)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">5</span>
                          <Shield className="w-4 h-4" />
                          Состояние
                        </label>
                        <Select value={condition} onValueChange={(v) => setCondition(v as ConditionValue)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONDITIONS.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                <div className="flex flex-col">
                                  <span>{c.label}</span>
                                  <span className="text-xs text-muted-foreground">{c.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button onClick={handleCalculate} className="w-full" size="lg" disabled={!isFormComplete}>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Узнать стоимость
                      </Button>
                      <p className="text-xs text-muted-foreground text-center mt-3">
                        Не нашли свою модель?{' '}
                        <a href="https://t.me/romanmanro" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Напишите мне в Telegram
                        </a>
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle>Рыночная стоимость</CardTitle>
                      <CardDescription>
                        {lastUpdate && `Данные обновлены: ${lastUpdate}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!result ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                          <BarChart3 className="w-12 h-12 mb-4 opacity-30" />
                          <p>Заполните параметры устройства</p>
                          <p className="text-sm">и нажмите «Узнать стоимость»</p>
                        </div>
                      ) : result.isRareModel ? (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="space-y-6">
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <p className="font-medium">{modelName}</p>
                            <p className="text-sm text-muted-foreground">{processor} / {ram} GB RAM / {formatSsd(Number(ssd))}</p>
                          </div>
                          <div className="text-center p-6 bg-amber-500/10 rounded-xl border-2 border-amber-500/30">
                            <p className="text-2xl md:text-3xl font-bold text-amber-600 mb-3">🔮 У вас редкая модель!</p>
                            <p className="text-muted-foreground">Свяжитесь со мной и предложите вашу цену на данную модель</p>
                          </div>
                          <Button variant="default" size="lg" className="w-full" asChild>
                            <a href="https://t.me/romanmanro" target="_blank" rel="noopener noreferrer">
                              <Wallet className="w-4 h-4 mr-2" />
                              Обсудить в ТГ
                            </a>
                          </Button>
                        </motion.div>
                      ) : (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="space-y-6">
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <p className="font-medium">{modelName}</p>
                            <p className="text-sm text-muted-foreground">{processor} / {ram} GB RAM / {formatSsd(Number(ssd))}</p>
                          </div>
                          <div className="text-center p-6 bg-muted/30 rounded-xl border">
                            <p className="text-sm text-muted-foreground mb-2">Рыночная цена сейчас</p>
                            <p className="text-3xl md:text-4xl font-bold">{formatPrice(result.marketMin)} – {formatPrice(result.marketMax)}</p>
                            <p className="text-sm text-muted-foreground mt-2">Медиана: {formatPrice(result.marketMedian)}</p>
                          </div>
                          <div className="text-center p-6 bg-primary/5 rounded-xl border-2 border-primary/20">
                            <p className="text-sm font-medium text-primary mb-2">💰 Рекомендуемая цена выкупа</p>
                            <p className="text-4xl md:text-5xl font-bold text-primary">≈ {formatPrice(result.buyoutPrice)}</p>
                          </div>
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <BarChart3 className="w-4 h-4" />
                            <span>На основе {result.samplesCount} объявлений за последние 30 дней</span>
                          </div>
                          <div className="bg-muted/50 p-4 rounded-lg text-xs text-muted-foreground">
                            <p>⚠️ Оценка на основе анализа открытого рынка. Итоговая цена может отличаться в зависимости от комплектации, циклов батареи и состояния устройства.</p>
                          </div>
                          <Button variant="default" size="lg" className="w-full" asChild>
                            <a href="https://t.me/romanmanro" target="_blank" rel="noopener noreferrer">
                              <Wallet className="w-4 h-4 mr-2" />
                              Обсудить в ТГ
                            </a>
                          </Button>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </TabsContent>

            <TabsContent value="buyout">
              <div className="max-w-4xl mx-auto space-y-16 mb-16">
                <motion.div className="grid md:grid-cols-2 gap-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                  <Link to="/sell/macbook-pro" className="block group">
                    <div className="bg-gradient-to-br from-card to-muted border p-6 rounded-2xl flex items-center gap-4 transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-md">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Monitor className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">Скупка MacBook Pro</h3>
                        <p className="text-sm text-muted-foreground mt-1">Профессиональные модели 13", 14", 16"</p>
                      </div>
                    </div>
                  </Link>
                  <Link to="/sell/macbook-air" className="block group">
                    <div className="bg-gradient-to-br from-card to-muted border p-6 rounded-2xl flex items-center gap-4 transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-md">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Laptop className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">Скупка MacBook Air</h3>
                        <p className="text-sm text-muted-foreground mt-1">Легкие ультрабуки 13" и 15"</p>
                      </div>
                    </div>
                  </Link>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                  <Link to="/sell/broken" className="block w-full">
                    <div className="bg-gradient-to-r from-destructive/10 to-orange-500/10 border-2 border-destructive/20 hover:border-destructive/40 p-4 rounded-xl flex items-center gap-4 transition-colors">
                      <div className="bg-destructive/10 p-2 rounded-full hidden sm:block">
                        <AlertTriangle className="w-6 h-6 text-destructive" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">Сломался MacBook? Залит водой или заблокирован?</p>
                        <p className="text-sm text-muted-foreground mt-0.5">Оценим на запчасти по фото за 5 минут. Нажмите здесь →</p>
                      </div>
                    </div>
                  </Link>
                </motion.div>

                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                  <h2 className="text-2xl font-bold mb-6 text-center">Выкупаем другие компьютеры Apple</h2>
                  <div className="grid md:grid-cols-3 gap-6">
                    <Link to="/sell/imac" className="block group">
                      <div className="bg-card hover:bg-muted/50 transition-colors border p-6 rounded-2xl flex flex-col items-center text-center h-full">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Monitor className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="font-bold text-lg mb-2">Скупка iMac</h3>
                        <p className="text-sm text-muted-foreground">Моноблоки 21.5", 27", 24" M1/M3</p>
                      </div>
                    </Link>
                    <Link to="/sell/mac-pro" className="block group">
                      <div className="bg-card hover:bg-muted/50 transition-colors border p-6 rounded-2xl flex flex-col items-center text-center h-full">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <HardDrive className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="font-bold text-lg mb-2">Скупка Mac Pro</h3>
                        <p className="text-sm text-muted-foreground">Профессиональные станции Apple</p>
                      </div>
                    </Link>
                    <Link to="/sell/mac-mini" className="block group">
                      <div className="bg-card hover:bg-muted/50 transition-colors border p-6 rounded-2xl flex flex-col items-center text-center h-full">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Cpu className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="font-bold text-lg mb-2">Скупка Mac mini</h3>
                        <p className="text-sm text-muted-foreground">Компактные десктопы на Intel и M-чипах</p>
                      </div>
                    </Link>
                  </div>
                </motion.section>

                <motion.section className="grid lg:grid-cols-2 gap-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25 }}>
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-4">Какие MacBook мы выкупаем?</h2>
                      <p className="text-muted-foreground mb-4">Мы занимаемся узкоспециализированной скупкой ноутбуков Apple в Москве.</p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2"><CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /><span><strong>MacBook Pro</strong> (13", 14", 16") с 2016 по 2024 год.</span></li>
                        <li className="flex items-start gap-2"><CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /><span><strong>MacBook Air</strong> (13", 15") на <strong>M2 и M3</strong>.</span></li>
                        <li className="flex items-start gap-2"><CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /><span><strong>Любое состояние:</strong> б/у, идеальное, с коробкой и без.</span></li>
                        <li className="flex items-start gap-2"><CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /><span><strong>Проблемные:</strong> залитые, разбитые (на запчасти).</span></li>
                      </ul>
                    </div>
                  </div>
                  <div className="space-y-6 bg-muted/30 p-6 md:p-8 rounded-2xl border text-sm">
                    <h3 className="text-xl font-bold mb-4">Продать макбук за 4 шага:</h3>
                    <div className="space-y-4">
                      <div className="flex gap-4"><div className="w-8 h-8 rounded-full border border-primary flex items-center justify-center shrink-0">1</div><p>Оценка стоимости онлайн через калькулятор или ТГ.</p></div>
                      <div className="flex gap-4"><div className="w-8 h-8 rounded-full border border-primary flex items-center justify-center shrink-0">2</div><p>Встреча в офисе или выезд оценщика по Москве.</p></div>
                      <div className="flex gap-4"><div className="w-8 h-8 rounded-full border border-primary flex items-center justify-center shrink-0">3</div><p>Диагностика за 15 минут.</p></div>
                      <div className="flex gap-4"><div className="w-8 h-8 rounded-full border border-primary flex items-center justify-center shrink-0">4</div><p>Оплата наличными или на карту сразу.</p></div>
                    </div>
                  </div>
                </motion.section>

                <FAQ items={[
                  {
                    question: "Откуда берутся цены на выкуп Macbook?",
                    answer: "Мы ежедневно анализируем актуальный рынок Авито, собирая данные по реальным сделкам и актуальным предложениям. Наша система рассчитывает медианную цену и формирует честное предложение, которое составляет до 95% от рыночной стоимости вашего устройства."
                  },
                  {
                    question: "Как быстро вы выкупаете технику?",
                    answer: "Обычно весь процесс от оценки до получения денег занимает не более часа. Диагностика устройства на месте длится около 15 минут, после чего мы сразу переводим деньги на карту или отдаем наличными."
                  },
                  {
                    question: "Выезжаете ли вы на дом?",
                    answer: "Да, у нас работает бесплатный выезд оценщика по Москве. Наш специалист может приехать к вам домой, в офис или кафе в удобное для вас время для проверки и выкупа MacBook."
                  },
                  {
                    question: "Принимаете ли вы сломанные или залитые Макбуки?",
                    answer: "Да, мы выкупаем MacBook в любом состоянии, в том числе залитые водой, с разбитым экраном, неисправной клавиатурой или заблокированные. Цена в таких случаях оценивается индивидуально на запчасти."
                  }
                ]} />
              </div>
            </TabsContent>
          </Tabs>

          {/* SEO Content Block */}
          <motion.section
            className="mt-16 space-y-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-muted/30 rounded-3xl p-8 md:p-12 border border-border space-y-6">
              <h2 className="text-3xl font-bold">Скупка MacBook в Москве — BestMac</h2>

              <p className="text-muted-foreground leading-relaxed">
                BestMac — это специализированный сервис по выкупу техники Apple в Москве. За время работы мы провели сотни сделок и заработали репутацию честного партнёра среди владельцев MacBook. Наш подход прост: мы анализируем реальный рынок Авито в режиме реального времени и предлагаем до 80% от актуальной рыночной цены. Никаких заниженных «оценок на глаз» — только данные, основанные на анализе более 800 объявлений ежедневно. Вы всегда знаете, почему мы предлагаем именно такую сумму.
              </p>

              <div>
                <h3 className="text-xl font-bold mb-3">Как работает скупка MacBook?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>Шаг 1 — Онлайн-оценка.</strong> Выберите модель, процессор, объём оперативной памяти и SSD в нашем калькуляторе. За 30 секунд вы получите рыночный диапазон цен и рекомендуемую цену выкупа. Можно также отправить фото и характеристики в Telegram — ответим за 5 минут.{' '}
                  <strong>Шаг 2 — Встреча.</strong> Приезжайте в наш офис на м. Киевская (ул. Дениса Давыдова 3) или закажите бесплатный выезд курьера по Москве и МО.{' '}
                  <strong>Шаг 3 — Диагностика и оплата.</strong> Проверка занимает 10–15 минут: мы смотрим экран, корпус, батарею и комплектацию. Если всё соответствует описанию — деньги переводятся на карту или выдаются наличными сразу.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-3">Что влияет на цену выкупа MacBook?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Основные факторы: модель и год выпуска, тип процессора (чипы M1–M4 ценятся выше Intel), объём оперативной памяти (8, 16, 24, 32, 36 или 64 ГБ) и накопитель SSD (256 ГБ – 8 ТБ). Состояние корпуса и экрана тоже играет роль: идеальный MacBook без царапин стоит на 10–15% дороже, чем устройство с заметными следами использования. Количество циклов перезарядки батареи, наличие оригинальной коробки и зарядки — дополнительные плюсы. Заблокированные устройства (MDM, EFI, iCloud) мы тоже принимаем, но цена будет ниже.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-3">Почему BestMac лучше, чем продажа на Авито?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Продажа на Авито — это в среднем 1–2 недели: создание объявления, фотографии, десятки сообщений от «интересующихся», торг, риск мошенничества и встречи с незнакомцами. В BestMac весь процесс занимает от 30 минут. Вы получаете прозрачную оценку, основанную на тех же данных Авито, безопасную сделку в офисе с договором и моментальную выплату. Мы берём на себя все риски и экономим ваше время. При этом наша цена выкупа конкурентна — мы платим до 80% от рыночной стоимости, что часто выгоднее с учётом затрат времени и нервов при самостоятельной продаже.
                </p>
              </div>
            </div>

            {/* FAQ Section — все ответы всегда в DOM для SEO */}
            <FAQ items={sellFaqItems} title="Частые вопросы о скупке MacBook" />
          </motion.section>

        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Sell;
