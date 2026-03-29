import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Flame, Clock, RefreshCw } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/avito-prices";

interface Deal {
  model_name: string;
  processor: string;
  ram: number;
  ssd: number;
  price: number;
  median_price: number;
  discount_percent: number;
  url: string;
  found_at: string;
  deal_score?: number;
  cycles?: number | null;
  is_urgent?: boolean;
}

interface HotDealsData {
  updated_at: string;
  deals: Deal[];
}

function getDealScoreLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 85) return { label: "Отличная сделка", color: "text-green-400", bg: "bg-green-500/15 border-green-500/30" };
  if (score >= 70) return { label: "Хорошая сделка", color: "text-blue-400",  bg: "bg-blue-500/15 border-blue-500/30" };
  if (score >= 50) return { label: "Норм",            color: "text-yellow-400",bg: "bg-yellow-500/15 border-yellow-500/30" };
  return                 { label: "Рыночная цена",    color: "text-zinc-400",  bg: "bg-zinc-700/40 border-zinc-600/30" };
}

function ScoreBadge({ score }: { score: number }) {
  const { label, color, bg } = getDealScoreLabel(score);
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${bg} ${color}`}>
      <span className="font-bold">{score}</span>
      <span className="opacity-70">/ 100</span>
      <span className="hidden sm:inline ml-1 opacity-80">— {label}</span>
    </span>
  );
}

function formatSsdShort(gb: number) {
  return gb >= 1024 ? `${gb / 1024} TB` : `${gb} GB`;
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d} д. назад`;
  if (h > 0) return `${h} ч. назад`;
  return "только что";
}

function DealCard({ deal, index }: { deal: Deal; index: number }) {
  const score = deal.deal_score ?? Math.max(10, Math.round(deal.discount_percent * 2.5));
  const { color } = getDealScoreLabel(score);
  const discountRub = deal.median_price - deal.price;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className="group bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        {/* Score ring */}
        <div className="flex-shrink-0">
          <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-sm ${color} border-current`}>
            {score}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex flex-wrap items-start gap-2 mb-1">
            <h3 className="text-sm font-medium text-foreground leading-tight">
              {deal.model_name}
            </h3>
            {deal.is_urgent && (
              <Badge variant="outline" className="text-orange-400 border-orange-500/30 bg-orange-500/10 text-xs px-2 py-0 h-5">
                срочно
              </Badge>
            )}
          </div>

          {/* Specs */}
          <p className="text-xs text-zinc-500 mb-2">
            {deal.processor} · {deal.ram} GB · {formatSsdShort(deal.ssd)}
            {deal.cycles != null && ` · ${deal.cycles} цикл.`}
          </p>

          {/* Score badge */}
          <ScoreBadge score={score} />
        </div>

        {/* Price block */}
        <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1 flex-shrink-0">
          <div className="text-right">
            <p className="text-lg font-semibold text-foreground">{formatPrice(deal.price)}</p>
            <p className="text-xs text-zinc-500 line-through">{formatPrice(deal.median_price)}</p>
            <p className="text-xs text-green-400 font-medium">
              −{formatPrice(discountRub)} (−{deal.discount_percent.toFixed(0)}%)
            </p>
          </div>

          <a
            href={deal.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-foreground border border-zinc-700 hover:border-zinc-500 rounded-full px-3 py-1.5 transition-colors whitespace-nowrap"
          >
            Авито
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center gap-1.5 text-xs text-zinc-600">
        <Clock className="w-3 h-3" />
        {timeAgo(deal.found_at)}
      </div>
    </motion.div>
  );
}

export default function Deals() {
  const [data, setData] = useState<HotDealsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"score" | "discount" | "price">("score");

  useEffect(() => {
    fetch("/data/hot-deals.json")
      .then((r) => r.json())
      .then((d: HotDealsData) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const sorted = data?.deals
    ? [...data.deals].sort((a, b) => {
        const sa = a.deal_score ?? Math.round(a.discount_percent * 2.5);
        const sb = b.deal_score ?? Math.round(b.discount_percent * 2.5);
        if (sortBy === "score")    return sb - sa;
        if (sortBy === "discount") return b.discount_percent - a.discount_percent;
        if (sortBy === "price")    return a.price - b.price;
        return 0;
      })
    : [];

  const updatedAt = data?.updated_at
    ? new Date(data.updated_at).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
    : "";

  const breadcrumbs = [
    { label: "Главная", href: "/" },
    { label: "Горячие сделки" },
  ];

  return (
    <>
      <SEOHead
        title="Горячие сделки MacBook — лучшие цены на Авито"
        description="Актуальные выгодные предложения MacBook на Авито с оценкой сделки. Сканер обновляется каждые 15 минут."
        canonical="/deals"
      />
      <Header />
      <main className="min-h-screen bg-background">
        <div className="apple-container-wide py-8 md:py-12">
          <Breadcrumbs items={breadcrumbs} />

          <div className="mt-6 mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-5 h-5 text-orange-400" />
                <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
                  Горячие сделки
                </h1>
              </div>
              <p className="text-muted-foreground text-sm">
                MacBook ниже рыночной цены · обновляется каждые 15 минут
                {updatedAt && <span className="ml-2 text-zinc-600">· обновлено {updatedAt}</span>}
              </p>
            </div>

            {/* Sort */}
            <div className="flex gap-2">
              {(["score", "discount", "price"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    sortBy === s
                      ? "border-zinc-500 text-foreground bg-zinc-800"
                      : "border-zinc-700 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {s === "score" ? "По оценке" : s === "discount" ? "По скидке" : "По цене"}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-zinc-600 text-sm py-16 justify-center">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Загружаем сделки...
            </div>
          )}

          {!loading && sorted.length === 0 && (
            <div className="py-16 text-center text-zinc-600 text-sm">
              Горячих сделок пока нет — сканер ищет...
            </div>
          )}

          <div className="space-y-3">
            {sorted.map((deal, i) => (
              <DealCard key={deal.url} deal={deal} index={i} />
            ))}
          </div>

          {sorted.length > 0 && (
            <p className="mt-6 text-xs text-zinc-600 text-center">
              {sorted.length} сделок · Цены на основе медианы {sorted.length > 0 ? sorted[0].model_name.split(" ").slice(0, 3).join(" ") : ""} и других моделей на Авито
            </p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
