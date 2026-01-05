import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  loadAvitoPrices, 
  getUniqueModels, 
  getUniqueCpus, 
  getUniqueRam, 
  getUniqueSsd,
  findPriceStat,
  calculateBuyoutPrice,
  formatSsd,
  formatPrice
} from '@/lib/avito-prices';
import type { AvitoPriceStat, ConditionValue } from '@/types/avito-prices';
import { CONDITIONS, REGIONS } from '@/types/avito-prices';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import SEOHead from '@/components/SEOHead';
import { Clock, Wallet, TrendingUp, Shield, BarChart3, MapPin, Cpu, HardDrive, MemoryStick, Sparkles } from 'lucide-react';
import { generateProductSchema } from '@/lib/structured-data';

const Sell = () => {
  const [stats, setStats] = useState<AvitoPriceStat[]>([]);
  const [totalListings, setTotalListings] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  
  // Форма
  const [model, setModel] = useState('');
  const [cpu, setCpu] = useState('');
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
    loadAvitoPrices().then((data) => {
      setStats(data.stats);
      setTotalListings(data.total_listings);
      if (data.generated_at) {
        const date = new Date(data.generated_at);
        setLastUpdate(date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }));
      }
    });
  }, []);
  
  // Опции для селектов
  const models = useMemo(() => getUniqueModels(stats), [stats]);
  const cpus = useMemo(() => model ? getUniqueCpus(stats, model) : [], [stats, model]);
  const rams = useMemo(() => model && cpu ? getUniqueRam(stats, model, cpu) : [], [stats, model, cpu]);
  const ssds = useMemo(() => model && cpu && ram ? getUniqueSsd(stats, model, cpu, Number(ram)) : [], [stats, model, cpu, ram]);
  
  // Сброс зависимых полей
  useEffect(() => {
    setCpu('');
    setRam('');
    setSsd('');
    setResult(null);
  }, [model]);
  
  useEffect(() => {
    setRam('');
    setSsd('');
    setResult(null);
  }, [cpu]);
  
  useEffect(() => {
    setSsd('');
    setResult(null);
  }, [ram]);
  
  // Расчет
  const handleCalculate = () => {
    if (!model || !cpu || !ram || !ssd) return;
    
    const stat = findPriceStat(stats, model, cpu, Number(ram), Number(ssd), region);
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
  
  const isFormComplete = model && cpu && ram && ssd;
  
  const productSchema = generateProductSchema({
    name: "Выкуп MacBook в Москве",
    price: 50000,
    condition: "UsedCondition",
    description: "Узнайте реальную рыночную стоимость вашего MacBook. Оценка на основе анализа открытого рынка."
  });

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
                  {/* Модель */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">1</span>
                      Модель
                    </label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите модель" />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Процессор */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">2</span>
                      <Cpu className="w-4 h-4" />
                      Процессор
                    </label>
                    <Select value={cpu} onValueChange={setCpu} disabled={!model}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите процессор" />
                      </SelectTrigger>
                      <SelectContent>
                        {cpus.map((c) => (
                          <SelectItem key={c} value={c}>Apple {c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* RAM */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">3</span>
                      <MemoryStick className="w-4 h-4" />
                      Оперативная память
                    </label>
                    <Select value={ram ? String(ram) : ''} onValueChange={(v) => setRam(Number(v))} disabled={!cpu}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите RAM" />
                      </SelectTrigger>
                      <SelectContent>
                        {rams.map((r) => (
                          <SelectItem key={r} value={String(r)}>{r} GB</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* SSD */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">4</span>
                      <HardDrive className="w-4 h-4" />
                      Накопитель SSD
                    </label>
                    <Select value={ssd ? String(ssd) : ''} onValueChange={(v) => setSsd(Number(v))} disabled={!ram}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите SSD" />
                      </SelectTrigger>
                      <SelectContent>
                        {ssds.map((s) => (
                          <SelectItem key={s} value={String(s)}>{formatSsd(s)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Состояние */}
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
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
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
            <h2 className="text-2xl font-bold text-center mb-8">Как это работает?</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Анализ рынка</h3>
                  <p className="text-sm text-muted-foreground">
                    Ежедневно собираем данные о ценах на MacBook с открытого рынка
                  </p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Расчет медианы</h3>
                  <p className="text-sm text-muted-foreground">
                    Удаляем выбросы и рассчитываем справедливую рыночную цену
                  </p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wallet className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Честная цена выкупа</h3>
                  <p className="text-sm text-muted-foreground">
                    Предлагаем до 90% от рыночной стоимости с мгновенной выплатой
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.section>

          {/* Преимущества */}
          <motion.section 
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h2 className="text-2xl font-bold text-center mb-8">Почему выбирают нас</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-6 bg-card rounded-xl border">
                <Clock className="w-8 h-8 mx-auto mb-3 text-primary" />
                <p className="font-semibold">Быстрая оценка</p>
                <p className="text-sm text-muted-foreground">30 секунд онлайн</p>
              </div>
              <div className="text-center p-6 bg-card rounded-xl border">
                <Wallet className="w-8 h-8 mx-auto mb-3 text-primary" />
                <p className="font-semibold">Оплата сразу</p>
                <p className="text-sm text-muted-foreground">Наличные или перевод</p>
              </div>
              <div className="text-center p-6 bg-card rounded-xl border">
                <TrendingUp className="w-8 h-8 mx-auto mb-3 text-primary" />
                <p className="font-semibold">Честная цена</p>
                <p className="text-sm text-muted-foreground">До 90% от рынка</p>
              </div>
              <div className="text-center p-6 bg-card rounded-xl border">
                <Shield className="w-8 h-8 mx-auto mb-3 text-primary" />
                <p className="font-semibold">Безопасно</p>
                <p className="text-sm text-muted-foreground">Официальная сделка</p>
              </div>
            </div>
          </motion.section>

          {/* CTA */}
          <motion.section 
            className="text-center py-12 px-6 bg-primary/5 rounded-2xl border"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Готовы продать MacBook?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Свяжитесь с нами для точной оценки и быстрой сделки. 
              Выезд специалиста по Москве бесплатно.
            </p>
            <Button size="lg" asChild>
              <a href="https://t.me/romanmanro" target="_blank" rel="noopener noreferrer">
                Написать в Telegram
              </a>
            </Button>
          </motion.section>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Sell;
