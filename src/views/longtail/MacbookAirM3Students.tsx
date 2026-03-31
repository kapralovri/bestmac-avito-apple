"use client";

import { motion } from "framer-motion";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, ArrowRight, GraduationCap, Battery, Wifi } from "lucide-react";
import Link from "next/link";
import AvitoOffers from "@/components/AvitoOffers";
import LeadForm from "@/components/LeadForm";
import { generateProductSchema, generateBreadcrumbSchema } from "@/lib/structured-data";

const MacbookAirM3Students = () => {
  const breadcrumbItems = [
    { name: "Главная", url: "/" },
    { name: "Купить MacBook", url: "/buy" },
    { name: "MacBook Air M3 для студентов", url: "/buy/macbook-air-m3-students" }
  ];

  const productSchema = generateProductSchema({
    name: "MacBook Air M3 для студентов",
    price: 75000,
    condition: "UsedCondition",
    description: "MacBook Air M3 б/у для студентов. Идеален для учебы, конспектов, программирования. 16GB RAM, 512GB SSD. Легкий, тихий, автономность 18 часов. Скидка для студентов.",
    sku: "MBA-M3-STUDENT-16-512"
  });

  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems);

  return (
    <div className="min-h-screen bg-background text-foreground">
<main className="container mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbItems} />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <GraduationCap className="w-10 h-10 text-primary" />
              <h1 className="text-4xl md:text-5xl font-bold">
                MacBook Air M3 для студентов
              </h1>
            </div>
            
            <div className="flex flex-wrap gap-4 mb-8">
              <div className="flex items-center gap-2 text-primary">
                <Battery className="w-5 h-5" />
                <span className="font-semibold">18 часов без зарядки</span>
              </div>
              <div className="flex items-center gap-2 text-primary">
                <GraduationCap className="w-5 h-5" />
                <span className="font-semibold">Скидка студентам 5%</span>
              </div>
              <div className="flex items-center gap-2 text-primary">
                <Wifi className="w-5 h-5" />
                <span className="font-semibold">Wi-Fi 6E</span>
              </div>
            </div>

            {/* Hero Section */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div>
                <h2 className="text-2xl font-bold mb-4">Идеальный ноутбук для учебы</h2>
                <p className="text-muted-foreground mb-6">
                  MacBook Air M3 — лучший выбор для студента в 2024 году. Сочетает в себе мощность 
                  для любых учебных задач, невероятную автономность (целый день без зарядки), 
                  минимальный вес (1.24 кг) и абсолютно бесшумную работу. Подходит для программирования, 
                  дизайна, видеомонтажа и даже сложных расчетов.
                </p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Легкий и компактный</p>
                      <p className="text-sm text-muted-foreground">Всего 1.24 кг — носите в рюкзаке весь день без усталости</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">До 18 часов без зарядки</p>
                      <p className="text-sm text-muted-foreground">Весь учебный день + домашка без поиска розетки</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Абсолютно бесшумный</p>
                      <p className="text-sm text-muted-foreground">Нет вентилятора — работайте в библиотеке без стеснения</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Мощный чип M3</p>
                      <p className="text-sm text-muted-foreground">Программирование, дизайн, монтаж — тянет всё</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">16GB RAM — запас на годы</p>
                      <p className="text-sm text-muted-foreground">Открывайте 50+ вкладок + приложения без тормозов</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="font-semibold mb-1 text-green-700 dark:text-green-400">🎓 Скидка для студентов</p>
                  <p className="text-sm">
                    Предъявите студенческий билет — получите дополнительную скидку 5% на любую модель
                  </p>
                </div>
              </div>

              <Card className="p-6">
                <h3 className="text-xl font-bold mb-4">Рекомендуемая конфигурация</h3>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Процессор</span>
                    <span className="font-semibold">Apple M3 (8-ядер)</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">RAM</span>
                    <span className="font-semibold">16GB</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">SSD</span>
                    <span className="font-semibold">512GB</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Дисплей</span>
                    <span className="font-semibold">13.6" Liquid Retina</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Батарея</span>
                    <span className="font-semibold">До 18 часов</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Вес</span>
                    <span className="font-semibold">1.24 кг</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Охлаждение</span>
                    <span className="font-semibold">Пассивное (без шума)</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-baseline gap-2 mb-2">
                    <p className="text-2xl font-bold text-primary">71,250 ₽</p>
                    <p className="text-lg text-muted-foreground line-through">75,000 ₽</p>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-400 mb-4">Со студенческой скидкой 5%</p>
                  <Button className="w-full mb-2" size="lg" asChild>
                    <a href="https://t.me/romanmanro" target="_blank" rel="noopener noreferrer">
                      Написать в Telegram
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <a href="tel:+79999999999">Позвонить</a>
                  </Button>
                </div>
              </Card>
            </div>

            {/* Study Use Cases */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold mb-6">Для каких задач подходит?</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-bold mb-3">📚 Учеба</h3>
                  <ul className="space-y-2 text-sm">
                    <li>• Конспекты в Pages, Notion</li>
                    <li>• Презентации в Keynote</li>
                    <li>• Работа с PDF, сканирование</li>
                    <li>• Онлайн-лекции Zoom, Teams</li>
                    <li>• Многозадачность: браузер + apps</li>
                  </ul>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-bold mb-3">💻 Программирование</h3>
                  <ul className="space-y-2 text-sm">
                    <li>• Xcode, VS Code, JetBrains IDE</li>
                    <li>• Python, JavaScript, Swift</li>
                    <li>• Docker, виртуальные машины</li>
                    <li>• Git, командная разработка</li>
                    <li>• Машинное обучение (базовое)</li>
                  </ul>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-bold mb-3">🎨 Творчество</h3>
                  <ul className="space-y-2 text-sm">
                    <li>• Photoshop, Figma, Sketch</li>
                    <li>• Final Cut Pro (базовый монтаж)</li>
                    <li>• Illustrator, Procreate</li>
                    <li>• GarageBand, Logic Pro</li>
                    <li>• 3D-моделирование (легкое)</li>
                  </ul>
                </Card>
              </div>
            </section>

            {/* Comparison with Alternatives */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold mb-6">Почему не Windows-ноутбук?</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6 border-2 border-primary">
                  <h3 className="text-xl font-bold mb-4 text-primary">✓ MacBook Air M3</h3>
                  <ul className="space-y-2 text-sm">
                    <li>✓ 18 часов автономности</li>
                    <li>✓ Абсолютно бесшумный (нет вентилятора)</li>
                    <li>✓ Retina дисплей с идеальной цветопередачей</li>
                    <li>✓ macOS — стабильная, без вирусов</li>
                    <li>✓ Легкий (1.24 кг) и тонкий</li>
                    <li>✓ Высокая стоимость перепродажи</li>
                    <li>✓ Работает без тормозов годами</li>
                  </ul>
                </Card>

                <Card className="p-6">
                  <h3 className="text-xl font-bold mb-4 text-muted-foreground">⚠️ Windows-ноутбук за 75,000₽</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>× 4-6 часов батареи (реально меньше)</li>
                    <li>× Шумный вентилятор при нагрузке</li>
                    <li>× Экран хуже (низкое разрешение, блеклые цвета)</li>
                    <li>× Windows 11 — глюки, обновления, вирусы</li>
                    <li>× Тяжелее (1.8-2.5 кг)</li>
                    <li>× Низкая цена б/у через 2 года</li>
                    <li>× Тормозит через год использования</li>
                  </ul>
                </Card>
              </div>
            </section>

            {/* Real Student Reviews */}
            <section className="mb-12 bg-muted/50 rounded-lg p-8">
              <h2 className="text-3xl font-bold mb-6 text-center">Отзывы студентов</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-background rounded-lg p-6">
                  <p className="text-sm mb-3">
                    "Купила для универа. Лучшая покупка! Батарея держит весь день, ничего не тормозит. 
                    Очень легкий — ношу с собой каждый день."
                  </p>
                  <p className="text-xs text-muted-foreground">Анна, 2 курс, факультет журналистики</p>
                </div>
                <div className="bg-background rounded-lg p-6">
                  <p className="text-sm mb-3">
                    "Программирую на Swift и Python. M3 справляется с Xcode отлично. Очень доволен, 
                    что взял 16GB — никаких тормозов."
                  </p>
                  <p className="text-xs text-muted-foreground">Михаил, 3 курс, ПМИ</p>
                </div>
                <div className="bg-background rounded-lg p-6">
                  <p className="text-sm mb-3">
                    "Работаю в Photoshop и Figma — летает. Монтирую видео для курсовой — тоже норм. 
                    За такую цену б/у — просто огонь."
                  </p>
                  <p className="text-xs text-muted-foreground">Дарья, 4 курс, дизайн</p>
                </div>
              </div>
            </section>

            {/* Student Tips */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold mb-6">Советы студентам</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-bold mb-3">💡 Как получить скидку?</h3>
                  <ol className="space-y-2 text-sm list-decimal pl-4">
                    <li>Свяжитесь с нами в Telegram</li>
                    <li>Отправьте фото студенческого билета</li>
                    <li>Получите промокод на 5% скидки</li>
                    <li>Оформите заказ со скидкой</li>
                  </ol>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-bold mb-3">🎯 Конфигурация для учебы</h3>
                  <ul className="space-y-2 text-sm">
                    <li>✓ <strong>16GB RAM</strong> — обязательно! Хватит на 5 лет</li>
                    <li>✓ <strong>512GB SSD</strong> — оптимально для файлов</li>
                    <li>✓ <strong>M3</strong> — достаточно для 99% задач</li>
                    <li>⚠️ 8GB RAM — только для интернета и документов</li>
                  </ul>
                </Card>
              </div>
            </section>

            {/* Related Offers */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold mb-6">Другие варианты для студентов</h2>
              <AvitoOffers limit={3} />
              <div className="text-center mt-6">
                <Button variant="outline" size="lg" asChild>
                  <Link href="/buy">
                    Посмотреть все MacBook <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </section>

            {/* Lead Form */}
            <section>
              <h2 className="text-3xl font-bold mb-4 text-center">Нужна помощь с выбором?</h2>
              <p className="text-center text-muted-foreground mb-8">
                Расскажите о своих задачах — подберем идеальную конфигурацию для учебы
              </p>
              <LeadForm />
            </section>
          </div>
        </motion.div>
      </main>
</div>
  );
};

export default MacbookAirM3Students;
