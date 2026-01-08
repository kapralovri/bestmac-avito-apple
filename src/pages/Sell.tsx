import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  loadAvitoPrices, 
  getModels,
  getRamOptions, 
  getSsdOptions,
  findPriceStat,
  calculateBuyoutPrice,
  formatSsd,
  formatPrice,
  filterModels
} from '@/lib/avito-prices';
import type { AvitoPriceStat, ConditionValue, AvitoPricesData } from '@/types/avito-prices';
import { CONDITIONS, REGIONS } from '@/types/avito-prices';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import SEOHead from '@/components/SEOHead';
import { Clock, Wallet, TrendingUp, Shield, BarChart3, MapPin, HardDrive, MemoryStick, Sparkles, Search, X, Check } from 'lucide-react';
import { generateProductSchema } from '@/lib/structured-data';

const Sell = () => {
  const [data, setData] = useState<AvitoPricesData | null>(null);
  const [totalListings, setTotalListings] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  
  // Форма
  const [modelName, setModelName] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [ram, setRam] = useState<number | ''>('');
  const [ssd, setSsd] = useState<number | ''>('');
  const [region, setRegion] = useState('Москва');
  const [condition, setCondition] = useState<ConditionValue>('excellent');
  
  // Результат
  const [result, setResult] = useState<{
    marketMin: number;
    marketMax: number;
    marketMedian: number;
    buyoutPrice: number;
    samplesCount: number;
  } | null>(null);
  
  // Загрузка данных
  useEffect(() => {
    loadAvitoPrices().then((loadedData) => {
      setData(loadedData);
      setTotalListings(loadedData.total_listings);
      if (loadedData.generated_at) {
        const date = new Date(loadedData.generated_at);
        setLastUpdate(date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }));
      }
    });
  }, []);
  
  // Список моделей с фильтрацией
  const models = useMemo(() => {
    if (!data) return [];
    return filterModels(getModels(data), modelSearch);
  }, [data, modelSearch]);
  
  const allModels = useMemo(() => {
    if (!data) return [];
    return getModels(data);
  }, [data]);
  
  // Опции RAM и SSD
  const ramOptions = useMemo(() => {
    if (!data || !modelName) return [];
    return getRamOptions(data.stats, modelName);
  }, [data, modelName]);
  
  const ssdOptions = useMemo(() => {
    if (!data || !modelName || !ram) return [];
    return getSsdOptions(data.stats, modelName, Number(ram));
  }, [data, modelName, ram]);
  
  // Сброс зависимых полей
  useEffect(() => {
    setRam('');
    setSsd('');
    setResult(null);
  }, [modelName]);
  
  useEffect(() => {
    setSsd('');
    setResult(null);
  }, [ram]);
  
  // Расчет
  const handleCalculate = () => {
    if (!data || !modelName || !ram || !ssd) return;
    
    const stat = findPriceStat(data.stats, modelName, Number(ram), Number(ssd), region);
    if (!stat) {
      setResult(null);
      return;
    }
    
    const priceResult = calculateBuyoutPrice(stat, condition);
    setResult({
      marketMin: priceResult.marketMin,
      marketMax: priceResult.marketMax,
      marketMedian: priceResult.marketMedian,
      buyoutPrice: priceResult.buyoutPrice,
      samplesCount: priceResult.samplesCount,
    });
  };
  
  const isFormComplete = modelName && ram && ssd;
  
  const productSchema = generateProductSchema({
    name: "Выкуп MacBook в Москве",
    price: 50000,
    condition: "UsedCondition",
    description: "Узнайте реальную рыночную стоимость вашего MacBook. Оценка на основе анализа открытого рынка."
  });

  // Обработка выбора модели
  const handleModelSelect = (model: string) => {
    setModelName(model);
    setModelSearch('');
    setIsModelOpen(false);
  };

  const clearModel = () => {
    setModelName('');
    setModelSearch('');
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Сколько стоит ваш MacBook? Калькулятор рыночной цены | BestMac"
        description="Узнайте реальную рыночную стоимость вашего MacBook за 30 секунд. Оценка на основе анализа открытого рынка. Актуальные цены на MacBook Air, Pro, M1, M2, M3, M4."
        canonical="/sell"
        keywords="сколько стоит macbook, цена macbook бу, продать macbook цена, оценка macbook, калькулятор цены macbook"
        schema={productSchema}
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
              Сколько стоит ваш MacBook?
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
              Узнайте реальную рыночную стоимость прямо сейчас. 
              Оценка на основе анализа {totalListings > 0 ? totalListings.toLocaleString('ru-RU') : '800+'} объявлений.
            </p>
            
            {/* Преимущества */}
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

          {/* Калькулятор */}
          <div className="grid lg:grid-cols-2 gap-8 mb-16">
            {/* Форма */}
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
                  {/* Модель - как в каталоге Авито */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">1</span>
                        Модель
                      </label>
                      {modelName && (
                        <button 
                          onClick={clearModel}
                          className="text-xs text-primary hover:underline"
                        >
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
                          <button 
                            onClick={clearModel}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      {/* Dropdown с моделями */}
                      {isModelOpen && models.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-64 overflow-auto">
                          {models.map((model) => (
                            <button
                              key={model}
                              onClick={() => handleModelSelect(model)}
                              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-accent flex items-center justify-between ${
                                modelName === model ? 'bg-accent' : ''
                              }`}
                            >
                              <span>{model}</span>
                              {modelName === model && (
                                <Check className="w-4 h-4 text-primary" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Выбранная модель */}
                    {modelName && !isModelOpen && (
                      <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-md border border-primary/20">
                        <Check className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">{modelName}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* RAM */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">2</span>
                      <MemoryStick className="w-4 h-4" />
                      Оперативная память
                    </label>
                    <Select 
                      value={ram ? String(ram) : ''} 
                      onValueChange={(v) => setRam(Number(v))} 
                      disabled={!modelName || ramOptions.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={ramOptions.length === 0 && modelName ? "Нет данных" : "Выберите RAM"} />
                      </SelectTrigger>
                      <SelectContent>
                        {ramOptions.map((r) => (
                          <SelectItem key={r} value={String(r)}>{r} GB</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* SSD */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">3</span>
                      <HardDrive className="w-4 h-4" />
                      Накопитель SSD
                    </label>
                    <Select 
                      value={ssd ? String(ssd) : ''} 
                      onValueChange={(v) => setSsd(Number(v))} 
                      disabled={!ram || ssdOptions.length === 0}
                    >
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
                  
                  {/* Состояние */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">4</span>
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
                  
                  {/* Город */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Город
                    </label>
                    <Select value={region} onValueChange={setRegion}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REGIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    onClick={handleCalculate}
                    className="w-full"
                    size="lg"
                    disabled={!isFormComplete}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Узнать стоимость
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Результат */}
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
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      {/* Выбранная модель */}
                      {modelName && (
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="font-medium">{modelName}</p>
                          <p className="text-sm text-muted-foreground">
                            {ram} GB RAM / {formatSsd(Number(ssd))}
                          </p>
                        </div>
                      )}
                      
                      {/* Рыночная цена */}
                      <div className="text-center p-6 bg-muted/30 rounded-xl border">
                        <p className="text-sm text-muted-foreground mb-2">Рыночная цена сейчас</p>
                        <p className="text-3xl md:text-4xl font-bold">
                          {formatPrice(result.marketMin)} – {formatPrice(result.marketMax)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Медиана: {formatPrice(result.marketMedian)}
                        </p>
                      </div>
                      
                      {/* Цена выкупа */}
                      <div className="text-center p-6 bg-primary/5 rounded-xl border-2 border-primary/20">
                        <p className="text-sm font-medium text-primary mb-2">
                          💰 Рекомендуемая цена выкупа
                        </p>
                        <p className="text-4xl md:text-5xl font-bold text-primary">
                          ≈ {formatPrice(result.buyoutPrice)}
                        </p>
                      </div>
                      
                      {/* Статистика */}
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <BarChart3 className="w-4 h-4" />
                        <span>На основе {result.samplesCount} объявлений за последние 30 дней</span>
                      </div>
                      
                      {/* Дисклеймер */}
                      <div className="bg-muted/50 p-4 rounded-lg text-xs text-muted-foreground">
                        <p>
                          ⚠️ Оценка на основе анализа открытого рынка. Итоговая цена может отличаться 
                          в зависимости от комплектации, циклов батареи и состояния устройства.
                        </p>
                      </div>
                      
                      {/* CTA */}
                      <Button 
                        variant="default" 
                        size="lg" 
                        className="w-full"
                        asChild
                      >
                        <a href="https://t.me/romanmanro" target="_blank" rel="noopener noreferrer">
                          <Wallet className="w-4 h-4 mr-2" />
                          Продать сейчас
                        </a>
                      </Button>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Как это работает */}
          <motion.section 
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h2 className="text-2xl font-bold text-center mb-8">Как мы рассчитываем цену</h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Анализ рынка</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Каждый день мы анализируем сотни объявлений о продаже MacBook 
                    на открытом рынке.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Умная фильтрация</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Отсеиваем завышенные и заниженные цены, оставляя только 
                    актуальные предложения за последние 30 дней.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Честная оценка</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Цена выкупа учитывает состояние устройства и включает 
                    нашу комиссию за быструю сделку.
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.section>

          {/* FAQ */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h2 className="text-2xl font-bold text-center mb-8">Частые вопросы</h2>
            
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Откуда берутся цены?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Мы анализируем актуальные объявления на открытом рынке. Цены обновляются ежедневно и отражают реальную ситуацию.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Почему цена выкупа ниже рыночной?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Мы предлагаем быструю сделку без рисков. Вы получаете деньги сразу, без ожидания покупателя и торга.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Как быстро вы выкупаете?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Выкуп занимает от 15 минут. Встречаемся в удобном месте, проверяем устройство и сразу переводим деньги.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Что влияет на цену?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Модель, конфигурация, состояние корпуса и экрана, циклы батареи, комплектация и наличие коробки.
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.section>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Sell;
