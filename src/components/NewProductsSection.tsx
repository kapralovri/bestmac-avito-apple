"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, RefreshCw, ArrowRight, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

export interface Product {
  name: string;
  price: number;
  source_price: number;
  flags: string[];
  is_activated: boolean;
  category: string;
  category_display: string;
  // Structured fields
  model?: string;
  storage?: string;
  storage_gb?: number;
  color?: string;
  chip?: string;
  ram?: string;
  ram_gb?: number;
  ssd?: string;
  ssd_gb?: number;
}

export interface ProductsData {
  updated_at: string | null;
  categories_found: string[];
  items: Product[];
}

const TG_USERNAME = "romanmanro";
const PREVIEW_COUNT = 6;

const DEVICE_GROUPS = [
  {
    key: "iphone",
    label: "Apple iPhone",
    categories: ["iphone_17_pro", "iphone_17"],
    categoryLabels: { iphone_17_pro: "iPhone 17 Pro / Max", iphone_17: "iPhone 17 / Air" },
  },
  {
    key: "macbook",
    label: "Apple MacBook",
    categories: ["macbook_air", "macbook_pro"],
    categoryLabels: { macbook_air: "MacBook Air", macbook_pro: "MacBook Pro" },
  },
  {
    key: "imac",
    label: "Apple iMac",
    categories: ["imac"],
    categoryLabels: { imac: "iMac" },
  },
];

export function formatPrice(price: number): string {
  return price.toLocaleString("ru-RU") + " ₽";
}

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Moscow",
  });
}

