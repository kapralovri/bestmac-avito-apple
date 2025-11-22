import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { generateArticleSchema } from "@/lib/structured-data";

const MacbookM4Obzor = () => {
  const breadcrumbItems = [
    { name: "Главная", url: "/" },
    { name: "MacBook M4: что нового и стоит ли обновляться", url: "/blog/macbook-m4-obzor" }
  ];

  const articleSchema = generateArticleSchema({
    title: "MacBook M4: что нового и стоит ли обновляться с M2/M3",
    description: "Полный обзор нового процессора Apple M4 в MacBook. Сравнение с M2 и M3, тесты производительности, стоит ли обновляться.",
    datePublished: "2024-11-22",
    dateModified: "2024-11-22",
    author: "BestMac",
    url: "/blog/macbook-m4-obzor"
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead 
        title="MacBook M4: полный обзор, что нового и стоит ли обновляться | BestMac"
        description="Подробный обзор MacBook с процессором M4. Сравнение с M2 и M3, тесты производительности, новые возможности. Стоит ли обновляться с предыдущих моделей."
        canonical="/blog/macbook-m4-obzor"
        keywords="macbook m4, apple m4, macbook m4 обзор, m4 vs m3, стоит ли покупать m4"
        schema={articleSchema}
      />
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={breadcrumbItems} />
        
        <Link to="/" className="inline-flex items-center text-primary hover:underline mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Вернуться на главную
        </Link>

        <motion.article 
          className="prose prose-lg max-w-none"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold font-apple mb-6">
            MacBook M4: что нового и стоит ли обновляться
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Полный обзор нового поколения процессоров Apple Silicon M4 и сравнение с M2/M3
          </p>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">Что нового в M4?</h2>
              <p className="mb-4">
                Apple M4 — это четвертое поколение собственных процессоров Apple Silicon, построенное 
                на новейшем 3nm+ техпроцессе второго поколения от TSMC. Чип обещает значительный прирост 
                производительности при снижении энергопотребления.
              </p>

              <div className="bg-gradient-primary rounded-lg p-6 text-white mb-6">
                <h3 className="font-semibold text-lg mb-2">Ключевые улучшения M4</h3>
                <ul className="space-y-2 text-sm">
                  <li>✓ Новая архитектура CPU на 25% быстрее M3</li>
                  <li>✓ GPU с аппаратным Ray Tracing следующего поколения</li>
                  <li>✓ Neural Engine с 38 TOPS (в 2 раза быстрее M3)</li>
                  <li>✓ Поддержка до 128GB Unified Memory</li>
                  <li>✓ Улучшенная эффективность: +30% время работы от батареи</li>
                </ul>
              </div>

              <h3 className="text-xl font-semibold mb-3">Три версии M4</h3>
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="border border-border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">M4</h4>
                  <ul className="text-sm space-y-1">
                    <li>• 8-10 CPU ядер</li>
                    <li>• 10 GPU ядер</li>
                    <li>• До 32GB RAM</li>
                    <li>• Для Air и Pro 13"</li>
                  </ul>
                </div>
                <div className="border border-primary rounded-lg p-4">
                  <h4 className="font-semibold mb-2">M4 Pro</h4>
                  <ul className="text-sm space-y-1">
                    <li>• 12-14 CPU ядер</li>
                    <li>• 16-20 GPU ядер</li>
                    <li>• До 64GB RAM</li>
                    <li>• Для Pro 14" и 16"</li>
                  </ul>
                </div>
                <div className="border border-border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">M4 Max</h4>
                  <ul className="text-sm space-y-1">
                    <li>• 14-16 CPU ядер</li>
                    <li>• 32-40 GPU ядер</li>
                    <li>• До 128GB RAM</li>
                    <li>• Для Pro 14" и 16"</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Сравнение производительности</h2>
              
              <h3 className="text-xl font-semibold mb-3">Бенчмарки Geekbench 6</h3>
              <div className="overflow-x-auto mb-6">
                <table className="w-full border-collapse">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="border border-border p-3 text-left">Процессор</th>
                      <th className="border border-border p-3">Single-Core</th>
                      <th className="border border-border p-3">Multi-Core</th>
                      <th className="border border-border p-3">Прирост</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <tr>
                      <td className="border border-border p-3">M2</td>
                      <td className="border border-border p-3">~2600</td>
                      <td className="border border-border p-3">~9500</td>
                      <td className="border border-border p-3">Базовый уровень</td>
                    </tr>
                    <tr>
                      <td className="border border-border p-3">M3</td>
                      <td className="border border-border p-3">~3100</td>
                      <td className="border border-border p-3">~11800</td>
                      <td className="border border-border p-3">+20% vs M2</td>
                    </tr>
                    <tr className="bg-primary/5">
                      <td className="border border-border p-3 font-semibold">M4</td>
                      <td className="border border-border p-3 font-semibold">~3800</td>
                      <td className="border border-border p-3 font-semibold">~14500</td>
                      <td className="border border-border p-3 font-semibold text-primary">+23% vs M3</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-xl font-semibold mb-3">Реальные задачи</h3>
              <div className="space-y-4 mb-6">
                <div className="border-l-4 border-primary pl-4">
                  <p className="font-semibold mb-1">Экспорт 4K видео (5 минут, Final Cut Pro)</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span>M2: 2:45</span>
                    <span>M3: 2:20</span>
                    <span className="font-semibold text-primary">M4: 1:50 ⚡</span>
                  </div>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <p className="font-semibold mb-1">Сборка Xcode проекта (React Native)</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span>M2: 55 сек</span>
                    <span>M3: 45 сек</span>
                    <span className="font-semibold text-primary">M4: 32 сек ⚡</span>
                  </div>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <p className="font-semibold mb-1">Рендер 3D-сцены (Blender Cycles)</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span>M2: 8:20</span>
                    <span>M3: 6:45</span>
                    <span className="font-semibold text-primary">M4: 4:50 ⚡</span>
                  </div>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <p className="font-semibold mb-1">Обработка RAW фото (100 файлов, Lightroom)</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span>M2: 6:10</span>
                    <span>M3: 5:20</span>
                    <span className="font-semibold text-primary">M4: 4:00 ⚡</span>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Стоит ли обновляться?</h2>
              
              <div className="space-y-4 mb-6">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                  <h3 className="font-semibold text-green-600 dark:text-green-400 mb-2">
                    ✅ Стоит обновляться с M1/M2, если:
                  </h3>
                  <ul className="text-sm space-y-1">
                    <li>✓ Занимаетесь профессиональным видеомонтажом (4K/8K)</li>
                    <li>✓ Работаете с 3D-графикой и рендерингом</li>
                    <li>✓ Разрабатываете с тяжелыми эмуляторами и виртуальными машинами</li>
                    <li>✓ Используете AI/ML инструменты (Stable Diffusion, LLM)</li>
                    <li>✓ Нужно больше 24GB RAM</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                  <h3 className="font-semibold text-yellow-600 dark:text-yellow-400 mb-2">
                    ⚠️ Можно подождать, если у вас M3:
                  </h3>
                  <ul className="text-sm space-y-1">
                    <li>• Прирост производительности ~20-25%</li>
                    <li>• Для обычных задач разница незаметна</li>
                    <li>• M3 еще долго останется актуальным</li>
                    <li>• Цены на M4 пока высокие</li>
                  </ul>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                  <h3 className="font-semibold text-red-600 dark:text-red-400 mb-2">
                    ❌ Не стоит обновляться, если:
                  </h3>
                  <ul className="text-sm space-y-1">
                    <li>• У вас M3 и задачи не требуют экстремальной производительности</li>
                    <li>• Бюджет ограничен — разница в цене 30,000-50,000₽</li>
                    <li>• Используете MacBook только для офиса и интернета</li>
                    <li>• Планируете upgrade через 1-2 года</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Цены на MacBook M4 в России</h2>
              <p className="mb-4">
                MacBook с M4 только начали появляться на вторичном рынке. Вот ориентировочные цены:
              </p>
              
              <div className="bg-card rounded-lg p-6 border mb-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Модель</th>
                      <th className="text-right py-2">Новый</th>
                      <th className="text-right py-2">Б/У (ожидается)</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <tr className="border-b">
                      <td className="py-2">MacBook Air M4 8GB 256GB</td>
                      <td className="text-right py-2">от 130,000₽</td>
                      <td className="text-right py-2 text-muted-foreground">~75,000₽</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">MacBook Air M4 16GB 512GB</td>
                      <td className="text-right py-2">от 160,000₽</td>
                      <td className="text-right py-2 text-muted-foreground">~95,000₽</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">MacBook Pro 14" M4 Pro</td>
                      <td className="text-right py-2">от 240,000₽</td>
                      <td className="text-right py-2 text-muted-foreground">~180,000₽</td>
                    </tr>
                    <tr>
                      <td className="py-2">MacBook Pro 16" M4 Max</td>
                      <td className="text-right py-2">от 350,000₽</td>
                      <td className="text-right py-2 text-muted-foreground">~270,000₽</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-xs text-muted-foreground mt-4">
                  *Б/у модели с M4 появятся на рынке через 3-6 месяцев после релиза
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Итоговая рекомендация</h2>
              <div className="bg-gradient-primary rounded-lg p-6 text-white mb-6">
                <p className="text-lg font-semibold mb-2">Для большинства: M3 всё еще отличный выбор</p>
                <p className="text-sm opacity-90 mb-4">
                  M4 — это эволюция, а не революция. Если у вас M2 или M3, и они справляются с задачами — 
                  спешить с обновлением не стоит. Подождите 6-12 месяцев, когда цены на б/у M4 станут адекватными.
                </p>
                <p className="text-sm opacity-90">
                  Покупайте M4, если вам критична максимальная производительность прямо сейчас, или нужно 
                  больше 24GB RAM. Для остальных M3 Pro остается лучшим соотношением цена/производительность.
                </p>
              </div>
            </section>
          </div>

          <div className="mt-12 bg-gradient-primary rounded-lg p-8 text-white text-center">
            <h3 className="text-2xl font-bold mb-4">Ищете MacBook M4?</h3>
            <p className="mb-6">Следите за нашими поступлениями или оставьте заявку на подбор</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button asChild size="lg" variant="secondary">
                <Link to="/buy">Смотреть MacBook в наличии</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-white text-primary hover:bg-white/90">
                <Link to="/selection">Подобрать MacBook</Link>
              </Button>
            </div>
          </div>
        </motion.article>
      </main>

      <Footer />
    </div>
  );
};

export default MacbookM4Obzor;
