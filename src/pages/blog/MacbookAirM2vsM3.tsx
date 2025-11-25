import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const MacbookAirM2vsM3 = () => {
  const breadcrumbItems = [
    { name: "Главная", url: "/" },
    { name: "MacBook Air M2 vs M3", url: "/blog/macbook-air-m2-vs-m3" }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead 
        title="MacBook Air M2 vs M3: стоит ли переплачивать? Сравнение | BestMac"
        description="Детальное сравнение MacBook Air M2 и M3: производительность, автономность, цена. Что выбрать в 2024 году и стоит ли переплачивать за M3."
        canonical="/blog/macbook-air-m2-vs-m3"
        keywords="macbook air m2 vs m3, сравнение macbook air, m2 vs m3 производительность, стоит ли покупать m3"
      />
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={breadcrumbItems} />
        
        <Link to="/buy" className="inline-flex items-center text-primary hover:underline mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Вернуться к выкупу
        </Link>

        <motion.article 
          className="prose prose-lg max-w-none"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold font-apple mb-6">
            MacBook Air M2 vs M3: стоит ли переплачивать?
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Детальное сравнение двух популярных моделей MacBook Air 2024 года
          </p>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">Краткий вердикт</h2>
              <div className="bg-gradient-primary rounded-lg p-6 text-white mb-6">
                <p className="text-lg font-semibold mb-2">Для большинства пользователей: M2</p>
                <p className="text-sm opacity-90">
                  Разница в производительности между M2 и M3 составляет ~15-20%, но цена отличается 
                  на 20,000-30,000₽. Для обычных задач M2 более выгоден.
                </p>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                <p className="font-semibold mb-1">💡 Совет</p>
                <p className="text-sm text-muted-foreground">
                  Если не планируете заниматься тяжелой обработкой видео, большими проектами в Figma/Photoshop 
                  или разработкой с эмуляторами — M2 будет достаточно. Экономию лучше вложить в больше RAM или SSD.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Производительность</h2>
              
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="border border-border rounded-lg p-6">
                  <h3 className="font-semibold text-lg mb-3">Apple M2</h3>
                  <ul className="space-y-2 text-sm mb-4">
                    <li>• 8 ядер (4 производительных + 4 эффективных)</li>
                    <li>• 10-core GPU в старших конфигурациях</li>
                    <li>• 16GB unified memory</li>
                    <li>• До 24GB оперативной памяти</li>
                    <li>• Процесс 5nm техпроцесс</li>
                  </ul>
                  <div className="bg-muted/30 rounded p-3 text-xs">
                    <p className="font-semibold">Benchmark:</p>
                    <p>Geekbench 6: ~2600 single, ~9500 multi</p>
                  </div>
                </div>
                
                <div className="border border-primary rounded-lg p-6">
                  <h3 className="font-semibold text-lg mb-3">Apple M3</h3>
                  <ul className="space-y-2 text-sm mb-4">
                    <li>• 8 ядер (на 15% быстрее)</li>
                    <li>• 10-core GPU с улучшенным Ray Tracing</li>
                    <li>• 16GB unified memory</li>
                    <li>• До 24GB оперативной памяти</li>
                    <li>• Процесс 3nm техпроцесс (новый)</li>
                  </ul>
                  <div className="bg-primary/20 rounded p-3 text-xs">
                    <p className="font-semibold">Benchmark:</p>
                    <p>Geekbench 6: ~3100 single, ~11800 multi</p>
                  </div>
                </div>
              </div>
              
              <h3 className="font-semibold mb-3">Разница в реальных задачах</h3>
              <table className="w-full border-collapse mb-6">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="border border-border p-2 text-left">Задача</th>
                    <th className="border border-border p-2">M2</th>
                    <th className="border border-border p-2">M3</th>
                    <th className="border border-border p-2">Разница</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr>
                    <td className="border border-border p-2">Экспорт 4K видео (5 мин)</td>
                    <td className="border border-border p-2">2:45</td>
                    <td className="border border-border p-2">2:20</td>
                    <td className="border border-border p-2">~15% быстрее</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-2">Сборка проекта (Xcode)</td>
                    <td className="border border-border p-2">3:10</td>
                    <td className="border border-border p-2">2:45</td>
                    <td className="border border-border p-2">~13% быстрее</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-2">Обработка RAW (50 файлов)</td>
                    <td className="border border-border p-2">4:20</td>
                    <td className="border border-border p-2">3:50</td>
                    <td className="border border-border p-2">~12% быстрее</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-2">Обычные задачи (браузер, офис)</td>
                    <td className="border border-border p-2">✓ Отлично</td>
                    <td className="border border-border p-2">✓ Отлично</td>
                    <td className="border border-border p-2">Без разницы</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Автономность</h2>
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="border border-border rounded-lg p-6">
                  <h3 className="font-semibold mb-2">M2</h3>
                  <ul className="space-y-2 text-sm">
                    <li>✓ 18 часов просмотра видео</li>
                    <li>✓ 6-8 часов активной работы</li>
                    <li>✓ Быстрая зарядка за 1.5 часа</li>
                    <li>✓ MagSafe 67W зарядка</li>
                  </ul>
                </div>
                
                <div className="border border-primary rounded-lg p-6">
                  <h3 className="font-semibold mb-2">M3</h3>
                  <ul className="space-y-2 text-sm">
                    <li>✓ 18 часов просмотра видео</li>
                    <li>✓ 6-8 часов активной работы</li>
                    <li>✓ Быстрая зарядка за 1.5 часа</li>
                    <li>✓ MagSafe 70W зарядка</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    За счет 3nm техпроцесса работает на 5-10% дольше в энергоемких задачах
                  </p>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Разница в автономности минимальна. Обе модели показывают отличные результаты 
                для повседневной работы.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Цена и выгода</h2>
              <div className="space-y-4 mb-6">
                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold mb-2">MacBook Air M2</h3>
                  <ul className="text-sm space-y-1 text-muted-foreground mb-2">
                    <li>• Новый: от 100,000₽</li>
                    <li>• Б/у отличное состояние: от 50,000₽</li>
                    <li>• Б/у хорошее состояние: от 45,000₽</li>
                  </ul>
                </div>
                
                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold mb-2">MacBook Air M3</h3>
                  <ul className="text-sm space-y-1 text-muted-foreground mb-2">
                    <li>• Новый: от 120,000₽</li>
                    <li>• Б/у отличное состояние: от 70,000₽</li>
                    <li>• Б/у хорошее состояние: от 60,000₽</li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                <p className="font-semibold mb-2 text-green-600 dark:text-green-400">
                  💰 Выгоднее купить M2
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Разница в 20,000₽ не окупается приростом производительности на 15%. 
                  На эти деньги можно:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground mb-4">
                  <li>Увеличить SSD с 256GB до 512GB</li>
                  <li>Увеличить RAM с 8GB до 16GB</li>
                  <li>Купить AppleCare+</li>
                  <li>Купить все аксессуары (мышь, док, сумку)</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Когда стоит выбрать M3?</h2>
              <div className="space-y-4">
                <div className="border border-border rounded-lg p-6">
                  <h3 className="font-semibold mb-3">✅ Выбирайте M3, если:</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>✓ Занимаетесь профессиональной обработкой видео (Final Cut, Premiere)</li>
                    <li>✓ Работаете с 3D-моделированием (Blender, Cinema 4D)</li>
                    <li>✓ Разрабатываете приложения с тяжелыми эмуляторами</li>
                    <li>✓ Обрабатываете большие RAW файлы регулярно</li>
                    <li>✓ Планируете использовать MacBook 4+ года</li>
                    <li>✓ Важно выжать максимум производительности</li>
                  </ul>
                </div>
                
                <div className="border border-border rounded-lg p-6">
                  <h3 className="font-semibold mb-3">💰 Выбирайте M2, если:</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>✓ Нужен офисный компьютер (браузер, Word, Excel)</li>
                    <li>✓ Работаете с легкими приложениями (Figma, Chrome, Slack)</li>
                    <li>✓ Обрабатываете видео изредка (семейные ролики)</li>
                    <li>✓ Важен бюджет при покупке</li>
                    <li>✓ Планируете апгрейд через 2-3 года</li>
                    <li>✓ Хотите больше SSD/RAM вместо мощности</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Сравнительная таблица</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse mb-6">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="border border-border p-3 text-left">Характеристика</th>
                      <th className="border border-border p-3">M2</th>
                      <th className="border border-border p-3">M3</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <tr>
                      <td className="border border-border p-3 font-semibold">Производительность (CPU)</td>
                      <td className="border border-border p-3">Базовый уровень</td>
                      <td className="border border-border p-3">+15-20%</td>
                    </tr>
                    <tr>
                      <td className="border border-border p-3 font-semibold">Графика (GPU)</td>
                      <td className="border border-border p-3">Базовый уровень</td>
                      <td className="border border-border p-3">Ray Tracing улучшен</td>
                    </tr>
                    <tr>
                      <td className="border border-border p-3 font-semibold">Автономность</td>
                      <td className="border border-border p-3">18 ч видео</td>
                      <td className="border border-border p-3">18 ч видео</td>
                    </tr>
                    <tr>
                      <td className="border border-border p-3 font-semibold">Охлаждение</td>
                      <td className="border border-border p-3">Пассивное</td>
                      <td className="border border-border p-3">Пассивное</td>
                    </tr>
                    <tr>
                      <td className="border border-border p-3 font-semibold">Макс. RAM</td>
                      <td className="border border-border p-3">24GB</td>
                      <td className="border border-border p-3">24GB</td>
                    </tr>
                    <tr>
                      <td className="border border-border p-3 font-semibold">Цена (б/у отличное)</td>
                      <td className="border border-border p-3 text-green-600">~50,000₽</td>
                      <td className="border border-border p-3 text-red-600">~70,000₽</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Итоговая рекомендация</h2>
              <div className="bg-gradient-primary rounded-lg p-6 text-white mb-6">
                <p className="text-lg font-semibold mb-2">
                  Для 80% пользователей: MacBook Air M2 + 16GB RAM + 512GB SSD
                </p>
                <p className="text-sm opacity-90">
                  Это идеальный баланс производительности, автономности и цены. 
                  Оставшиеся деньги лучше потратить на больше оперативной памяти и накопителя.
                </p>
              </div>
              
              <p className="text-sm text-muted-foreground mb-6">
                М3 стоит выбирать только если вы регулярно занимаетесь интенсивными задачами 
                и готовы переплачивать за 15-20% прироста производительности. Для обычной 
                работы, учебы, офиса и даже легкого видеомонтажа M2 будет достаточно на 
                долгие годы.
              </p>
            </section>
          </div>

          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-4">Читайте также</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <Link to="/blog/kak-vybrat-macbook-2024" className="border border-border rounded-lg p-4 hover:bg-muted transition">
                <h3 className="font-semibold mb-2">Как выбрать MacBook в 2024 году</h3>
                <p className="text-sm text-muted-foreground">Полное руководство по выбору подходящей модели</p>
              </Link>
              <Link to="/blog/macbook-m4-obzor" className="border border-border rounded-lg p-4 hover:bg-muted transition">
                <h3 className="font-semibold mb-2">MacBook M4: что нового</h3>
                <p className="text-sm text-muted-foreground">Обзор нового процессора и сравнение</p>
              </Link>
            </div>
          </section>

          <div className="mt-12 bg-gradient-primary rounded-lg p-8 text-white text-center">
            <h3 className="text-2xl font-bold mb-4">Готовы купить MacBook Air?</h3>
            <p className="mb-6">Посмотрите наши предложения с M2 и M3</p>
            <Button asChild size="lg" variant="secondary">
              <Link to="/buy">Смотреть MacBook в продаже</Link>
            </Button>
          </div>
        </motion.article>
      </main>

      <Footer />
    </div>
  );
};

export default MacbookAirM2vsM3;

