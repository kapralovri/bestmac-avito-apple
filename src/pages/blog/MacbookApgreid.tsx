import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";
import { generateArticleSchema } from "@/lib/structured-data";
import { CheckCircle, XCircle } from "lucide-react";

const MacbookApgreid = () => {
  const article = generateArticleSchema({
    title: "Можно ли апгрейдить MacBook: что реально заменить",
    description: "Полный гид по апгрейду MacBook. Узнайте, какие компоненты можно заменить в разных моделях, стоимость апгрейда и альтернативные решения.",
    datePublished: "2024-01-18",
    dateModified: "2024-01-18",
    author: "BestMac",
    url: "/blog/macbook-apgreid",
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead 
        title="Можно ли апгрейдить MacBook в 2024: что реально заменить | BestMac"
        description="Подробный гид по апгрейду MacBook. Какие компоненты можно заменить самостоятельно, что требует сервиса. Сравнение возможностей старых и новых моделей."
        canonical="/blog/macbook-apgreid"
        schema={article}
        keywords="апгрейд MacBook, замена RAM MacBook, увеличить память MacBook, апгрейд SSD MacBook"
      />
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-12">
        <Breadcrumbs items={[
          { name: "Главная", url: "/" },
          { name: "Блог", url: "/#blog" },
          { name: "Апгрейд MacBook", url: "/blog/macbook-apgreid" }
        ]} />

        <article className="max-w-4xl mx-auto prose prose-lg">
          <h1 className="text-4xl font-bold mb-6">Можно ли апгрейдить MacBook: что реально заменить</h1>
          
          <p className="text-xl text-muted-foreground mb-8">
            Возможности апгрейда MacBook сильно зависят от модели и года выпуска. 
            Разбираемся, что можно заменить и стоит ли оно того.
          </p>

          <section className="mb-8 bg-muted p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">⚠️ Главное правило</h2>
            <p className="text-lg mb-4">
              <strong>MacBook на чипах Apple Silicon (M1/M2/M3/M4) НЕ АПГРЕЙДЯТСЯ</strong>
            </p>
            <p>
              RAM, SSD и процессор интегрированы в единый чип. Это значит, что характеристики, 
              которые вы выбрали при покупке, останутся навсегда. Единственное, что можно заменить - 
              батарея, экран и клавиатура (в сервисе).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Что можно апгрейдить в Intel MacBook (до 2020)</h2>

            <div className="space-y-6">
              <div className="border border-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="text-green-500" size={28} />
                  <h3 className="text-xl font-bold m-0">RAM (оперативная память)</h3>
                </div>
                
                <p className="mb-4">
                  <strong>Какие модели:</strong> MacBook Pro 13"/15"/16" 2012-2015 годов
                </p>
                
                <p className="mb-4">
                  <strong>Сложность:</strong> Средняя (требуется отвертка и аккуратность)
                </p>

                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="font-semibold mb-2">Примеры:</p>
                  <ul className="list-disc pl-6 text-sm space-y-1">
                    <li>MacBook Pro 13" Mid 2012: 4GB → 16GB (стоимость ~3,000₽)</li>
                    <li>MacBook Pro 15" Mid 2015: 8GB → 16GB (стоимость ~3,500₽)</li>
                  </ul>
                </div>

                <p className="text-sm text-muted-foreground">
                  ⚠️ С 2016 года RAM припаян к материнской плате даже в Intel MacBook
                </p>
              </div>

              <div className="border border-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="text-green-500" size={28} />
                  <h3 className="text-xl font-bold m-0">SSD (накопитель)</h3>
                </div>
                
                <p className="mb-4">
                  <strong>Какие модели:</strong> MacBook Pro/Air 2013-2017 (с некоторыми ограничениями)
                </p>
                
                <p className="mb-4">
                  <strong>Сложность:</strong> Высокая (нужен специальный переходник и совместимый SSD)
                </p>

                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="font-semibold mb-2">Стоимость апгрейда:</p>
                  <ul className="list-disc pl-6 text-sm space-y-1">
                    <li>SSD 500GB (OWC Aura): ~12,000₽</li>
                    <li>SSD 1TB (OWC Aura): ~20,000₽</li>
                    <li>SSD 2TB (OWC Aura): ~35,000₽</li>
                  </ul>
                </div>

                <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-4 rounded">
                  <p className="text-sm font-semibold mb-1">⚠️ Важно:</p>
                  <p className="text-sm">
                    После 2016 года Apple использует проприетарный формат SSD. 
                    Апгрейд возможен только через специализированные бренды (OWC, Transcend), 
                    и стоимость SSD выше обычных в 2-3 раза.
                  </p>
                </div>
              </div>

              <div className="border border-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="text-green-500" size={28} />
                  <h3 className="text-xl font-bold m-0">Батарея</h3>
                </div>
                
                <p className="mb-4">
                  <strong>Какие модели:</strong> Все MacBook (включая M1/M2/M3)
                </p>
                
                <p className="mb-4">
                  <strong>Сложность:</strong> Высокая (рекомендуется сервис)
                </p>

                <div className="bg-muted p-4 rounded-lg mb-4">
                  <p className="font-semibold mb-2">Стоимость замены:</p>
                  <ul className="list-disc pl-6 text-sm space-y-1">
                    <li>Официальный Apple Service: 15,000-25,000₽</li>
                    <li>Неофициальный сервис: 8,000-15,000₽</li>
                  </ul>
                </div>

                <p className="text-sm">
                  В моделях с 2016 года батарея приклеена к корпусу. Самостоятельная замена 
                  сложна и может повредить другие компоненты.
                </p>
              </div>

              <div className="border border-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <XCircle className="text-red-500" size={28} />
                  <h3 className="text-xl font-bold m-0">Процессор (CPU)</h3>
                </div>
                
                <p className="mb-4">
                  <strong>Какие модели:</strong> Никакие
                </p>
                
                <p className="mb-4">
                  Процессор припаян к материнской плате во всех MacBook. Апгрейд технически невозможен.
                </p>
              </div>

              <div className="border border-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <XCircle className="text-red-500" size={28} />
                  <h3 className="text-xl font-bold m-0">Видеокарта (GPU)</h3>
                </div>
                
                <p className="mb-4">
                  <strong>Какие модели:</strong> Никакие
                </p>
                
                <p className="mb-4">
                  Видеочип интегрирован в процессор (Intel) или SoC (Apple Silicon). Замена невозможна.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Сравнительная таблица возможностей апгрейда</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-3 text-left">Модель</th>
                    <th className="border border-border p-3 text-center">RAM</th>
                    <th className="border border-border p-3 text-center">SSD</th>
                    <th className="border border-border p-3 text-center">Батарея</th>
                    <th className="border border-border p-3 text-center">CPU/GPU</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border p-3">MacBook Pro 2012-2015</td>
                    <td className="border border-border p-3 text-center">✅</td>
                    <td className="border border-border p-3 text-center">✅</td>
                    <td className="border border-border p-3 text-center">✅</td>
                    <td className="border border-border p-3 text-center">❌</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-3">MacBook Pro 2016-2019</td>
                    <td className="border border-border p-3 text-center">❌</td>
                    <td className="border border-border p-3 text-center">⚠️</td>
                    <td className="border border-border p-3 text-center">✅</td>
                    <td className="border border-border p-3 text-center">❌</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-3">MacBook Pro 2020 Intel</td>
                    <td className="border border-border p-3 text-center">❌</td>
                    <td className="border border-border p-3 text-center">❌</td>
                    <td className="border border-border p-3 text-center">✅</td>
                    <td className="border border-border p-3 text-center">❌</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-3">MacBook M1/M2/M3/M4</td>
                    <td className="border border-border p-3 text-center">❌</td>
                    <td className="border border-border p-3 text-center">❌</td>
                    <td className="border border-border p-3 text-center">✅</td>
                    <td className="border border-border p-3 text-center">❌</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              ✅ - возможно самостоятельно или в сервисе | ⚠️ - возможно, но дорого | ❌ - невозможно
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Альтернативы апгрейду</h2>

            <h3 className="text-xl font-medium mb-3">1. Внешний SSD для расширения памяти</h3>
            <div className="bg-muted p-4 rounded-lg mb-4">
              <p className="mb-2">
                <strong>Стоимость:</strong> 5,000-15,000₽ за 500GB-2TB
              </p>
              <p className="mb-2">
                <strong>Плюсы:</strong> Дешево, легко, работает с любым MacBook, скорость близка к внутреннему SSD (через Thunderbolt)
              </p>
              <p>
                <strong>Минусы:</strong> Занимает порт, нужно носить с собой
              </p>
            </div>

            <h3 className="text-xl font-medium mb-3">2. Облачное хранилище</h3>
            <div className="bg-muted p-4 rounded-lg mb-4">
              <p className="mb-2">
                <strong>Стоимость:</strong> от 150₽/месяц за 200GB (iCloud)
              </p>
              <p className="mb-2">
                <strong>Плюсы:</strong> Доступ с любого устройства, автоматический бэкап, не занимает порты
              </p>
              <p>
                <strong>Минусы:</strong> Требует интернет, ежемесячная плата
              </p>
            </div>

            <h3 className="text-xl font-medium mb-3">3. eGPU (внешняя видеокарта)</h3>
            <div className="bg-muted p-4 rounded-lg mb-4">
              <p className="mb-2">
                <strong>Стоимость:</strong> от 30,000₽ (бокс + видеокарта)
              </p>
              <p className="mb-2">
                <strong>Плюсы:</strong> Многократное увеличение графической производительности для игр и 3D
              </p>
              <p>
                <strong>Минусы:</strong> Работает только с Intel MacBook через Thunderbolt 3, не поддерживается на M1/M2/M3
              </p>
            </div>

            <h3 className="text-xl font-medium mb-3">4. Оптимизация системы</h3>
            <div className="bg-primary/10 p-4 rounded-lg border-l-4 border-primary">
              <p className="font-semibold mb-2">Бесплатные способы ускорить MacBook:</p>
              <ul className="list-disc pl-6 text-sm space-y-1">
                <li>Очистить кэш и ненужные файлы (освобождает 10-50GB)</li>
                <li>Отключить визуальные эффекты в Настройках → Универсальный доступ</li>
                <li>Переустановить macOS начисто</li>
                <li>Удалить автозагрузку ненужных программ</li>
                <li>Использовать легкие альтернативы тяжелым программам</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Стоит ли апгрейдить старый MacBook?</h2>

            <div className="space-y-4">
              <div className="bg-green-500/10 border-l-4 border-green-500 p-4 rounded">
                <p className="font-semibold mb-2">✅ Стоит апгрейдить, если:</p>
                <ul className="list-disc pl-6 text-sm space-y-1">
                  <li>У вас MacBook Pro 2012-2015 с возможностью замены RAM</li>
                  <li>Вам не хватает 4-8GB RAM, и апгрейд до 16GB стоит 3,000₽</li>
                  <li>Нужно заменить разряженную батарею (меньше 2 часов работы)</li>
                  <li>MacBook в отличном состоянии и устраивает по производительности</li>
                </ul>
              </div>

              <div className="bg-red-500/10 border-l-4 border-red-500 p-4 rounded">
                <p className="font-semibold mb-2">❌ Не стоит апгрейдить, если:</p>
                <ul className="list-disc pl-6 text-sm space-y-1">
                  <li>Стоимость апгрейда SSD превышает 15,000₽ (дешевле купить внешний SSD)</li>
                  <li>MacBook старше 2015 года и сильно тормозит - лучше заменить на M1</li>
                  <li>Материнская плата имеет проблемы (артефакты на экране, не включается)</li>
                  <li>В сумме апгрейды обойдутся дороже 30,000₽ - проще продать и доплатить на б/у M1</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Пример расчета: апгрейд vs новый MacBook</h2>
            
            <div className="bg-muted p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Ситуация: MacBook Pro 13" 2015, 8GB RAM, 256GB SSD</h3>
              
              <div className="space-y-4 mb-6">
                <div>
                  <p className="font-semibold mb-2">Вариант 1: Апгрейд</p>
                  <ul className="list-disc pl-6 text-sm space-y-1">
                    <li>Увеличить RAM до 16GB: 3,500₽</li>
                    <li>Заменить SSD на 1TB (OWC): 20,000₽</li>
                    <li>Новая батарея: 10,000₽</li>
                    <li><strong>Итого: 33,500₽</strong></li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold mb-2">Вариант 2: Продать и купить новый</p>
                  <ul className="list-disc pl-6 text-sm space-y-1">
                    <li>Продать MacBook Pro 2015: 25,000₽</li>
                    <li>Купить MacBook Air M1 8GB/256GB б/у: 55,000₽</li>
                    <li><strong>Доплата: 30,000₽</strong></li>
                  </ul>
                </div>
              </div>

              <div className="bg-primary/10 p-4 rounded-lg border-l-4 border-primary">
                <p className="font-semibold mb-2">Вердикт:</p>
                <p className="text-sm">
                  За схожую сумму вы получите M1 с производительностью в 3-4 раза выше, 
                  18 часов автономности (вместо 4-6 часов у 2015), поддержкой macOS минимум до 2028 года. 
                  <strong> Рациональнее продать и обновиться.</strong>
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8 bg-primary/10 p-6 rounded-lg border-l-4 border-primary">
            <h2 className="text-2xl font-semibold mb-4">Итоговые рекомендации</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li><strong>MacBook на M1/M2/M3:</strong> Апгрейд невозможен. Выбирайте конфигурацию сразу с запасом.</li>
              <li><strong>Intel MacBook 2016+:</strong> Апгрейд дорогой и сложный. Рассмотрите внешний SSD.</li>
              <li><strong>MacBook 2012-2015:</strong> Можно апгрейдить RAM дешево - имеет смысл.</li>
              <li><strong>Батарея:</strong> Меняйте в сервисе при износе &gt;80% или работе &lt;3 часов.</li>
              <li><strong>Общее правило:</strong> Если суммарный апгрейд дороже 30,000₽ - продайте и купите б/у M1.</li>
            </ol>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default MacbookApgreid;