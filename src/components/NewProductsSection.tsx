import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, RefreshCw, ArrowRight, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

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

const TG_LINK = "https://t.me/bestmac_moscow";
const PREVIEW_COUNT = 6;

const DEVICE_GROUPS = [
  {
    key: "iphone",
    label: "Apple iPhone",
    categories: ["iphone_17_pro", "iphone_17"],
    categoryLabels: { iphone_17_pro: "iPhone 17 Pro", iphone_17: "iPhone 17 / Air" },
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

function formatPrice(price: number): string {
  return price.toLocaleString("ru-RU") + " ₽";
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Moscow",
  });
}

const ProductCard = ({ product }: { product: Product }) => (
  <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
    <CardContent className="flex flex-col gap-2.5 p-4 h-full">
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

      {product.is_activated && (
        <Badge variant="outline" className="text-xs w-fit text-amber-600 border-amber-400">
          Активирован
        </Badge>
      )}

      <div className="pt-2 border-t mt-auto">
        <p className="text-base font-bold">{formatPrice(product.price)}</p>
      </div>

      <a href={TG_LINK} target="_blank" rel="noopener noreferrer">
        <Button size="sm" className="w-full gap-1.5 mt-1">
          <MessageCircle className="w-3.5 h-3.5" />
          Узнать наличие
        </Button>
      </a>
    </CardContent>
  </Card>
);

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

  const tabItems = items.filter((p) => p.category === activeTab);
  const preview = tabItems.slice(0, PREVIEW_COUNT);

  if (availableCats.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="border rounded-2xl p-5 bg-card"
    >
      <h3 className="text-xl font-bold mb-4">{group.label}</h3>

      {/* Subcategory tabs */}
      {availableCats.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {availableCats.map((cat) => {
            const count = items.filter((p) => p.category === cat).length;
            return (
              <Button
                key={cat}
                variant={activeTab === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(cat)}
                className="gap-1.5"
              >
                {group.categoryLabels[cat as keyof typeof group.categoryLabels]}
                <span className="text-xs opacity-70">({count})</span>
              </Button>
            );
          })}
        </div>
      )}

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {preview.map((product, idx) => (
          <ProductCard key={idx} product={product} />
        ))}
      </div>

      {tabItems.length > PREVIEW_COUNT && (
        <div className="mt-4 text-center">
          <Link to={`/buy/new`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              Смотреть все {tabItems.length} позиций
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      )}
    </motion.div>
  );
};

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
      {/* Section header */}
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
              Официальные поставки. Всегда в наличии.
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

      {/* Loader */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      )}

      {/* Groups */}
      {!loading && hasItems && (
        <div className="flex flex-col gap-6">
          {DEVICE_GROUPS.map((group) => (
            <DeviceGroupBlock
              key={group.key}
              group={group}
              items={data.items}
            />
          ))}
        </div>
      )}

      {/* Disclaimer */}
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

      {/* Empty state */}
      {!loading && !hasItems && (
        <p className="text-center text-muted-foreground py-10">
          Каталог обновляется ежедневно
        </p>
      )}
    </section>
  );
};

export default NewProductsSection;
