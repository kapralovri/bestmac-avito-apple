import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, TrendingUp, Cpu, Zap, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import {
  loadAvitoPrices,
  loadAvitoUrls,
  getModelsFromConfig,
  getProcessorsFromConfig,
  getRamFromConfig,
  getSsdFromConfig,
  findPriceStat,
  formatPrice,
  formatSsd,
} from "@/lib/avito-prices";
import type { AvitoPricesData, AvitoPriceStat } from "@/types/avito-prices";
import type { AvitoUrlsData } from "@/lib/avito-prices";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Relative performance scores, M1 = 100
const PERF: Record<string, { cpu: number; gpu: number }> = {
  "Apple M1":     { cpu: 100, gpu: 100 },
  "Apple M2":     { cpu: 118, gpu: 146 },
  "Apple M3":     { cpu: 138, gpu: 208 },
  "Apple M4":     { cpu: 224, gpu: 292 },
  "Apple M1 Pro": { cpu: 102, gpu: 217 },
  "Apple M2 Pro": { cpu: 116, gpu: 288 },
  "Apple M3 Pro": { cpu: 132, gpu: 342 },
  "Apple M4 Pro": { cpu: 224, gpu: 500 },
  "Apple M1 Max": { cpu: 104, gpu: 438 },
  "Apple M2 Max": { cpu: 118, gpu: 563 },
  "Apple M3 Max": { cpu: 134, gpu: 708 },
  "Apple M4 Max": { cpu: 228, gpu: 958 },
};

