"use client";

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { calculateBuyoutPrice, formatSsd, formatPrice } from '@/lib/avito-prices';
import type { AvitoPriceStat, ConditionValue } from '@/types/avito-prices';
import { CONDITIONS } from '@/types/avito-prices';
import { ramOptions, ssdOptions, findConfig, type SellConfig } from '@/lib/sell-prices';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Breadcrumbs from '@/components/Breadcrumbs';
import LeadForm from '@/components/LeadForm';
import { Clock, Wallet, TrendingUp, Shield, BarChart3, Cpu, HardDrive, MemoryStick, Sparkles, Check, Camera } from 'lucide-react';
import { modelShortName, POPULAR_MODELS } from '@/lib/model-slugs';
import Link from "next/link";

const TELEGRAM_URL = 'https://t.me/romanmanro';

interface SellModelProps {
  /** Название модели из каталога, отрезолвленное на сервере по slug. */
  modelName: string;
  slug: string;
  /**
   * GST-78: конфигурации модели с сервера (src/lib/sell-prices.ts). Раньше
   * калькулятор искал модель в avito-urls.json по точному названию и на 22
   * страницах из 31 не находил ничего.
   */
  configs: SellConfig[];
  totalListings: number;
  updatedLabel: string;
}

type Result =
  | { kind: 'price'; marketMin: number; marketMax: number; marketMedian: number; buyoutPrice: number; samplesCount: number }
  | { kind: 'photo' };

/** calculateBuyoutPrice работает со строкой базы — собираем её из конфигурации. */
function toStat(c: SellConfig): AvitoPriceStat {
  return {
    model_name: '', processor: c.processor, ram: c.ram, ssd: c.ssd,
    median_price: c.medianPrice, min_price: c.minPrice, max_price: c.maxPrice,
    buyout_price: c.buyoutPrice, samples_count: c.samplesCount, updated_at: c.updatedAt,
  };
}

const SellModel = ({ modelName, slug, configs, totalListings, updatedLabel }: SellModelProps) => {
  const [ram, setRam] = useState<number | ''>('');
  const [ssd, setSsd] = useState<number | ''>('');
  const [condition, setCondition] = useState<ConditionValue>('excellent');
  const [result, setResult] = useState<Result | null>(null);

  const shortName = modelShortName(modelName);
  const processor = configs[0]?.processor ?? '';
  const noData = configs.length === 0;
  const ramList = useMemo(() => ramOptions(configs), [configs]);
  const ssdList = useMemo(() => (ram ? ssdOptions(configs, Number(ram)) : []), [configs, ram]);

  useEffect(() => { setSsd(''); setResult(null); }, [ram]);
  useEffect(() => { setResult(null); }, [ssd, condition]);

  const handleCalculate = () => {
    if (!ram || !ssd) return;
    const cfg = findConfig(configs, Number(ram), Number(ssd));
    // GST-78: сумму показываем только по надёжной конфигурации — иначе оценка по фото.
    if (!cfg || !cfg.reliable) {
      setResult({ kind: 'photo' });
      return;
    }
    const r = calculateBuyoutPrice(toStat(cfg), condition);
    setResult({
      kind: 'price', marketMin: r.marketMin, marketMax: r.marketMax, marketMedian: r.marketMedian,
      buyoutPrice: r.buyoutPrice, samplesCount: r.samplesCount,
    });
  };

  const showPhoto = noData || result?.kind === 'photo';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={[
          { name: 'Главная', url: '/' },
          { name: 'Выкуп', url: '/sell' },
          { name: shortName, url: `/sell/${slug}` },
        ]} />

        <div className="max-w-5xl mx-auto">
          {/* Hero — стартуем видимым (opacity:1), чтобы H1 был в HTML и не зависел от JS */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 1, y: 0 }}
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">1</span>
                      Модель
                    </label>
                    <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-md border border-primary/20">
                      <Check className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{modelName}</span>
                    </div>
                  </div>

                  {processor && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">2</span>
                        <Cpu className="w-4 h-4" /> Процессор
                      </label>
                      <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-md border border-primary/20">
                        <Check className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">{processor}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">3</span>
                      <MemoryStick className="w-4 h-4" /> Оперативная память
                    </label>
                    <Select value={ram ? String(ram) : ''} onValueChange={(v) => setRam(Number(v))} disabled={noData}>
                      <SelectTrigger><SelectValue placeholder={noData ? 'Оценим по фото' : 'Выберите RAM'} /></SelectTrigger>
                      <SelectContent>{ramList.map((r) => <SelectItem key={r} value={String(r)}>{r} GB</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">4</span>
                      <HardDrive className="w-4 h-4" /> Накопитель SSD
                    </label>
                    <Select value={ssd ? String(ssd) : ''} onValueChange={(v) => setSsd(Number(v))} disabled={!ram || ssdList.length === 0}>
                      <SelectTrigger><SelectValue placeholder="Выберите SSD" /></SelectTrigger>
                      <SelectContent>{ssdList.map((s) => <SelectItem key={s} value={String(s)}>{formatSsd(s)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

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

                  <Button onClick={handleCalculate} className="w-full" size="lg" disabled={!ram || !ssd}>
                    <TrendingUp className="w-4 h-4 mr-2" /> Узнать стоимость
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Рыночная стоимость</CardTitle>
                  <CardDescription>{updatedLabel && `Данные обновлены: ${updatedLabel}`}</CardDescription>
                </CardHeader>
                <CardContent>
                  {showPhoto ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                      <div className="text-center p-6 bg-primary/5 rounded-xl border-2 border-primary/20">
                        <Camera className="w-10 h-10 mx-auto mb-3 text-primary" />
                        <p className="text-2xl font-bold mb-2">Точную цену назовём по фото за 15 минут</p>
                        <p className="text-muted-foreground">
                          По этой конфигурации мало свежих объявлений — не будем гадать с суммой.
                        </p>
                      </div>
                      <Button variant="default" size="lg" className="w-full" asChild>
                        <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
                          <Wallet className="w-4 h-4 mr-2" /> Отправить фото в Telegram
                        </a>
                      </Button>
                      <Button variant="outline" size="lg" className="w-full" asChild>
                        <a href="#zayavka">Оставить заявку</a>
                      </Button>
                    </motion.div>
                  ) : !result ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                      <BarChart3 className="w-12 h-12 mb-4 opacity-30" />
                      <p>Заполните параметры устройства</p>
                      <p className="text-sm">и нажмите «Узнать стоимость»</p>
                    </div>
                  ) : result.kind === 'price' ? (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
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
                        <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
                          <Wallet className="w-4 h-4 mr-2" /> Продать сейчас
                        </a>
                      </Button>
                    </motion.div>
                  ) : null}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Форма заявки — для оценки по фото, когда суммы нет (GST-78) */}
          {showPhoto && (
            <div id="zayavka" className="mb-16">
              <LeadForm
                formType="sell"
                title={`Оценка ${shortName} по фото`}
                subtitle="Пришлите фото и конфигурацию — назовём цену за 15 минут"
              />
            </div>
          )}

          {/* Другие модели */}
          <motion.section className="mb-16" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
            <h2 className="text-2xl font-bold text-center mb-8">Выкуп других моделей MacBook</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {POPULAR_MODELS.filter(m => m.slug !== slug).map(m => (
                <Link key={m.slug} href={`/sell/${m.slug}`} className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-full text-sm transition-colors">
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
    </div>
  );
};

export default SellModel;
