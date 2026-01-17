import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, Minus, BarChart3, Clock, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { loadAvitoPrices, formatPrice } from "@/lib/avito-prices";
import type { AvitoPricesData, AvitoPriceStat } from "@/types/avito-prices";

interface ModelGroup {
  name: string;
  stats: AvitoPriceStat[];
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  totalSamples: number;
}

const MarketTrends = () => {
  const [data, setData] = useState<AvitoPricesData | null>(null);
  const [modelGroups, setModelGroups] = useState<ModelGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const pricesData = await loadAvitoPrices();
        setData(pricesData);

        // Group stats by model name
        const groups = new Map<string, AvitoPriceStat[]>();
        pricesData.stats.forEach(stat => {
          if (stat.samples_count > 0) {
            const existing = groups.get(stat.model_name) || [];
            existing.push(stat);
            groups.set(stat.model_name, existing);
          }
        });

        // Calculate aggregates for each model
        const modelGroupsArray: ModelGroup[] = Array.from(groups.entries())
          .map(([name, stats]) => {
            const prices = stats.map(s => s.median_price);
            const samples = stats.reduce((sum, s) => sum + s.samples_count, 0);
            return {
              name,
              stats,
              avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
              minPrice: Math.min(...stats.map(s => s.min_price)),
              maxPrice: Math.max(...stats.map(s => s.max_price)),
              totalSamples: samples
            };
          })
          .filter(g => g.totalSamples >= 5)
          .sort((a, b) => b.totalSamples - a.totalSamples);

        setModelGroups(modelGroupsArray);
      } catch (error) {
        console.error("Error loading market trends:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <section className="py-12">
        <div className="text-center text-muted-foreground">Загрузка данных рынка...</div>
      </section>
    );
  }

  if (!data || modelGroups.length === 0) {
    return null;
  }

  const totalListings = data.total_listings;
  const updatedAt = new Date(data.generated_at).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Get top models by popularity
  const topModels = modelGroups.slice(0, 6);

  // Calculate market overview
  const allPrices = data.stats.filter(s => s.samples_count > 0).map(s => s.median_price);
  const avgMarketPrice = Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length);
  
  // Find best value (lowest price per performance tier)
  const bestValueAir = modelGroups.find(g => g.name.includes('Air'));
  const bestValuePro = modelGroups.find(g => g.name.includes('Pro 14') || g.name.includes('Pro 16'));

  return (
    <section className="py-12" id="market-trends">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold font-apple mb-4 flex items-center justify-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            Тренды рынка MacBook
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Актуальная аналитика цен на основе {totalListings.toLocaleString('ru-RU')} объявлений
          </p>
          <div className="flex items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Обновлено: {updatedAt}
          </div>
        </div>

        {/* Market Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Объявлений на рынке</p>
                  <p className="text-2xl font-bold">{totalListings.toLocaleString('ru-RU')}</p>
                </div>
                <Package className="h-8 w-8 text-primary opacity-70" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Средняя цена</p>
                  <p className="text-2xl font-bold">{formatPrice(avgMarketPrice)}</p>
                </div>
                <Minus className="h-8 w-8 text-muted-foreground opacity-70" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Моделей отслеживаем</p>
                  <p className="text-2xl font-bold">{modelGroups.length}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary opacity-70" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Popular Models */}
        <Card className="mb-8 bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Популярные модели
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topModels.map((model, index) => (
                <motion.div
                  key={model.name}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="p-4 rounded-lg bg-muted/30 border border-border/30 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm">{model.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {model.totalSamples} шт
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Цены:</span>
                      <span className="font-medium">
                        {formatPrice(model.minPrice)} — {formatPrice(model.maxPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Медиана:</span>
                      <span className="font-medium text-primary">
                        {formatPrice(model.avgPrice)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Best Value Recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bestValueAir && (
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-medium text-blue-500">Лучшая цена Air</span>
                </div>
                <h3 className="font-bold text-lg mb-1">{bestValueAir.name}</h3>
                <p className="text-2xl font-bold text-primary">от {formatPrice(bestValueAir.minPrice)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {bestValueAir.totalSamples} предложений на рынке
                </p>
              </CardContent>
            </Card>
          )}

          {bestValuePro && (
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="h-5 w-5 text-purple-500" />
                  <span className="text-sm font-medium text-purple-500">Лучшая цена Pro</span>
                </div>
                <h3 className="font-bold text-lg mb-1">{bestValuePro.name}</h3>
                <p className="text-2xl font-bold text-primary">от {formatPrice(bestValuePro.minPrice)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {bestValuePro.totalSamples} предложений на рынке
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>
    </section>
  );
};

export default MarketTrends;
