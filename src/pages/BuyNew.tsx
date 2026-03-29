import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, RefreshCw } from "lucide-react";

interface Product {
  name: string;
  price: number;
  source_price: number;
  flags: string[];
  is_activated: boolean;
  category: string;
  category_display: string;
}

interface ProductsData {
  updated_at: string | null;
  categories_found: string[];
  items: Product[];
}

const CATEGORIES = [
  { key: "all", label: "Все" },
  { key: "imac", label: "iMac" },
  { key: "macbook_air", label: "MacBook Air" },
  { key: "macbook_pro", label: "MacBook Pro" },
  { key: "iphone_17", label: "iPhone 17 / Air" },
  { key: "iphone_17_pro", label: "iPhone 17 Pro" },
];

const TG_LINK = "https://t.me/bestmac_moscow";

function formatPrice(price: number): string {
  return price.toLocaleString("ru-RU") + " ₽";
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  });
}

const BuyNew = () => {
  const [data, setData] = useState<ProductsData | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");

  const breadcrumbItems = [
    { name: "Главная", url: "/" },
    { name: "Купить", url: "/buy" },
    { name: "Новая техника", url: "/buy/new" },
  ];

  useEffect(() => {
    fetch("/data/new-products.json")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  const filtered = data?.items.filter(
    (p) => activeCategory === "all" || p.category === activeCategory
  ) ?? [];

  const categoryCounts = data
    ? CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
        acc[cat.key] =
          cat.key === "all"
            ? data.items.length
            : data.items.filter((p) => p.category === cat.key).length;
        return acc;
      }, {})
    : {};

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Новая техника Apple в Москве — цены на MacBook, iPhone, iMac | BestMac"
        description="Новые MacBook Air, MacBook Pro, iMac, iPhone 17 в Москве. Актуальные цены, официальные поставки. Гарантия. Доставка."
        canonical="/buy/new"
        keywords="купить новый macbook москва, новый iphone 17 москва, imac цена москва, macbook pro новый"
      />
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={breadcrumbItems} />

        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold font-apple mb-4">
            Новая техника Apple
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-2">
            Официальные поставки. Цены обновляются ежедневно.
          </p>
          {data?.updated_at && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Обновлено {formatDate(data.updated_at)} МСК
            </p>
          )}
        </motion.div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.key] ?? 0;
            if (cat.key !== "all" && count === 0) return null;
            return (
              <Button
                key={cat.key}
                variant={activeCategory === cat.key ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(cat.key)}
                className="gap-1.5"
              >
                {cat.label}
                {count > 0 && (
                  <span className="text-xs opacity-70">({count})</span>
                )}
              </Button>
            );
          })}
        </div>

        {/* Disclaimer */}
        <div className="bg-muted/50 border rounded-lg px-4 py-3 mb-6 text-sm text-muted-foreground">
          Цены актуальны на дату последнего обновления. Для оформления заказа
          напишите нам в Telegram — уточним наличие и договоримся об условиях.
        </div>

        {/* Products grid */}
        {!data ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            Нет позиций в этой категории
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((product, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(idx * 0.03, 0.4) }}
                className="border rounded-xl p-4 bg-card hover:shadow-md transition-shadow flex flex-col gap-3"
              >
                {/* Category badge + flags */}
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {product.category_display}
                  </Badge>
                  <span className="text-base leading-none">
                    {product.flags.join("")}
                  </span>
                </div>

                {/* Name */}
                <p className="text-sm font-medium leading-snug line-clamp-3">
                  {product.name}
                </p>

                {/* Activated badge */}
                {product.is_activated && (
                  <Badge
                    variant="outline"
                    className="text-xs w-fit text-amber-600 border-amber-400"
                  >
                    Активирован
                  </Badge>
                )}

                {/* Price */}
                <div className="mt-auto pt-1 border-t">
                  <p className="text-lg font-bold">{formatPrice(product.price)}</p>
                  <p className="text-xs text-muted-foreground">
                    до наценки: {formatPrice(product.source_price)}
                  </p>
                </div>

                {/* CTA */}
                <a href={TG_LINK} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="w-full gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5" />
                    Узнать наличие
                  </Button>
                </a>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default BuyNew;
