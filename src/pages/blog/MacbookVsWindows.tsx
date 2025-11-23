import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";
import { generateArticleSchema } from "@/lib/structured-data";

const MacbookVsWindows = () => {
  const article = generateArticleSchema({
    title: "MacBook или Windows ноутбук: что выбрать в 2024 году",
    description: "Сравнение MacBook и Windows ноутбуков по производительности, цене, экосистеме и долговечности. Помогаем сделать правильный выбор.",
    datePublished: "2024-01-15",
    dateModified: "2024-01-15",
    author: "BestMac",
    url: "/blog/macbook-vs-windows",
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead 
        title="MacBook или Windows ноутбук: что выбрать в 2024 | BestMac"
        description="Детальное сравнение MacBook и Windows ноутбуков. Анализ производительности, цены, экосистемы и долговечности. Узнайте, какой вариант подходит именно вам."
        canonical="/blog/macbook-vs-windows"
        schema={article}
        keywords="MacBook vs Windows, сравнение MacBook, что лучше MacBook или Windows, выбор ноутбука 2024"
      />
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-12">
        <Breadcrumbs items={[
          { name: "Главная", url: "/" },
          { name: "Блог", url: "/#blog" },
          { name: "MacBook или Windows", url: "/blog/macbook-vs-windows" }
        ]} />

        <article className="max-w-4xl mx-auto prose prose-lg">
          <h1 className="text-4xl font-bold mb-6">MacBook или Windows ноутбук: что выбрать в 2024 году</h1>
          
          <img 
            src="/macbook_air_m4_price_head.jpg" 
            alt="Сравнение MacBook и Windows ноутбуков"
            className="w-full rounded-lg mb-8"
            loading="lazy"
          />

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Производительность и чипы</h2>
            <h3 className="text-xl font-medium mb-3">MacBook на чипах Apple Silicon</h3>
            <p className="mb-4">
              Чипы M3 и M4 демонстрируют впечатляющую производительность при минимальном энергопотреблении. 
              MacBook Air M3 работает без вентиляторов, оставаясь абсолютно бесшумным даже под нагрузкой.
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>До 22 часов автономной работы</li>
              <li>Мгновенный отклик системы</li>
              <li>Отличная оптимизация для творческих задач</li>
              <li>Нет перегрева даже при длительной работе</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">Windows ноутбуки</h3>
            <p className="mb-4">
              Топовые модели на Intel Core Ultra или AMD Ryzen также показывают высокую производительность, 
              но часто требуют активного охлаждения и потребляют больше энергии.
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Широкий выбор конфигураций</li>
              <li>Больше возможностей для игр</li>
              <li>Обычно 6-12 часов автономной работы</li>
              <li>Может шуметь под нагрузкой</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Цена и доступность</h2>
            <p className="mb-4">
              <strong>MacBook:</strong> Стартовая цена MacBook Air M3 начинается от 120,000₽ новый, 
              от 70,000₽ б/у. Модели Pro значительно дороже - от 200,000₽.
            </p>
            <p className="mb-4">
              <strong>Windows:</strong> Огромный ценовой диапазон от 30,000₽ до 300,000₽. 
              Можно найти качественные модели среднего класса за 60,000-80,000₽.
            </p>
            <p className="mb-4 font-semibold">
              Вывод: Windows ноутбуки предлагают больше вариантов в доступном сегменте, 
              но MacBook лидирует в премиум-классе по соотношению цена/качество.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Экосистема и софт</h2>
            <h3 className="text-xl font-medium mb-3">Преимущества macOS</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Бесшовная интеграция с iPhone и iPad</li>
              <li>Handoff, AirDrop, Universal Control</li>
              <li>Стабильная, безопасная система без вирусов</li>
              <li>Отличные нативные приложения (Final Cut, Logic Pro)</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">Преимущества Windows</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Совместимость с любым софтом и играми</li>
              <li>Больше бесплатных программ</li>
              <li>Полная кастомизация системы</li>
              <li>Поддержка специфичного корпоративного ПО</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Долговечность и поддержка</h2>
            <p className="mb-4">
              <strong>MacBook:</strong> Apple поддерживает свои устройства обновлениями macOS минимум 7 лет. 
              MacBook 2015 года до сих пор может работать на актуальной системе. Качество сборки и материалов 
              обеспечивает долгий срок службы.
            </p>
            <p className="mb-4">
              <strong>Windows:</strong> Поддержка зависит от производителя - обычно 3-5 лет. 
              Качество сборки сильно варьируется. Премиум-модели (Dell XPS, ThinkPad X1) служат долго, 
              бюджетные могут выйти из строя за 2-3 года.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Для кого что подходит</h2>
            
            <h3 className="text-xl font-medium mb-3">Выбирайте MacBook, если вы:</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Работаете с видео, фото, дизайном или музыкой</li>
              <li>Используете iPhone или iPad</li>
              <li>Цените долговечность и стабильность</li>
              <li>Нужна длительная автономная работа</li>
              <li>Хотите бесшумное устройство</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">Выбирайте Windows, если вы:</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Играете в игры</li>
              <li>Работаете со специфичным Windows-софтом</li>
              <li>Ограничены бюджетом (менее 70,000₽)</li>
              <li>Нужна возможность апгрейда компонентов</li>
              <li>Предпочитаете свободу выбора</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Итоговая таблица сравнения</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-3 text-left">Критерий</th>
                    <th className="border border-border p-3 text-left">MacBook</th>
                    <th className="border border-border p-3 text-left">Windows</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border p-3">Производительность</td>
                    <td className="border border-border p-3">⭐⭐⭐⭐⭐</td>
                    <td className="border border-border p-3">⭐⭐⭐⭐</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-3">Автономность</td>
                    <td className="border border-border p-3">⭐⭐⭐⭐⭐</td>
                    <td className="border border-border p-3">⭐⭐⭐</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-3">Цена</td>
                    <td className="border border-border p-3">⭐⭐⭐</td>
                    <td className="border border-border p-3">⭐⭐⭐⭐⭐</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-3">Совместимость ПО</td>
                    <td className="border border-border p-3">⭐⭐⭐⭐</td>
                    <td className="border border-border p-3">⭐⭐⭐⭐⭐</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-3">Долговечность</td>
                    <td className="border border-border p-3">⭐⭐⭐⭐⭐</td>
                    <td className="border border-border p-3">⭐⭐⭐</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-3">Игры</td>
                    <td className="border border-border p-3">⭐⭐</td>
                    <td className="border border-border p-3">⭐⭐⭐⭐⭐</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-8 bg-muted p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Наш вердикт</h2>
            <p className="mb-4">
              Универсального ответа нет - выбор зависит от ваших задач и бюджета. 
              Для творческих профессионалов и пользователей экосистемы Apple - MacBook будет лучшим выбором. 
              Для геймеров, специалистов с Windows-софтом или ограниченным бюджетом - Windows ноутбук.
            </p>
            <p className="font-semibold">
              Рассматриваете покупку б/у MacBook? Мы предлагаем проверенные устройства с гарантией 
              от 70,000₽ и выкупаем ваш старый ноутбук по выгодной цене.
            </p>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default MacbookVsWindows;