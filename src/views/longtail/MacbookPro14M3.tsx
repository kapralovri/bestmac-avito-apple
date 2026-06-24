"use client";

import Breadcrumbs from "@/components/Breadcrumbs";
import AvitoOffers from "@/components/AvitoOffers";
import LeadForm from "@/components/LeadForm";
import { generateProductSchema, generateBreadcrumbSchema } from "@/lib/structured-data";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Cpu, HardDrive, Monitor, Zap } from "lucide-react";

const MacbookPro14M3 = () => {
  const breadcrumbItems = [
    { name: "Главная", url: "/" },
    { name: "Купить", url: "/buy" },
    { name: "MacBook Pro 14 M3", url: "/buy/macbook-pro-14-m3" }
  ];

  const productSchema = generateProductSchema({
    name: "MacBook Pro 14 M3 2023",
    price: 165000,
    condition: "б/у",
    description: "Купить MacBook Pro 14 M3 2023 года б/у в Москве. Мощный ноутбук для профессионалов. Гарантия, проверка при покупке."
  });

  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems);

  const combinedSchema = {
    "@context": "https://schema.org",
    "@graph": [productSchema, breadcrumbSchema]
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(combinedSchema) }}
      />
<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={breadcrumbItems} />
        
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Купить MacBook Pro 14" M3 2023 б/у в Москве
        </h1>
        
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg border">
            <Cpu className="w-10 h-10 text-primary mb-3" />
            <p className="font-semibold">Apple M3 Pro</p>
            <p className="text-sm text-muted-foreground">11-core CPU</p>
          </div>
          <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg border">
            <HardDrive className="w-10 h-10 text-primary mb-3" />
            <p className="font-semibold">до 36GB RAM</p>
            <p className="text-sm text-muted-foreground">Unified Memory</p>
          </div>
          <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg border">
            <Monitor className="w-10 h-10 text-primary mb-3" />
            <p className="font-semibold">14.2" XDR</p>
            <p className="text-sm text-muted-foreground">ProMotion 120Hz</p>
          </div>
          <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg border">
            <Zap className="w-10 h-10 text-primary mb-3" />
            <p className="font-semibold">до 18 часов</p>
            <p className="text-sm text-muted-foreground">автономность</p>
          </div>
        </div>

        <div className="prose max-w-none mb-12">
          <h2 className="text-3xl font-bold mb-4">MacBook Pro 14 M3 — профессиональный инструмент</h2>
          <p className="text-lg text-muted-foreground mb-6">
            MacBook Pro 14" с процессором M3 Pro — это флагманский ноутбук Apple для профессионалов. 
            Мощный чип, яркий XDR-дисплей, активное охлаждение и максимальная производительность 
            для самых требовательных задач.
          </p>

          <h3 className="text-2xl font-bold mb-3">Полные характеристики</h3>
          <div className="bg-card rounded-lg p-6 border mb-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Процессор и память</h4>
                <ul className="text-sm space-y-1">
                  <li>• Apple M3 Pro: 11-core CPU, 14-core GPU</li>
                  <li>• До 36GB Unified Memory</li>
                  <li>• До 4TB SSD накопитель</li>
                  <li>• 16-ядерный Neural Engine</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Дисплей</h4>
                <ul className="text-sm space-y-1">
                  <li>• 14.2" Liquid Retina XDR</li>
                  <li>• 3024 × 1964 разрешение</li>
                  <li>• ProMotion 120Hz</li>
                  <li>• 1600 нит пиковая яркость</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Порты и подключения</h4>
                <ul className="text-sm space-y-1">
                  <li>• 3× Thunderbolt 4 (USB-C)</li>
                  <li>• HDMI 2.1</li>
                  <li>• SDXC card slot</li>
                  <li>• MagSafe 3</li>
                  <li>• 3.5mm jack</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Другое</h4>
                <ul className="text-sm space-y-1">
                  <li>• Вес: 1.55 кг</li>
                  <li>• Touch ID</li>
                  <li>• Magic Keyboard с подсветкой</li>
                  <li>• 6 динамиков, 3 микрофона</li>
                </ul>
              </div>
            </div>
          </div>

          <h3 className="text-2xl font-bold mb-3">Для каких задач идеально подходит?</h3>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="border border-border rounded-lg p-6">
              <h4 className="font-semibold mb-2 text-lg">🎬 Видеопродакшн</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Final Cut Pro, DaVinci Resolve, Adobe Premiere — монтаж 4K/8K видео с цветокоррекцией 
                и эффектами в реальном времени.
              </p>
              <p className="text-xs text-muted-foreground italic">
                Рендер 5-минутного 4K видео: ~2-3 минуты
              </p>
            </div>
            
            <div className="border border-border rounded-lg p-6">
              <h4 className="font-semibold mb-2 text-lg">💻 Разработка ПО</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Xcode, Android Studio, Docker, виртуальные машины — все работает молниеносно. 
                Сборка больших проектов в разы быстрее.
              </p>
              <p className="text-xs text-muted-foreground italic">
                Сборка React Native проекта: ~30 секунд
              </p>
            </div>
            
            <div className="border border-border rounded-lg p-6">
              <h4 className="font-semibold mb-2 text-lg">🎨 3D и графика</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Blender, Cinema 4D, AutoCAD — сложные 3D-сцены, рендеринг с аппаратным Ray Tracing. 
                Работа с большими текстурами.
              </p>
              <p className="text-xs text-muted-foreground italic">
                Рендер 3D-сцены 1080p: ~10-15 минут
              </p>
            </div>
            
            <div className="border border-border rounded-lg p-6">
              <h4 className="font-semibold mb-2 text-lg">🎵 Музыкальная продакция</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Logic Pro, Ableton Live — сотни треков, VST-плагины, живая обработка без задержек. 
                Профессиональная студия в ноутбуке.
              </p>
              <p className="text-xs text-muted-foreground italic">
                100+ треков без тормозов и артефактов
              </p>
            </div>
          </div>

          <h3 className="text-2xl font-bold mb-3">M3 vs M3 Pro vs M3 Max — что выбрать?</h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse">
              <thead className="bg-muted/50">
                <tr>
                  <th className="border border-border p-3 text-left">Характеристика</th>
                  <th className="border border-border p-3">M3</th>
                  <th className="border border-border p-3 bg-primary/10">M3 Pro</th>
                  <th className="border border-border p-3">M3 Max</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr>
                  <td className="border border-border p-3 font-semibold">CPU ядра</td>
                  <td className="border border-border p-3">8</td>
                  <td className="border border-border p-3 bg-primary/5">11-12</td>
                  <td className="border border-border p-3">14-16</td>
                </tr>
                <tr>
                  <td className="border border-border p-3 font-semibold">GPU ядра</td>
                  <td className="border border-border p-3">10</td>
                  <td className="border border-border p-3 bg-primary/5">14-18</td>
                  <td className="border border-border p-3">30-40</td>
                </tr>
                <tr>
                  <td className="border border-border p-3 font-semibold">Макс. RAM</td>
                  <td className="border border-border p-3">24GB</td>
                  <td className="border border-border p-3 bg-primary/5">36GB</td>
                  <td className="border border-border p-3">128GB</td>
                </tr>
                <tr>
                  <td className="border border-border p-3 font-semibold">Цена б/у</td>
                  <td className="border border-border p-3">от 140,000₽</td>
                  <td className="border border-border p-3 bg-primary/5 text-primary font-semibold">от 165,000₽</td>
                  <td className="border border-border p-3">от 210,000₽</td>
                </tr>
                <tr>
                  <td className="border border-border p-3 font-semibold">Для кого</td>
                  <td className="border border-border p-3">Базовые задачи</td>
                  <td className="border border-border p-3 bg-primary/5">Профессионалы</td>
                  <td className="border border-border p-3">Экстрим-задачи</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="bg-primary/10 rounded-lg p-6 mb-6">
            <p className="font-semibold mb-2">💡 Наша рекомендация</p>
            <p className="text-sm text-muted-foreground">
              M3 Pro — оптимальный выбор для большинства профессионалов. Хватит для 95% задач, 
              при этом не переплачиваете за избыточную мощность M3 Max, которая нужна только 
              для экстремального видеомонтажа или 3D-рендеринга.
            </p>
          </div>

          <h3 className="text-2xl font-bold mb-3">Цены на MacBook Pro 14 M3 б/у в Москве</h3>
          <div className="bg-card rounded-lg p-6 border mb-6">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Конфигурация</th>
                  <th className="text-left py-2">Состояние</th>
                  <th className="text-right py-2">Цена</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2">M3 11-core 18GB 512GB</td>
                  <td className="py-2">Отличное</td>
                  <td className="text-right py-2 font-semibold text-primary">от 165,000₽</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">M3 Pro 12-core 18GB 1TB</td>
                  <td className="py-2">Отличное</td>
                  <td className="text-right py-2 font-semibold">от 185,000₽</td>
                </tr>
                <tr>
                  <td className="py-2">M3 Max 14-core 36GB 1TB</td>
                  <td className="py-2">Отличное</td>
                  <td className="text-right py-2 font-semibold">от 210,000₽</td>
                </tr>
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-4">
              *Цены актуальны на {new Date().toLocaleDateString('ru-RU')}. Точная стоимость зависит от 
              конфигурации, состояния и наличия на складе.
            </p>
          </div>
        </div>

        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center">Актуальные предложения MacBook Pro</h2>
          <AvitoOffers />
        </section>

        <section className="mb-12">
          <div className="bg-gradient-primary rounded-lg p-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-4">Готовы купить MacBook Pro 14 M3?</h2>
            <p className="mb-6">Консультация, подбор конфигурации, проверка при покупке</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button asChild size="lg" variant="secondary">
                <Link href="/buy">Смотреть все MacBook Pro</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-white text-primary hover:bg-white/90">
                <a href="tel:+79032990029">Позвонить</a>
              </Button>
            </div>
          </div>
        </section>

        <section>
          <LeadForm 
            title="Подбор MacBook Pro 14 M3"
            subtitle="Расскажите о ваших задачах, и мы подберем оптимальную конфигурацию"
            formType="selection"
          />
        </section>
      </main>
</div>
  );
};

export default MacbookPro14M3;
