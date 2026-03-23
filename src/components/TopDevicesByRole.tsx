import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Code,
  Palette,
  GraduationCap,
  Briefcase,
  BarChart3,
  Bot,
  Camera,
  Music,
  Globe,
} from "lucide-react";
import { loadAvitoPrices, formatPrice, formatSsd } from "@/lib/avito-prices";
import type { AvitoPriceStat } from "@/types/avito-prices";

interface RoleConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  filter: (s: AvitoPriceStat) => boolean;
  sort: (a: AvitoPriceStat, b: AvitoPriceStat) => number;
}

const isPro = (s: AvitoPriceStat) => s.model_name.toLowerCase().includes("pro");
const chipGen = (s: AvitoPriceStat) => {
  const m = s.processor.match(/M(\d)/);
  return m ? parseInt(m[1]) : 1;
};

const ROLES: RoleConfig[] = [
  {
    id: "developer",
    label: "Разработчикам",
    icon: <Code className="w-5 h-5" />,
    description: "16+ ГБ RAM, быстрый чип для компиляции и контейнеров",
    filter: s => s.ram >= 16 && chipGen(s) >= 2,
    sort: (a, b) => a.median_price - b.median_price,
  },
  {
    id: "designer",
    label: "Дизайнерам",
    icon: <Palette className="w-5 h-5" />,
    description: "Pro-линейка с большим экраном для Figma и Adobe",
    filter: s => s.ram >= 16 && isPro(s),
    sort: (a, b) => a.median_price - b.median_price,
  },
  {
    id: "student",
    label: "Студентам",
    icon: <GraduationCap className="w-5 h-5" />,
    description: "Компактный Air — лёгкий, долгая батарея, доступная цена",
    filter: s => !isPro(s) && s.ram >= 8,
    sort: (a, b) => a.median_price - b.median_price,
  },
  {
    id: "manager",
    label: "Менеджерам",
    icon: <Briefcase className="w-5 h-5" />,
    description: "Надёжный ноутбук для презентаций, почты и Zoom",
    filter: s => !isPro(s) && s.ram >= 8,
    sort: (a, b) => a.median_price - b.median_price,
  },
  {
    id: "analyst",
    label: "Аналитикам",
    icon: <BarChart3 className="w-5 h-5" />,
    description: "16 ГБ RAM для работы с данными и визуализации",
    filter: s => s.ram >= 16 && chipGen(s) >= 2,
    sort: (a, b) => a.median_price - b.median_price,
  },
  {
    id: "ai-engineer",
    label: "AI-инженерам",
    icon: <Bot className="w-5 h-5" />,
    description: "Максимум RAM и мощный GPU для машинного обучения",
    filter: s => s.ram >= 16 && isPro(s) && chipGen(s) >= 3,
    sort: (a, b) => a.median_price - b.median_price,
  },
  {
    id: "content-creator",
    label: "Контент-мейкерам",
    icon: <Camera className="w-5 h-5" />,
    description: "Pro с большим SSD для видеомонтажа и стриминга",
    filter: s => isPro(s) && s.ssd >= 512,
    sort: (a, b) => a.median_price - b.median_price,
  },
  {
    id: "musician",
    label: "Музыкантам",
    icon: <Music className="w-5 h-5" />,
    description: "Тихая работа, большой SSD для семплов и проектов",
    filter: s => s.ram >= 16 && s.ssd >= 512,
    sort: (a, b) => a.median_price - b.median_price,
  },
  {
    id: "freelancer",
    label: "Фрилансерам",
    icon: <Globe className="w-5 h-5" />,
    description: "Универсальный и портативный для работы из любой точки",
    filter: s => !isPro(s) && s.ram >= 8 && chipGen(s) >= 2,
    sort: (a, b) => a.median_price - b.median_price,
  },
];

function dedup(stats: AvitoPriceStat[]): AvitoPriceStat[] {
  const map = new Map<string, AvitoPriceStat>();
  for (const s of stats) {
    const key = `${s.model_name}|${s.processor}|${s.ram}|${s.ssd}`;
    if (!map.has(key) || s.samples_count > map.get(key)!.samples_count) {
      map.set(key, s);
    }
  }
  return Array.from(map.values());
}

const TopDevicesByRole = () => {
  const [stats, setStats] = useState<AvitoPriceStat[]>([]);
  const [activeRole, setActiveRole] = useState(ROLES[0].id);

  useEffect(() => {
    loadAvitoPrices().then(data => setStats(data.stats));
  }, []);

  const role = ROLES.find(r => r.id === activeRole)!;
  const filtered = dedup(stats.filter(s => s.median_price >= 70000))
    .filter(role.filter)
    .sort(role.sort)
    .slice(0, 3);

  return (
    <section className="mb-16" id="top-devices-by-role">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold font-apple mb-3">
          Топ MacBook по профессиям
        </h2>
        <p className="text-muted-foreground text-lg">
          Лучшие модели б/у MacBook для вашей сферы деятельности
        </p>
      </div>

      {/* Role tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {ROLES.map(r => (
          <button
            key={r.id}
            onClick={() => setActiveRole(r.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeRole === r.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {r.icon}
            {r.label}
          </button>
        ))}
      </div>

      {/* Role description */}
      <p className="text-center text-muted-foreground mb-6 max-w-xl mx-auto">
        {role.description}
      </p>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {filtered.length === 0 ? (
          <p className="col-span-3 text-center text-muted-foreground py-8">
            Нет подходящих моделей в базе. Свяжитесь с нами для консультации.
          </p>
        ) : (
          filtered.map((stat, i) => (
            <motion.div
              key={`${stat.model_name}-${stat.ram}-${stat.ssd}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={`h-full ${i === 0 ? "border-primary/50" : ""}`}>
                <CardContent className="p-5">
                  {i === 0 && (
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-xs mb-2">
                      Лучшая цена
                    </Badge>
                  )}
                  <h3 className="font-bold text-base mb-1">{stat.model_name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {stat.processor} · {stat.ram} ГБ · {formatSsd(stat.ssd)}
                  </p>
                  <p className="font-bold text-xl text-primary">
                    {formatPrice(stat.median_price)}
                  </p>
                  <p className="text-xs text-muted-foreground">медиана на рынке</p>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Топ MacBook по профессиям — BestMac.ru",
            description: "Рейтинг лучших моделей б/у MacBook для разных профессий: разработчики, дизайнеры, студенты, аналитики и другие.",
            numberOfItems: ROLES.length,
            itemListElement: ROLES.map((r, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: `Лучший MacBook для: ${r.label}`,
              description: r.description,
            })),
          }),
        }}
      />
    </section>
  );
};

export default TopDevicesByRole;
