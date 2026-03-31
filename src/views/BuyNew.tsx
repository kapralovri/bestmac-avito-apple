"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, X } from "lucide-react";
import {
  ProductCard,
  formatDate,
  tgLink,
  type Product,
  type ProductsData,
} from "@/components/NewProductsSection";

const CATEGORIES = [
  { key: "all", label: "Все" },
  { key: "iphone_17_pro", label: "iPhone 17 Pro / Max" },
  { key: "iphone_17", label: "iPhone 17 / Air" },
  { key: "macbook_air", label: "MacBook Air" },
  { key: "macbook_pro", label: "MacBook Pro" },
  { key: "imac", label: "iMac" },
];

const STORAGE_ORDER = ["128GB", "256GB", "512GB", "1TB", "2TB"];
const RAM_ORDER = ["8GB", "16GB", "24GB", "32GB", "48GB", "64GB"];
const SSD_ORDER = ["256GB", "512GB", "1TB", "2TB"];

function unique<T>(arr: (T | undefined | null)[]): T[] {
  return Array.from(new Set(arr.filter(Boolean) as T[]));
}

function sortValues(vals: string[], order?: string[]): string[] {
  if (!order) return [...vals].sort();
  return [...vals].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

// ─── Filter chip row ───────────────────────────────────────────────────────────
const ChipRow = ({
  label,
  values,
  active,
  onChange,
}: {
  label: string;
  values: string[];
  active: string;
  onChange: (v: string) => void;
}) => {
  if (values.length < 2) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground w-12 shrink-0">{label}</span>
      <button
        onClick={() => onChange("all")}
        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
          active === "all"
            ? "bg-primary text-primary-foreground border-primary"
            : "border-border hover:border-primary/50"
        }`}
      >
        Все
      </button>
      {values.map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
            active === v
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border hover:border-primary/50"
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
};

// ─── JSON-LD product list schema ───────────────────────────────────────────────
function buildSchema(items: Product[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Новая техника Apple — официальные поставки",
    description:
      "Каталог новых iPhone, MacBook, iMac с актуальными ценами в Москве",
    numberOfItems: items.length,
    itemListElement: items.slice(0, 50).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: p.name,
        brand: { "@type": "Brand", name: "Apple" },
        offers: {
          "@type": "Offer",
          price: p.price,
          priceCurrency: "RUB",
          availability: "https://schema.org/InStock",
          seller: { "@type": "Organization", name: "BestMac" },
        },
      },
    })),
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────────
const BuyNew = () => {
  const [data, setData] = useState<ProductsData | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [filterStorage, setFilterStorage] = useState("all");
  const [filterRam, setFilterRam] = useState("all");
  const [filterColor, setFilterColor] = useState("all");

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

  // Reset attribute filters when category changes
  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setFilterStorage("all");
    setFilterRam("all");
    setFilterColor("all");
  };

  const categoryItems = useMemo(
    () =>
      data?.items.filter(
        (p) => activeCategory === "all" || p.category === activeCategory
      ) ?? [],
    [data, activeCategory]
  );

  // Available filter values for current category
  const storageValues = useMemo(
    () =>
      sortValues(unique(categoryItems.map((p) => p.storage)), STORAGE_ORDER),
    [categoryItems]
  );
  const ramValues = useMemo(
    () => sortValues(unique(categoryItems.map((p) => p.ram)), RAM_ORDER),
    [categoryItems]
  );
  const ssdValues = useMemo(
    () => sortValues(unique(categoryItems.map((p) => p.ssd)), SSD_ORDER),
    [categoryItems]
  );
  const colorValues = useMemo(
    () => sortValues(unique(categoryItems.map((p) => p.color))),
    [categoryItems]
  );

  // "Память" = storage for iPhones, SSD for MacBooks
  const memValues = storageValues.length > 1 ? storageValues : ssdValues;

  const filtered = useMemo(
    () =>
      categoryItems.filter((p) => {
        if (filterStorage !== "all") {
          const val = p.storage ?? p.ssd;
          if (val !== filterStorage) return false;
        }
        if (filterRam !== "all" && p.ram !== filterRam) return false;
        if (filterColor !== "all" && p.color !== filterColor) return false;
        return true;
      }),
    [categoryItems, filterStorage, filterRam, filterColor]
  );

  const categoryCounts = useMemo(() => {
    if (!data) return {} as Record<string, number>;
    return CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
      acc[cat.key] =
        cat.key === "all"
          ? data.items.length
          : data.items.filter((p) => p.category === cat.key).length;
      return acc;
    }, {});
  }, [data]);

  const hasActiveFilters =
    filterStorage !== "all" || filterRam !== "all" || filterColor !== "all";

  const schema = data ? buildSchema(data.items) : null;

  // Dynamic meta description
  const iphoneCount =
    (data?.items.filter((p) => p.category.startsWith("iphone")).length ?? 0);
  const macCount =
    (data?.items.filter((p) => p.category.startsWith("macbook")).length ?? 0);
  const metaDesc = `Новая техника Apple в Москве: ${iphoneCount > 0 ? `iPhone 17 Pro / Air (${iphoneCount} позиций), ` : ""}${macCount > 0 ? `MacBook Air M4 / MacBook Pro (${macCount} позиций), ` : ""}iMac. Официальные поставки. Свяжитесь для уточнения цены.`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}
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
            Официальные поставки iPhone 17, MacBook Air M4, iMac. Актуальные цены,
            доставка в Москве.
          </p>
          {data?.updated_at && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Обновлено {formatDate(data.updated_at)} МСК
            </p>
          )}
        </motion.div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.key] ?? 0;
            if (cat.key !== "all" && count === 0) return null;
            return (
              <Button
                key={cat.key}
                variant={activeCategory === cat.key ? "default" : "outline"}
                size="sm"
                onClick={() => handleCategoryChange(cat.key)}
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

        {/* Attribute filters */}
        {(memValues.length > 1 || ramValues.length > 1 || colorValues.length > 1) && (
          <div className="bg-muted/30 border rounded-xl p-3 mb-4 flex flex-col gap-2">
            <ChipRow
              label="Память"
              values={memValues}
              active={filterStorage}
              onChange={setFilterStorage}
            />
            {ramValues.length > 1 && (
              <ChipRow
                label="RAM"
                values={ramValues}
                active={filterRam}
                onChange={setFilterRam}
              />
            )}
            {colorValues.length > 1 && (
              <ChipRow
                label="Цвет"
                values={colorValues}
                active={filterColor}
                onChange={setFilterColor}
              />
            )}
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setFilterStorage("all");
                  setFilterRam("all");
                  setFilterColor("all");
                }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-fit mt-1"
              >
                <X className="w-3 h-3" />
                Сбросить фильтры
              </button>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <div className="flex gap-3 items-start bg-muted/50 border rounded-xl px-4 py-3 mb-6 text-sm text-muted-foreground">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
          <p>
            Цены могут изменяться в связи с колебаниями курса валют. Указанная
            стоимость ориентировочная —{" "}
            <a
              href={tgLink("новая техника Apple")}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              свяжитесь для уточнения финальной стоимости
            </a>
            .
          </p>
        </div>

        {/* Products grid */}
        {!data ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            Нет позиций с выбранными параметрами
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Показано {filtered.length} позиций
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((product, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: Math.min(idx * 0.03, 0.4),
                  }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          </>
        )}
      </main>
</div>
  );
};

export default BuyNew;
