import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
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
import { Input } from '@/components/ui/input';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import SEOHead from '@/components/SEOHead';
import { Clock, Wallet, TrendingUp, Shield, BarChart3, Cpu, HardDrive, MemoryStick, Sparkles, Search, X, Check, CheckCircle2, MapPin, Truck, RefreshCw } from 'lucide-react';
import { generateProductSchema, generateLocalBusinessSchema } from '@/lib/structured-data';

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
    // Загружаем конфигурации URL (для опций формы)
    loadAvitoUrls().then(setUrlsData);

    // Загружаем данные о ценах (результаты парсера)
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

    // Если данных нет в базе или менее 2 объявлений — редкая модель
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

  const productSchema = generateProductSchema({
    name: "Выкуп MacBook в Москве",
    price: 50000,
    condition: "UsedCondition",
    description: "Узнайте реальную рыночную стоимость вашего MacBook. Оценка на основе анализа открытого рынка."
  });

  const localBusinessSchema = generateLocalBusinessSchema();

  // Объединенная схема
  const schemaGraph = {
    "@context": "https://schema.org",
    "@graph": [productSchema, localBusinessSchema]
  };

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
                              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-accent flex items-center justify-between ${modelName === model ? 'bg-accent' : ''
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

                  {/* Процессор */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">2</span>
                      <Cpu className="w-4 h-4" />
                      Процессор
                    </label>
                    <Select
                      value={processor}
                      onValueChange={setProcessor}
                      disabled={!modelName || processorOptions.length === 0}
                    >
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

                  {/* RAM */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">3</span>
                      <MemoryStick className="w-4 h-4" />
                      Оперативная память
                    </label>
                    <Select
                      value={ram ? String(ram) : ''}
                      onValueChange={(v) => setRam(Number(v))}
                      disabled={!processor || ramOptions.length === 0}
                    >
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

                  {/* SSD */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">4</span>
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

                  <Button
                    onClick={handleCalculate}
                    className="w-full"
                    size="lg"
                    disabled={!isFormComplete}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Узнать стоимость
                  </Button>

                  {/* Ссылка на TG для ненайденных моделей */}
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    Не нашли свою модель?{' '}
                    <a
                      href="https://t.me/romanmanro"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Напишите мне в Telegram
                    </a>
                  </p>
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
                  ) : result.isRareModel ? (
                    /* Редкая модель - мало объявлений */
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
                            {processor} / {ram} GB RAM / {formatSsd(Number(ssd))}
                          </p>
                        </div>
                      )}

                      {/* Сообщение о редкой модели */}
                      <div className="text-center p-6 bg-amber-500/10 rounded-xl border-2 border-amber-500/30">
                        <p className="text-2xl md:text-3xl font-bold text-amber-600 mb-3">
                          🔮 У вас редкая модель!
                        </p>
                        <p className="text-muted-foreground">
                          Свяжитесь со мной и предложите вашу цену на данную модель
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
                          Написать в Telegram
                        </a>
                      </Button>
                    </motion.div>
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
                            {processor} / {ram} GB RAM / {formatSsd(Number(ssd))}
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

          {/* SEO Block: LSI Тексты и Описание */}
          <motion.section
            className="mb-16 grid lg:grid-cols-2 gap-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-4">Какие MacBook мы выкупаем?</h2>
                <p className="text-muted-foreground mb-4">
                  Мы занимаемся узкоспециализированной скупкой ноутбуков Apple в Москве.
                  Благодаря фокусу только на макбуках, мы предлагаем цену выше, чем в Trade-In или обычных ломбардах.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span><strong>MacBook Pro</strong> (13", 14", 16") с 2016 по 2024 год. На процессорах Intel и <strong>Apple Silicon (M1, M2, M3, M4)</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span><strong>MacBook Air</strong> (13", 15") от старых моделей до последних релизов на <strong>M2 и M3</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span><strong>Любое состояние:</strong> б/у, идеальное, как новые, с коробкой и без.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span><strong>Проблемные:</strong> выкупаем сломанные макбуки, залитые водой, разбитые (на запчасти).</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="space-y-6 bg-muted/30 p-6 md:p-8 rounded-2xl border">
              <h3 className="text-xl font-bold mb-4">Продать макбук за 4 шага:</h3>

              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted-foreground/20 before:to-transparent hidden sm:block">
                {/* Steps implemented below in normal flow for mobile, styled differently */}
              </div>

              <div className="space-y-6 relative">
                {/* Step 1 */}
                <div className="relative flex items-center md:items-start gap-4 z-10">
                  <div className="w-10 h-10 rounded-full bg-background border-2 border-primary flex items-center justify-center shrink-0 shadow-sm">
                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-base font-bold">Оценка стоимости онлайн</h4>
                    <p className="text-sm text-muted-foreground mt-1">Воспользуйтесь калькулятором выше или напишите нам в Telegram для точной оценки.</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative flex items-center md:items-start gap-4 z-10">
                  <div className="w-10 h-10 rounded-full bg-background border-2 border-primary flex items-center justify-center shrink-0 shadow-sm">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold">Договариваемся о встрече</h4>
                    <p className="text-sm text-muted-foreground mt-1">Приезжайте к нам в офис в Москве или вызовите оценщика в удобное для вас место (кафе, метро).</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative flex items-center md:items-start gap-4 z-10">
                  <div className="w-10 h-10 rounded-full bg-background border-2 border-primary flex items-center justify-center shrink-0 shadow-sm">
                    <RefreshCw className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold">Быстрая диагностика</h4>
                    <p className="text-sm text-muted-foreground mt-1">Проверяем экран, батарею, порты и отвязываем ваш iCloud. Занимает ровно 15 минут.</p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="relative flex items-center md:items-start gap-4 z-10">
                  <div className="w-10 h-10 rounded-full bg-background border-2 border-primary flex items-center justify-center shrink-0 shadow-sm">
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold">Выплата наличными или на карту</h4>
                    <p className="text-sm text-muted-foreground mt-1">Отдаем деньги сразу на месте. Сумма точно соответствует оговоренной после диагностики.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Как это работает (Старый блок, оставляем как "Как мы рассчитываем цену") */}
          <motion.section
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h2 className="text-2xl font-bold text-center mb-8">Откуда берется смета онлайн-оценки</h2>

            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Анализ рынка в реальном времени</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Каждый день мы парсим сотни объявлений о продаже б/у MacBook
                    на открытом рынке Авито и других площадок.
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