export function tgLink(productName: string): string {
  const text = encodeURIComponent(`Привет! Меня интересует: ${productName}`);
  return `https://t.me/${TG_USERNAME}?text=${text}`;
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function sortValues(vals: string[], order?: string[]): string[] {
  if (!order) return vals.sort();
  return vals.sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

const STORAGE_ORDER = ["128GB", "256GB", "512GB", "1TB", "2TB"];
const RAM_ORDER = ["8GB", "16GB", "24GB", "32GB", "48GB", "64GB"];
const SSD_ORDER = ["256GB", "512GB", "1TB", "2TB"];

// ─── Product card ──────────────────────────────────────────────────────────────

export const ProductCard = ({ product }: { product: Product }) => (
  <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
    <CardContent className="flex flex-col gap-2 p-4 h-full">
      <div className="flex items-start justify-between gap-2">
        <Badge variant="secondary" className="text-xs shrink-0">
          {product.category_display}
        </Badge>
        {product.flags.length > 0 && (
          <span className="text-sm leading-none">{product.flags.join("")}</span>
        )}
      </div>

      <p className="text-sm font-medium leading-snug line-clamp-3 flex-1">
        {product.name}
      </p>

      {/* Spec badges */}
      <div className="flex flex-wrap gap-1">
        {product.storage && (
          <Badge variant="outline" className="text-xs">{product.storage}</Badge>
        )}
        {product.ram && (
          <Badge variant="outline" className="text-xs">{product.ram} RAM</Badge>
        )}
        {product.ssd && (
          <Badge variant="outline" className="text-xs">{product.ssd} SSD</Badge>
        )}
        {product.color && (
          <Badge variant="outline" className="text-xs">{product.color}</Badge>
        )}
        {product.is_activated && (
          <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">
            Активирован
          </Badge>
        )}
      </div>

      <div className="pt-2 border-t mt-auto">
        <p className="text-base font-bold">{formatPrice(product.price)}</p>
      </div>

      <a href={tgLink(product.name)} target="_blank" rel="noopener noreferrer">
        <Button size="sm" className="w-full gap-1.5 mt-1">
          <MessageCircle className="w-3.5 h-3.5" />
          Узнать наличие
        </Button>
      </a>
    </CardContent>
  </Card>
);

// ─── Filter chips ──────────────────────────────────────────────────────────────

const FilterChips = ({
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
      <span className="text-xs text-muted-foreground mr-1">{label}:</span>
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

// ─── Device group block ────────────────────────────────────────────────────────

const DeviceGroupBlock = ({
  group,
  items,
}: {
  group: (typeof DEVICE_GROUPS)[0];
  items: Product[];
}) => {
  const availableCats = group.categories.filter((c) =>
    items.some((p) => p.category === c)
  );
  const [activeTab, setActiveTab] = useState(availableCats[0] ?? "");
  const [filterStorage, setFilterStorage] = useState("all");
  const [filterRam, setFilterRam] = useState("all");
  const [filterColor, setFilterColor] = useState("all");

  if (availableCats.length === 0) return null;

  const tabItems = items.filter((p) => p.category === activeTab);

  // Available filter values for current tab
  const storageValues = sortValues(
    unique(tabItems.map((p) => p.storage).filter(Boolean) as string[]),
    STORAGE_ORDER
  );
  const ramValues = sortValues(
    unique(tabItems.map((p) => p.ram).filter(Boolean) as string[]),
    RAM_ORDER
  );
  const ssdValues = sortValues(
    unique(tabItems.map((p) => p.ssd).filter(Boolean) as string[]),
    SSD_ORDER
  );
  const colorValues = sortValues(
    unique(tabItems.map((p) => p.color).filter(Boolean) as string[])
  );

  const hasFilters = storageValues.length > 1 || ramValues.length > 1 || colorValues.length > 1;

  // Reset filters when tab changes
  const handleTabChange = (cat: string) => {
    setActiveTab(cat);
    setFilterStorage("all");
    setFilterRam("all");
    setFilterColor("all");
  };

  // Apply filters
  const filtered = tabItems.filter((p) => {
    if (filterStorage !== "all" && p.storage !== filterStorage) return false;
    if (filterRam !== "all" && p.ram !== filterRam) return false;
    if (filterColor !== "all" && p.color !== filterColor) return false;
    return true;
  });

  const preview = filtered.slice(0, PREVIEW_COUNT);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="border rounded-2xl p-5 bg-card"
    >
      <h3 className="text-xl font-bold mb-4">{group.label}</h3>

      {/* Category tabs */}
      {availableCats.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {availableCats.map((cat) => {
            const count = items.filter((p) => p.category === cat).length;
            return (
              <Button
                key={cat}
                variant={activeTab === cat ? "default" : "outline"}
                size="sm"
                onClick={() => handleTabChange(cat)}
                className="gap-1.5"
              >
                {group.categoryLabels[cat as keyof typeof group.categoryLabels]}
                <span className="text-xs opacity-70">({count})</span>
              </Button>
            );
          })}
        </div>
      )}

      {/* Quick filters */}
      {hasFilters && (
        <div className="flex flex-col gap-2 mb-4 p-3 bg-muted/30 rounded-xl">
          <FilterChips
            label="Память"
            values={storageValues.length > 1 ? storageValues : ssdValues}
            active={filterStorage !== "all" ? filterStorage : "all"}
            onChange={setFilterStorage}
          />
          {ramValues.length > 1 && (
            <FilterChips
              label="RAM"
              values={ramValues}
              active={filterRam}
              onChange={setFilterRam}
            />
          )}
          {colorValues.length > 1 && (
            <FilterChips
              label="Цвет"
              values={colorValues}
              active={filterColor}
              onChange={setFilterColor}
            />
          )}
        </div>
      )}

      {/* Product grid */}
      {preview.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {preview.map((product, idx) => (
            <ProductCard key={idx} product={product} />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-6 text-sm">
          Нет позиций с выбранными параметрами
        </p>
      )}

      {filtered.length > PREVIEW_COUNT && (
        <div className="mt-4 text-center">
          <Link to="/buy/new">
            <Button variant="outline" size="sm" className="gap-1.5">
              Смотреть все {filtered.length} позиций
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      )}
    </motion.div>
  );
};

// ─── Section ───────────────────────────────────────────────────────────────────

const NewProductsSection = () => {
  const [data, setData] = useState<ProductsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/data/new-products.json")
      .then((r) => r.json())
      .then((d: ProductsData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const hasItems = data && data.items.length > 0;

  return (
    <section className="py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-3xl font-bold font-apple">Новая техника</h2>
            <p className="text-muted-foreground mt-1">
              Официальные поставки. Актуальные цены.
            </p>
          </div>
          {data?.updated_at && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3" />
              Обновлено {formatDate(data.updated_at)}
            </span>
          )}
        </div>
      </motion.div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      )}

      {!loading && hasItems && (
        <div className="flex flex-col gap-6">
          {DEVICE_GROUPS.map((group) => (
            <DeviceGroupBlock key={group.key} group={group} items={data.items} />
          ))}
        </div>
      )}

      {!loading && hasItems && (
        <div className="mt-6 flex gap-3 items-start bg-muted/50 border rounded-xl p-4 text-sm text-muted-foreground">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
          <p>
            Цены могут изменяться в связи с колебаниями курса валют. Указанная
            стоимость является ориентировочной — свяжитесь с нами для уточнения
            финальной цены и наличия.
          </p>
        </div>
      )}

      {!loading && !hasItems && (
        <p className="text-center text-muted-foreground py-10">
          Каталог обновляется ежедневно
        </p>
      )}
    </section>
  );
};

export default NewProductsSection;
