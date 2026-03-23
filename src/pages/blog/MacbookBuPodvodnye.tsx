import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";
import { generateArticleSchema } from "@/lib/structured-data";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

const MacbookBuPodvodnye = () => {
  const article = generateArticleSchema({
    title: "Подводные камни покупки б/у MacBook: чего опасаться",
    description: "Распространенные проблемы при покупке б/у MacBook, красные флаги, как избежать обмана и проверить устройство перед покупкой.",
    datePublished: "2024-01-10",
    dateModified: "2024-01-10",
    author: "BestMac",
    url: "/blog/macbook-bu-podvodnye",
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead 
        title="Подводные камни покупки б/у MacBook в 2024 | BestMac"
        description="Узнайте о распространенных проблемах и рисках при покупке б/у MacBook. Красные флаги, способы проверки и советы как избежать обмана при покупке с рук."
        canonical="/blog/macbook-bu-podvodnye"
        schema={article}
        keywords="б/у MacBook проблемы, купить MacBook с рук, проверка MacBook перед покупкой, подводные камни MacBook"
      />
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-12">
        <Breadcrumbs items={[
          { name: "Главная", url: "/" },
          { name: "Блог", url: "/#blog" },
          { name: "Подводные камни б/у MacBook", url: "/blog/macbook-bu-podvodnye" }
        ]} />

        <article className="max-w-4xl mx-auto prose prose-lg">
          <h1 className="text-4xl font-bold mb-6">Подводные камни покупки б/у MacBook: чего опасаться</h1>
          
          <p className="text-xl text-muted-foreground mb-8">
            Покупка б/у MacBook может сэкономить до 50% бюджета, но важно знать о рисках. 
            Разбираем главные проблемы и способы их избежать.
          </p>

          <section className="mb-8 bg-destructive/10 p-6 rounded-lg border-l-4 border-destructive">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="text-destructive mt-1" size={24} />
              <h2 className="text-2xl font-semibold m-0">Топ-5 самых опасных проблем</h2>
            </div>
            <ol className="list-decimal pl-6 space-y-2">
              <li className="font-semibold">iCloud Lock (блокировка активации)</li>
              <li className="font-semibold">Скрытые повреждения от жидкости</li>
              <li className="font-semibold">Неоригинальные комплектующие</li>
              <li className="font-semibold">Проблемы с батареей</li>
              <li className="font-semibold">MacBook в розыске или залоге</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">🔒 Проблема #1: iCloud Lock</h2>
            <h3 className="text-xl font-medium mb-3">Что это?</h3>
            <p className="mb-4">
              Блокировка активации привязывает MacBook к Apple ID предыдущего владельца. 
              Если продавец не отвязал устройство, вы получите "кирпич" - MacBook будет требовать пароль, 
              который вы не знаете.
            </p>

            <h3 className="text-xl font-medium mb-3">Как проверить</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>При включении MacBook должен открываться экран настройки, а не запрос пароля</li>
              <li>Зайдите в "Системные настройки" → "Apple ID" - должно быть "Войти"</li>
              <li>Попросите продавца выйти из iCloud при вас</li>
              <li>Проверьте серийник на <a href="https://checkcoverage.apple.com" target="_blank" rel="noopener">checkcoverage.apple.com</a></li>
            </ul>

            <div className="bg-muted p-4 rounded-lg mb-4">
              <p className="font-semibold mb-2">⚠️ Красный флаг:</p>
              <p>Продавец говорит "потом отвяжу", "я забыл пароль", "можно обойти через техподдержку" - бегите!</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">💧 Проблема #2: Скрытые повреждения от жидкости</h2>
            <p className="mb-4">
              Залитый MacBook может работать месяцами после инцидента, а потом внезапно выйти из строя. 
              Коррозия медленно разрушает контакты и компоненты.
            </p>

            <h3 className="text-xl font-medium mb-3">Как обнаружить</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Индикаторы жидкости внутри портов (красные точки вместо белых)</li>
              <li>Следы коррозии на портах USB-C/Thunderbolt</li>
              <li>Липкие или тугие клавиши</li>
              <li>Пятна под экраном или клавиатурой</li>
              <li>Неработающие порты или динамики</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">Диагностика Apple</h3>
            <p className="mb-4">
              Запустите встроенную диагностику: выключите MacBook, включите и сразу зажмите клавишу D. 
              Система проверит компоненты и покажет ошибки. Коды ошибок с "VFD" или "PPP" могут указывать на залив.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">🔧 Проблема #3: Неоригинальные комплектующие</h2>
            <p className="mb-4">
              Некоторые продавцы после ремонта заменяют оригинальные детали на дешевые аналоги или 
              б/у запчасти с других MacBook.
            </p>

            <h3 className="text-xl font-medium mb-3">Что подделывают чаще всего</h3>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Экран:</strong> Дешевые китайские матрицы имеют худшие углы обзора и цветопередачу</li>
              <li><strong>SSD:</strong> Вместо оригинального Apple SSD ставят OWC или другие - снижается скорость</li>
              <li><strong>Батарея:</strong> Подделки служат в 2-3 раза меньше и могут вздуться</li>
              <li><strong>Клавиатура:</strong> Неоригинальные топкейсы быстро изнашиваются</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">Как проверить</h3>
            <p className="mb-4">
              Зайдите в "Об этом Mac" → "Отчет о системе":
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Графика/Мониторы:</strong> должно быть "Built-in Retina Display"</li>
              <li><strong>Хранилище:</strong> оригинальный SSD имеет название "APPLE SSD"</li>
              <li><strong>Электропитание:</strong> проверьте состояние батареи и количество циклов</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">🔋 Проблема #4: Убитая батарея</h2>
            <p className="mb-4">
              Замена батареи в авторизованном сервисе стоит 15,000-25,000₽. 
              Если MacBook старше 3 лет, высока вероятность что батарея изношена.
            </p>

            <div className="bg-muted p-4 rounded-lg mb-4">
              <h3 className="text-lg font-semibold mb-2">Проверка состояния батареи:</h3>
              <ol className="list-decimal pl-6 space-y-1">
                <li>Зажмите Option и кликните на иконку батареи в меню</li>
                <li>Смотрите "Состояние":
                  <ul className="list-disc pl-6 mt-2">
                    <li><CheckCircle className="inline text-green-500" size={16} /> Норма - отлично</li>
                    <li><AlertTriangle className="inline text-yellow-500" size={16} /> Скоро требуется замена - еще поработает</li>
                    <li><XCircle className="inline text-red-500" size={16} /> Требуется замена / Требуется обслуживание - срочная замена</li>
                  </ul>
                </li>
                <li>Посмотрите количество циклов в "Об этом Mac" → "Отчет о системе" → "Электропитание"</li>
              </ol>
            </div>

            <p className="mb-4">
              <strong>Норма циклов зарядки:</strong> до 500 - батарея как новая, 500-800 - нормальный износ, 
              800-1000 - скоро замена, больше 1000 - нужна замена.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">🚨 Проблема #5: MacBook в розыске</h2>
            <p className="mb-4">
              Украденные MacBook продают по заниженной цене. Если купите такой, его могут изъять 
              без возврата денег, плюс возможны проблемы с законом.
            </p>

            <h3 className="text-xl font-medium mb-3">Как проверить</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Проверьте серийный номер на <strong>imeipro.info</strong> и <strong>sndeep.info</strong></li>
              <li>Попросите паспорт продавца и сделайте фото (честные продавцы согласятся)</li>
              <li>Проверьте чек или гарантийный талон - серийник должен совпадать</li>
              <li>Встретьтесь у продавца дома, а не на улице</li>
            </ul>

            <div className="bg-destructive/10 p-4 rounded-lg border-l-4 border-destructive mb-4">
              <p className="font-semibold mb-2">🚩 Красные флаги:</p>
              <ul className="list-disc pl-6">
                <li>Продавец отказывается показать паспорт</li>
                <li>Нет документов на MacBook</li>
                <li>Серийник на коробке не совпадает с MacBook</li>
                <li>Цена на 30-40% ниже рынка</li>
                <li>Продавец торопит со сделкой</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">📋 Чек-лист проверки перед покупкой</h2>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" />
                <span>Внешний осмотр на сколы, царапины, вмятины</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" />
                <span>Проверка iCloud Lock (Apple ID должен быть выйден)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" />
                <span>Запуск диагностики Apple (Command + D при загрузке)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" />
                <span>Проверка состояния батареи и количества циклов</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" />
                <span>Тест всех портов (USB-C, Jack 3.5, SD-карта если есть)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" />
                <span>Проверка клавиатуры (все клавиши, подсветка)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" />
                <span>Тест Touch ID и Touch Bar (если есть)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" />
                <span>Проверка камеры и микрофона (FaceTime)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" />
                <span>Тест динамиков на максимальной громкости</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" />
                <span>Wi-Fi и Bluetooth подключение</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" />
                <span>Проверка серийника на сайте Apple</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" />
                <span>Наличие документов и чека</span>
              </label>
            </div>
          </section>

          <section className="mb-8 bg-primary/10 p-6 rounded-lg border-l-4 border-primary">
            <h2 className="text-2xl font-semibold mb-4">✅ Безопасная альтернатива - покупка у ритейлеров</h2>
            <p className="mb-4">
              Покупка б/у MacBook у проверенных компаний исключает большинство рисков:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>Гарантия:</strong> официальная гарантия от магазина 3-12 месяцев</li>
              <li><strong>Проверка:</strong> техническая диагностика перед продажей</li>
              <li><strong>Документы:</strong> чеки, договор купли-продажи</li>
              <li><strong>Чистая история:</strong> проверка на iCloud Lock и розыск</li>
              <li><strong>Возврат:</strong> возможность вернуть в течение 7-14 дней</li>
            </ul>
            <p className="font-semibold">
              BestMac предлагает б/у MacBook с полной диагностикой, гарантией и юридической чистотой. 
              Цены от 70,000₽, трейд-in вашего старого устройства.
            </p>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default MacbookBuPodvodnye;