function getPerfScore(proc: string) {
  return PERF[proc] ?? { cpu: 100, gpu: 100 };
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta <= 0) return null;
  const label = `+${Math.round(delta)}%`;
  const color =
    delta >= 50 ? "bg-green-500/20 text-green-400 border-green-500/30" :
    delta >= 20 ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                  "bg-zinc-700/60 text-zinc-300 border-zinc-600/30";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${color}`}>
      {label}
    </span>
  );
}

interface PanelProps {
  label: string;
  urlsData: AvitoUrlsData | null;
  onStatChange: (stat: AvitoPriceStat | null) => void;
}

function DevicePanel({ label, urlsData, onStatChange }: PanelProps) {
  const [pricesData, setPricesData] = useState<AvitoPricesData | null>(null);
  const [modelName, setModelName] = useState("");
  const [processor, setProcessor] = useState("");
  const [ram, setRam] = useState<number | "">("");
  const [ssd, setSsd] = useState<number | "">("");

  useEffect(() => {
    loadAvitoPrices().then(setPricesData);
  }, []);

  const models = useMemo(() => {
    if (!urlsData) return [];
    return getModelsFromConfig(urlsData);
  }, [urlsData]);

  const procOptions = useMemo(() => {
    if (!urlsData || !modelName) return [];
    return getProcessorsFromConfig(urlsData, modelName);
  }, [urlsData, modelName]);

  const ramOptions = useMemo(() => {
    if (!urlsData || !modelName || !processor) return [];
    return getRamFromConfig(urlsData, modelName, processor);
  }, [urlsData, modelName, processor]);

  const ssdOptions = useMemo(() => {
    if (!urlsData || !modelName || !processor || ram === "") return [];
    return getSsdFromConfig(urlsData, modelName, processor, ram as number);
  }, [urlsData, modelName, processor, ram]);

  // Propagate stat up
  useEffect(() => {
    if (!pricesData || !modelName || !processor || ram === "" || ssd === "") {
      onStatChange(null);
      return;
    }
    const stat = findPriceStat(pricesData.stats, modelName, ram as number, ssd as number, processor);
    onStatChange(stat ?? null);
  }, [pricesData, modelName, processor, ram, ssd]);

  function reset(level: "model" | "proc" | "ram") {
    if (level === "model") { setModelName(""); setProcessor(""); setRam(""); setSsd(""); }
    if (level === "proc") { setProcessor(""); setRam(""); setSsd(""); }
    if (level === "ram") { setRam(""); setSsd(""); }
  }

  return (
    <Card className="bg-zinc-900/60 border-zinc-800 flex-1">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Model */}
        <Select value={modelName} onValueChange={(v) => { setModelName(v); reset("model"); }}>
          <SelectTrigger className="bg-zinc-800/60 border-zinc-700 text-sm">
            <SelectValue placeholder="Модель" />
          </SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Processor */}
        {modelName && (
          <Select value={processor} onValueChange={(v) => { setProcessor(v); reset("proc"); }}>
            <SelectTrigger className="bg-zinc-800/60 border-zinc-700 text-sm">
              <SelectValue placeholder="Процессор" />
            </SelectTrigger>
            <SelectContent>
              {procOptions.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* RAM */}
        {processor && (
          <Select value={String(ram)} onValueChange={(v) => { setRam(Number(v)); reset("ram"); }}>
            <SelectTrigger className="bg-zinc-800/60 border-zinc-700 text-sm">
              <SelectValue placeholder="RAM" />
            </SelectTrigger>
            <SelectContent>
              {ramOptions.map((r) => (
                <SelectItem key={r} value={String(r)}>{r} GB</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* SSD */}
        {ram !== "" && (
          <Select value={String(ssd)} onValueChange={(v) => setSsd(Number(v))}>
            <SelectTrigger className="bg-zinc-800/60 border-zinc-700 text-sm">
              <SelectValue placeholder="SSD" />
            </SelectTrigger>
            <SelectContent>
              {ssdOptions.map((s) => (
                <SelectItem key={s} value={String(s)}>{formatSsd(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardContent>
    </Card>
  );
}

export default function Upgrade() {
  const [urlsData, setUrlsData] = useState<AvitoUrlsData | null>(null);
  const [fromStat, setFromStat] = useState<AvitoPriceStat | null>(null);
  const [toStat, setToStat] = useState<AvitoPriceStat | null>(null);

  useEffect(() => {
    loadAvitoUrls().then(setUrlsData);
  }, []);

  const result = useMemo(() => {
    if (!fromStat || !toStat) return null;

    const tradeIn = fromStat.buyout_price;
    const targetMin = toStat.min_price;
    const targetMedian = toStat.median_price;
    const upgradeCost = targetMin - tradeIn;

    const fromPerf = getPerfScore(fromStat.processor);
    const toPerf = getPerfScore(toStat.processor);
    const cpuDelta = ((toPerf.cpu - fromPerf.cpu) / fromPerf.cpu) * 100;
    const gpuDelta = ((toPerf.gpu - fromPerf.gpu) / fromPerf.gpu) * 100;

    return { tradeIn, targetMin, targetMedian, upgradeCost, cpuDelta, gpuDelta };
  }, [fromStat, toStat]);

  const breadcrumbs = [
    { label: "Главная", href: "/" },
    { label: "Калькулятор апгрейда" },
  ];

  return (
    <>
      <SEOHead
        title="Калькулятор апгрейда MacBook — сколько стоит обновление"
        description="Узнайте точную стоимость апгрейда MacBook: сдайте старый и купите новый. Расчёт на основе реальных рыночных цен Авито."
        canonical="/upgrade"
      />
      <Header />
      <main className="min-h-screen bg-background">
        <div className="apple-container-wide py-8 md:py-12">
          <Breadcrumbs items={breadcrumbs} />

          <div className="mt-6 mb-10">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
              Калькулятор апгрейда
            </h1>
            <p className="mt-2 text-muted-foreground text-sm md:text-base max-w-xl">
              Выберите текущий MacBook и желаемый — узнайте точную доплату и прирост производительности
            </p>
          </div>

          {/* Two panels */}
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <DevicePanel label="Мой MacBook" urlsData={urlsData} onStatChange={setFromStat} />

            <div className="flex items-center justify-center md:pt-20 text-zinc-600">
              <ArrowRight className="w-6 h-6" />
            </div>

            <DevicePanel label="Хочу" urlsData={urlsData} onStatChange={setToStat} />
          </div>

          {/* Result */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.3 }}
                className="mt-8"
              >
                <Card className="bg-zinc-900/60 border-zinc-800">
                  <CardContent className="pt-6 pb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                      {/* Trade-in */}
                      <div className="space-y-1">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Выкуп вашего</p>
                        <p className="text-2xl font-semibold text-foreground">
                          {formatPrice(result.tradeIn)}
                        </p>
                        <p className="text-xs text-zinc-500">BestMac заберёт у вас</p>
                      </div>

                      {/* Target price */}
                      <div className="space-y-1">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Цена на рынке</p>
                        <p className="text-2xl font-semibold text-foreground">
                          от {formatPrice(result.targetMin)}
                        </p>
                        <p className="text-xs text-zinc-500">медиана {formatPrice(result.targetMedian)}</p>
                      </div>

                      {/* Upgrade cost */}
                      <div className="space-y-1">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Доплата</p>
                        <p className={`text-2xl font-semibold ${result.upgradeCost > 0 ? "text-foreground" : "text-green-400"}`}>
                          {result.upgradeCost > 0
                            ? formatPrice(result.upgradeCost)
                            : `+${formatPrice(Math.abs(result.upgradeCost))}`}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {result.upgradeCost > 0 ? "нужно доплатить" : "получите при обмене"}
                        </p>
                      </div>

                      {/* Performance */}
                      <div className="space-y-2">
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Прирост</p>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <Cpu className="w-3.5 h-3.5 text-zinc-500" />
                            <span className="text-xs text-zinc-400">CPU</span>
                            {result.cpuDelta > 0
                              ? <DeltaBadge delta={result.cpuDelta} />
                              : <span className="text-xs text-zinc-600">без изменений</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-zinc-500" />
                            <span className="text-xs text-zinc-400">GPU</span>
                            {result.gpuDelta > 0
                              ? <DeltaBadge delta={result.gpuDelta} />
                              : <span className="text-xs text-zinc-600">без изменений</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="mt-6 pt-5 border-t border-zinc-800 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                      <p className="text-sm text-zinc-400">
                        Цены на основе реальных объявлений Авито. Выкуп — рекомендуемая цена BestMac.
                      </p>
                      <a
                        href="/contact"
                        className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm px-5 py-2 rounded-full hover:bg-primary/90 transition-colors whitespace-nowrap"
                      >
                        Оформить апгрейд
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state hint */}
          {!result && (
            <div className="mt-8 flex items-center gap-2 text-sm text-zinc-600">
              <RefreshCw className="w-4 h-4" />
              Выберите оба устройства для расчёта
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
