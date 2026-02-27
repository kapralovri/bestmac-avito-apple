import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { Clock, Wallet, TrendingUp, Shield, BarChart3, Cpu, HardDrive, MemoryStick, Sparkles, Search, X, Check } from 'lucide-react';
import { slugToModelName, modelShortName, modelToSlug, POPULAR_MODELS } from '@/lib/model-slugs';
import { generateBreadcrumbSchema } from '@/lib/structured-data';
import { Link } from 'react-router-dom';

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

const SellModel = () => {
  const { model_slug } = useParams<{ model_slug: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<AvitoPricesData | null>(null);
  const [urlsData, setUrlsData] = useState<AvitoUrlsData | null>(null);
  const [totalListings, setTotalListings] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [resolvedModel, setResolvedModel] = useState<string>('');

  // Стараемся резолвить модель синхронно (важно для SEO/валидаторов),
  // чтобы мета-теги не были "пустыми" до загрузки JSON.
  const popularModelName = useMemo(() => {
    if (!model_slug) return '';
    return POPULAR_MODELS.find((m) => m.slug === model_slug)?.name ?? '';
  }, [model_slug]);

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

  // Автовыбор модели по slug
  useEffect(() => {
    if (!urlsData || !model_slug) return;
    const allModels = getModelsFromConfig(urlsData);
    const matched = slugToModelName(model_slug, allModels);
    if (matched) {
      setModelName(matched);
      setResolvedModel(matched);
    } else {
      navigate('/sell', { replace: true });
    }
  }, [urlsData, model_slug, navigate]);

  // Автовыбор процессора если один
  useEffect(() => {
    if (!urlsData || !modelName) return;
    const procs = getProcessorsFromConfig(urlsData, modelName);
    if (procs.length === 1) setProcessor(procs[0]);
  }, [urlsData, modelName]);

  const models = useMemo(() => {
    if (!urlsData) return [];
    return filterModels(getModelsFromConfig(urlsData), modelSearch);
  }, [urlsData, modelSearch]);

  const processorOptions = useMemo(() => {
    if (!urlsData || !modelName) return [];
    return getProcessorsFromConfig(urlsData, modelName);
  }, [urlsData, modelName]);

  const ramOptions = useMemo(() => {
    if (!urlsData || !modelName || !processor) return [];
    return getRamFromConfig(urlsData, modelName, processor);
  }, [urlsData, modelName, processor]);

  const ssdOptions = useMemo(() => {
    if (!urlsData || !modelName || !processor || !ram) return [];
    return getSsdFromConfig(urlsData, modelName, processor, Number(ram));
  }, [urlsData, modelName, processor, ram]);

  useEffect(() => {
    if (resolvedModel && modelName !== resolvedModel) {
      // User changed model — redirect to generic sell or new slug
      const newSlug = modelToSlug(modelName);
      navigate(`/sell/${newSlug}`, { replace: true });
    }
  }, [modelName]);

  useEffect(() => { setProcessor(''); setRam(''); setSsd(''); setResult(null); }, [modelName]);
  useEffect(() => { setRam(''); setSsd(''); setResult(null); }, [processor]);
  useEffect(() => { setSsd(''); setResult(null); }, [ram]);

  const handleCalculate = () => {
    if (!data || !modelName || !processor || !ram || !ssd) return;
    const stat = findPriceStat(data.stats, modelName, Number(ram), Number(ssd), processor);
    if (!stat || stat.samples_count < 2) {
      setResult({ marketMin: 0, marketMax: 0, marketMedian: 0, buyoutPrice: 0, samplesCount: stat?.samples_count ?? 0, isRareModel: true });
      return;
    }
    const priceResult = calculateBuyoutPrice(stat, condition);
    setResult({ marketMin: priceResult.marketMin, marketMax: priceResult.marketMax, marketMedian: priceResult.marketMedian, buyoutPrice: priceResult.buyoutPrice, samplesCount: priceResult.samplesCount, isRareModel: false });
  };

  const isFormComplete = modelName && processor && ram && ssd;
  const shortName = resolvedModel ? modelShortName(resolvedModel) : '';
  const seoModelName = popularModelName || resolvedModel || '';

  const seoTitle = useMemo(() => {
    if (model_slug === 'macbook-air-13-2020-m1') {
      return 'Выкуп MacBook Air 13 (2020, M1) в Москве дорого — BestMac';
    }
    if (seoModelName) return `Выкуп ${seoModelName} в Москве дорого — BestMac`;
    return 'Выкуп MacBook конкретной модели в Москве — BestMac';
  }, [model_slug, seoModelName]);

  const seoDescription = useMemo(() => {
    if (model_slug === 'macbook-air-13-2020-m1') {
      return 'Узнайте реальную стоимость выкупа вашего MacBook Air 13 (2020, M1). Прозрачная оценка, выплата до 80% от рынка, деньги сразу.';
    }
    if (seoModelName) {
      return `Узнайте реальную стоимость выкупа вашего ${seoModelName}. Прозрачная оценка, выплата до 80% от рынка, деньги сразу.`;
    }
    return 'Онлайн-оценка стоимости выкупа вашей модели MacBook. Узнайте рыночную цену за 10 секунд и продайте выгодно в BestMac.';
  }, [model_slug, seoModelName]);

  // SEO schemas
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Главная', url: '/' },
    { name: 'Выкуп', url: '/sell' },
    { name: shortName || 'Модель', url: `/sell/${model_slug}` },
  ]);

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "BestMac",
    "url": "https://bestmac.ru",
    "telephone": "+7-903-299-00-29",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "ул. Дениса Давыдова 3",
      "addressLocality": "Москва",
      "addressCountry": "RU"
    }
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": `Калькулятор выкупа ${shortName}`,
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "RUB"
    },
    "description": `Онлайн-калькулятор для оценки стоимости выкупа ${shortName}. Узнайте рыночную цену за 10 секунд.`
  };

  const combinedSchema = [breadcrumbSchema, organizationSchema, softwareAppSchema];

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
        title={seoTitle}
        description={seoDescription}
        canonical={model_slug ? `/sell/${model_slug}` : '/sell'}
        keywords={
          seoModelName
            ? `продать ${seoModelName}, выкуп ${seoModelName}, цена ${seoModelName} б/у москва`
            : 'продать macbook, выкуп macbook, цена macbook б/у москва'
        }
        schema={combinedSchema}
        ogImage="https://bestmac.ru/og-image.jpg"
      />
      <Header />

      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={[
          { name: 'Главная', url: '/' },
          { name: 'Выкуп', url: '/sell' },
          { name: shortName || 'Модель', url: `/sell/${model_slug}` },
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
              Выкуп {shortName} в Москве
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
              Узнайте реальную рыночную стоимость вашего {shortName} прямо сейчас.
              Оценка на основе анализа {totalListings > 0 ? totalListings.toLocaleString('ru-RU') : '800+'} объявлений.
            </p>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
                <Clock className="w-4 h-4 text-primary" />
                <span>10 секунд</span>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span>Реальные цены рынка</span>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span>Деньги в день обращения</span>
              </div>
            </div>
          </motion.div>

          {/* Калькулятор */}
          <div className="grid lg:grid-cols-2 gap-8 mb-16">
            {/* Форма */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Параметры {shortName}
                  </CardTitle>
                  <CardDescription>Выберите конфигурацию вашего устройства</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Модель */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">1</span>
                        Модель
                      </label>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-md border border-primary/20">
                      <Check className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{modelName || 'Загрузка...'}</span>
                    </div>
                  </div>

                  {/* Процессор */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">2</span>
                      <Cpu className="w-4 h-4" /> Процессор
                    </label>
                    <Select value={processor} onValueChange={setProcessor} disabled={!modelName || processorOptions.length === 0}>
                      <SelectTrigger><SelectValue placeholder={processorOptions.length === 0 && modelName ? "Нет данных" : "Выберите процессор"} /></SelectTrigger>
                      <SelectContent>{processorOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  {/* RAM */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">3</span>
                      <MemoryStick className="w-4 h-4" /> Оперативная память
                    </label>
                    <Select value={ram ? String(ram) : ''} onValueChange={(v) => setRam(Number(v))} disabled={!processor || ramOptions.length === 0}>
                      <SelectTrigger><SelectValue placeholder={ramOptions.length === 0 && processor ? "Нет данных" : "Выберите RAM"} /></SelectTrigger>
                      <SelectContent>{ramOptions.map((r) => <SelectItem key={r} value={String(r)}>{r} GB</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  {/* SSD */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">4</span>
                      <HardDrive className="w-4 h-4" /> Накопитель SSD
                    </label>
                    <Select value={ssd ? String(ssd) : ''} onValueChange={(v) => setSsd(Number(v))} disabled={!ram || ssdOptions.length === 0}>
                      <SelectTrigger><SelectValue placeholder={ssdOptions.length === 0 && ram ? "Нет данных" : "Выберите SSD"} /></SelectTrigger>
                      <SelectContent>{ssdOptions.map((s) => <SelectItem key={s} value={String(s)}>{formatSsd(s)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  {/* Состояние */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">5</span>
                      <Shield className="w-4 h-4" /> Состояние
                    </label>
                    <Select value={condition} onValueChange={(v) => setCondition(v as ConditionValue)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <TrendingUp className="w-4 h-4 mr-2" /> Узнать стоимость
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Результат */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Рыночная стоимость</CardTitle>
                  <CardDescription>{lastUpdate && `Данные обновлены: ${lastUpdate}`}</CardDescription>
                </CardHeader>
                <CardContent>
                  {!result ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                      <BarChart3 className="w-12 h-12 mb-4 opacity-30" />
                      <p>Заполните параметры устройства</p>
                      <p className="text-sm">и нажмите «Узнать стоимость»</p>
                    </div>
                  ) : result.isRareModel ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                      {modelName && (
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="font-medium">{modelName}</p>
                          <p className="text-sm text-muted-foreground">{processor} / {ram} GB RAM / {formatSsd(Number(ssd))}</p>
                        </div>
                      )}
                      <div className="text-center p-6 bg-amber-500/10 rounded-xl border-2 border-amber-500/30">
                        <p className="text-2xl md:text-3xl font-bold text-amber-600 mb-3">🔮 У вас редкая модель!</p>
                        <p className="text-muted-foreground">Свяжитесь со мной и предложите вашу цену</p>
                      </div>
                      <Button variant="default" size="lg" className="w-full" asChild>
                        <a href="https://t.me/romanmanro" target="_blank" rel="noopener noreferrer">
                          <Wallet className="w-4 h-4 mr-2" /> Написать в Telegram
                        </a>
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                      {modelName && (
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="font-medium">{modelName}</p>
                          <p className="text-sm text-muted-foreground">{processor} / {ram} GB RAM / {formatSsd(Number(ssd))}</p>
                        </div>
                      )}
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
                          <Wallet className="w-4 h-4 mr-2" /> Продать сейчас
                        </a>
                      </Button>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Другие модели */}
          <motion.section className="mb-16" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
            <h2 className="text-2xl font-bold text-center mb-8">Выкуп других моделей MacBook</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {POPULAR_MODELS.filter(m => m.slug !== model_slug).map(m => (
                <Link key={m.slug} to={`/sell/${m.slug}`} className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-full text-sm transition-colors">
                  {modelShortName(m.name)}
                </Link>
              ))}
            </div>
          </motion.section>

          {/* Как это работает */}
          <motion.section className="mb-16" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
            <h2 className="text-2xl font-bold text-center mb-8">Как мы рассчитываем цену</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2"><BarChart3 className="w-5 h-5 text-primary" /></div>
                  <CardTitle className="text-lg">Анализ рынка</CardTitle>
                </CardHeader>
                <CardContent><p className="text-muted-foreground text-sm">Каждый день мы анализируем сотни объявлений о продаже MacBook на открытом рынке.</p></CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2"><TrendingUp className="w-5 h-5 text-primary" /></div>
                  <CardTitle className="text-lg">Умная фильтрация</CardTitle>
                </CardHeader>
                <CardContent><p className="text-muted-foreground text-sm">Отсеиваем завышенные и заниженные цены, оставляя только актуальные предложения.</p></CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2"><Shield className="w-5 h-5 text-primary" /></div>
                  <CardTitle className="text-lg">Честная оценка</CardTitle>
                </CardHeader>
                <CardContent><p className="text-muted-foreground text-sm">Цена выкупа учитывает состояние устройства и включает нашу комиссию за быструю сделку.</p></CardContent>
              </Card>
            </div>
          </motion.section>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default SellModel;
