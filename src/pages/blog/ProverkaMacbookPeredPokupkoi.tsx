import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const ProverkaMacbookPeredPokupkoi = () => {
  const breadcrumbItems = [
    { name: "Главная", url: "/" },
    { name: "Проверка MacBook перед покупкой", url: "/blog/proverka-macbook-pered-pokupkoi" }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead 
        title="Проверка MacBook перед покупкой — что проверить | BestMac"
        description="Полное руководство по проверке MacBook перед покупкой б/у: аккумулятор, клавиатура, экран, корпус, гарантия и как избежать мошенничества."
        canonical="/blog/proverka-macbook-pered-pokupkoi"
        keywords="проверка macbook перед покупкой, как проверить macbook, macbook б/у проверка, гарантия macbook"
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
            Проверка MacBook перед покупкой: полный чеклист
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Что обязательно нужно проверить при покупке б/у MacBook
          </p>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">🔋 Проверка аккумулятора</h2>
              <p className="text-muted-foreground mb-4">
                От состояния аккумулятора зависит автономность ноутбука. Обязательно проверьте:
              </p>
              <ol className="list-decimal pl-6 space-y-2 mb-6">
                <li>Откройте "Информация о системе" (Command + Space → "Информация о системе")</li>
                <li>Перейдите в раздел "Электропитание"</li>
                <li>Проверьте <strong>Количество циклов</strong> (циклы батареи):
                  <ul className="list-disc pl-6 mt-2">
                    <li>0-300 циклов — отличное состояние</li>
                    <li>300-600 — хорошее</li>
                    <li>600-800 — удовлетворительное</li>
                    <li>800+ — плохое, нужна замена</li>
                  </ul>
                </li>
                <li>Убедитесь, что <strong>Ухудшение состояния</strong> показывает не более 20%</li>
              </ol>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold mb-1">⚠️ Важно</p>
                <p className="text-sm text-muted-foreground">
                  Если состояние ниже "Требуется обслуживание" — аккумулятор нуждается в замене 
                  (стоимость около 15,000₽). Учитывайте это при торге.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">⌨️ Проверка клавиатуры и трекпада</h2>
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="border border-border rounded-lg p-6">
                  <h3 className="font-semibold mb-3">Клавиатура</h3>
                  <ul className="space-y-2 text-sm">
                    <li>✓ Все клавиши нажимаются равномерно</li>
                    <li>✓ Нет залипающих кнопок</li>
                    <li>✓ Backlight работает (если есть)</li>
                    <li>✓ Нет физических повреждений</li>
                    <li>✓ Command, Option, Shift работают</li>
                  </ul>
                </div>
                
                <div className="border border-border rounded-lg p-6">
                  <h3 className="font-semibold mb-3">Трекпад</h3>
                  <ul className="space-y-2 text-sm">
                    <li>✓ Реагирует на все жесты</li>
                    <li>✓ Нажатие работает везде</li>
                    <li>✓ Нет залипания курсора</li>
                    <li>✓ Force Touch (3D Touch) работает</li>
                    <li>✓ Скролл плавный</li>
                  </ul>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Замените клавиатуру на тестовом документе вводом — проверьте раскладку, 
                автодополнение, специальные символы.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">🖥️ Проверка экрана</h2>
              <div className="space-y-4 mb-6">
                <div>
                  <h3 className="font-semibold mb-2">Pixel Test</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Откройте полноэкранные изображения разных цветов (черный, белый, красный, 
                    зеленый, синий) для проверки на битые пиксели.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Проверка подсветки</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Включите максимальную яркость на белом экране. Проверьте равномерность 
                    подсветки по углам — не должно быть темных пятен.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Эффект "кисточки" на экранах Retina</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Яркие белые участки при минимальной яркости могут вызывать "stain gate" — 
                    это производственный дефект некоторых моделей Pro 2016-2020 годов. 
                    Проверьте: темный экран, минимальная яркость, белые сферы.
                  </p>
                </div>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold mb-1">💡 Совет</p>
                <p className="text-sm text-muted-foreground">
                  Небольшие царапины на экране можно замаскировать матовой пленкой или закрыть 
                  при торге. Глубокие трещины и разбитые экраны — дело дорогое (25,000-60,000₽).
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">🔒 Проверка iCloud и активационного замка</h2>
              <p className="mb-4 text-muted-foreground">
                Это критично! Заблокированный MacBook бесполезен для использования.
              </p>
              <ol className="list-decimal pl-6 space-y-2 mb-6">
                <li>Попросите продавца <strong>войти в iCloud аккаунт</strong> при вас</li>
                <li>Войдите в меню Apple → "Об этом Mac" → "Системный отчет"</li>
                <li>Проверьте раздел <strong>"Активационная блокировка"</strong>:
                  <ul className="list-disc pl-6 mt-2">
                    <li>Статус должен быть <strong>"Выключена"</strong></li>
                    <li>Если "Включена" — требуйте снять блокировку</li>
                  </ul>
                </li>
                <li>Проверьте настройки конфиденциальности в "Настройки" → "Apple ID"</li>
              </ol>
              
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold mb-1 text-red-600 dark:text-red-400">⚠️ АКТИВНОСТЬ ОПАСНОСТЬ</p>
                <p className="text-sm text-muted-foreground">
                  Если iCloud активирован и продавец не может снять блокировку — <strong>НИ В КОЕМ СЛУЧАЕ 
                  НЕ ПОКУПАЙТЕ</strong>. Это либо краденый MacBook, либо продавец не сможет 
                  его разблокировать.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">🔌 Проверка портов и разъемов</h2>
              <p className="mb-4 text-muted-foreground">
                Проверьте работоспособность всех разъемов. Возьмите с собой кабели для проверки:
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-6">
                <li><strong>USB-C/Thunderbolt</strong> — подключите внешний диск или зарядку</li>
                <li><strong>MagSafe</strong> (если есть) — подключите оригинальный кабель</li>
                <li><strong>3.5mm</strong> (если есть) — подключите наушники</li>
                <li><strong>SD-слот</strong> (в старых Pro) — вставьте карту</li>
              </ul>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm font-semibold mb-1">✓ Бонус</p>
                <p className="text-sm text-muted-foreground">
                  Работающие порты — признак того, что MacBook обслуживался аккуратно. 
                  Поврежденные порты могут означать пролитые жидкости.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">💾 Проверка накопителя</h2>
              <ol className="list-decimal pl-6 space-y-2 mb-6">
                <li>Откройте "Дисковую утилиту" (Utility → Disk Utility)</li>
                <li>Выберите основной диск</li>
                <li>Нажмите "Первая помощь" для проверки на ошибки</li>
                <li>Проверьте объем свободного места</li>
              </ol>
              <p className="text-sm text-muted-foreground italic mb-6">
                Накопитель SSD должен пройти проверку без ошибок. Если система предлагает 
                переустановить macOS — это может быть признаком проблем с накопителем.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">🏷️ Проверка гарантии</h2>
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="border border-border rounded-lg p-6">
                  <h3 className="font-semibold mb-2">Официальная гарантия Apple</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Проверьте гарантию на сайте Apple по серийному номеру.
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>✓ В пределах гарантии — ценность выше</li>
                    <li>✓ Можно продлить AppleCare+</li>
                    <li>✓ Бесплатное обслуживание</li>
                  </ul>
                </div>
                
                <div className="border border-border rounded-lg p-6">
                  <h3 className="font-semibold mb-2">Гарантия продавца</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    На какие срок работает организация.
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>✓ Письменный гарантийный талон</li>
                    <li>✓ Возможность возврата в срок</li>
                    <li>✓ Обслуживание по договору</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">📋 Финальный чеклист</h2>
              <div className="bg-muted/50 rounded-lg p-6 space-y-3">
                <p className="font-semibold mb-2">Перед покупкой проверьте:</p>
                <ul className="space-y-2 text-sm">
                  <li>☐ Аккумулятор: циклы &lt;800, износ &lt;20%</li>
                  <li>☐ Экран: нет битых пикселей, равномерная подсветка</li>
                  <li>☐ Клавиатура и трекпад работают</li>
                  <li>☐ iCloud разблокирован</li>
                  <li>☐ Все порты работают</li>
                  <li>☐ Корпус в заявленном состоянии</li>
                  <li>☐ Гарантия продавца (если есть)</li>
                  <li>☐ Владелец продает лично или по доверенности</li>
                  <li>☐ Чек/документы на руках</li>
                </ul>
              </div>
              
              <div className="mt-8 p-6 bg-muted/50 rounded-lg">
                <h3 className="font-semibold mb-3">📚 Читайте также:</h3>
                <ul className="space-y-2 text-sm">
                  <li><Link to="/blog/kak-vybrat-macbook-2024" className="text-primary hover:underline">→ Как выбрать MacBook в 2024 году</Link></li>
                  <li><Link to="/blog/macbook-bu-podvodnye" className="text-primary hover:underline">→ Подводные камни покупки б/у MacBook</Link></li>
                  <li><Link to="/buy" className="text-primary hover:underline">→ Купить проверенный MacBook с гарантией</Link></li>
                </ul>
              </div>
            </section>
          </div>

          <div className="mt-12 bg-gradient-primary rounded-lg p-8 text-white text-center">
            <h3 className="text-2xl font-bold mb-4">Нужна помощь?</h3>
            <p className="mb-6">Наша команда поможет выбрать и проверить MacBook перед покупкой</p>
            <Button asChild size="lg" variant="secondary">
              <Link to="/buy">Посмотреть MacBook в продаже</Link>
            </Button>
          </div>
        </motion.article>
      </main>

      <Footer />
    </div>
  );
};

export default ProverkaMacbookPeredPokupkoi;

