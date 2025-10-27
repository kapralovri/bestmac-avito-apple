import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const KakVybratMacbook2024 = () => {
  const breadcrumbItems = [
    { name: "Главная", url: "/" },
    { name: "Как выбрать MacBook в 2024 году", url: "/blog/kak-vybrat-macbook-2024" }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead 
        title="Как выбрать MacBook в 2024 году — полный гайд | BestMac"
        description="Полное руководство по выбору MacBook в 2024 году: сравниваем модели M1, M2, M3, M4, подбираем конфигурацию под задачи, разбираемся с диагоналями и ценой."
        canonical="/blog/kak-vybrat-macbook-2024"
        keywords="как выбрать macbook 2024, macbook m3 m2 m1, какой macbook купить, macbook air vs pro, macbook сравнение"
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
            Как выбрать MacBook в 2024 году: полный гайд
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Руководство по выбору правильного MacBook для ваших задач в 2024 году
          </p>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4">Обзор линейки MacBook 2024</h2>
              <p className="text-muted-foreground mb-4">
                В 2024 году Apple предлагает несколько серий ноутбуков с разными процессорами: 
                от базового M1 до мощного M4. Каждая модель имеет свои преимущества и подходит 
                для определенных задач.
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-6">
                <li><strong>MacBook Air</strong> — легкий, компактный, идеален для повседневных задач</li>
                <li><strong>MacBook Pro 13"</strong> — золотая середина между производительностью и портативностью</li>
                <li><strong>MacBook Pro 14" и 16"</strong> — профессиональные инструменты для серьезных задач</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Сравнение процессоров M1, M2, M3, M4</h2>
              <div className="bg-muted/50 rounded-lg p-6 mb-6">
                <h3 className="font-semibold mb-2">Apple M1</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Дебютный чип Apple Silicon. Достаточен для большинства задач: офисные приложения, 
                  просмотр видео, легкая обработка фото. Недорогие б/у модели с M1 отличный выбор по цене.
                </p>
                
                <h3 className="font-semibold mb-2">Apple M2</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Улучшенная версия M1 с повышением производительности на 15-20%. Лучшая производительность 
                  в одной цене. Отлично подходит для модернизации с M1.
                </p>
                
                <h3 className="font-semibold mb-2">Apple M3</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Значительный скачок производительности, новая архитектура 3nm. Поддерживает до 24GB RAM 
                  в Air. Идеален для редактирования видео, дизайна, разработки.
                </p>
                
                <h3 className="font-semibold mb-2">Apple M4</h3>
                <p className="text-sm text-muted-foreground">
                  Флагманский чип с AI-возможностями. Максимальная производительность для 
                  профессионалов. Обновленные модели Air и Pro 14"/16" с новейшими возможностями.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">MacBook Air vs Pro: что выбрать?</h2>
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="border border-border rounded-lg p-6">
                  <h3 className="font-semibold text-lg mb-3">MacBook Air</h3>
                  <ul className="space-y-2 text-sm">
                    <li>✓ Вес от 1.24 кг</li>
                    <li>✓ Компактный дизайн</li>
                    <li>✓ Нет активного охлаждения</li>
                    <li>✓ До 2 внешних монитора</li>
                    <li>✓ Экономная цена</li>
                  </ul>
                  <p className="text-sm mt-4 text-muted-foreground">
                    Лучший выбор для студентов, офисных работников, 
                    тех, кто ценит портативность.
                  </p>
                </div>
                
                <div className="border border-border rounded-lg p-6">
                  <h3 className="font-semibold text-lg mb-3">MacBook Pro</h3>
                  <ul className="space-y-2 text-sm">
                    <li>✓ Массивное охлаждение</li>
                    <li>✓ Больше портов</li>
                    <li>✓ Профессиональный дисплей</li>
                    <li>✓ До 4 внешних монитора</li>
                    <li>✓ Максимальная производительность</li>
                  </ul>
                  <p className="text-sm mt-4 text-muted-foreground">
                    Нужен для разработки, видео, дизайна, 
                    научных расчетов.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Рекомендации по RAM и SSD</h2>
              <h3 className="font-semibold mb-2">Оперативная память</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><strong>8GB</strong> — базовые задачи, интернет, офис</li>
                <li><strong>16GB</strong> — комфортная работа, несколько приложений, рекомендуемый минимум</li>
                <li><strong>32GB+</strong> — для разработки, обработки видео, виртуализации</li>
              </ul>
              
              <h3 className="font-semibold mb-2">Накопитель SSD</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><strong>256GB</strong> — минимально, только основные файлы</li>
                <li><strong>512GB</strong> — комфортно для большинства пользователей</li>
                <li><strong>1TB+</strong> — для больших проектов, фото/видео библиотек</li>
              </ul>
              <p className="text-sm text-muted-foreground italic">
                Важно: RAM и SSD в современных MacBook нельзя апгрейдить, выбирайте с запасом.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Цена и где купить MacBook</h2>
              <p className="mb-4">
                Новые MacBook дороги. Модели б/у отлично подходят для экономии:
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-6">
                <li><strong>MacBook Air M1</strong> — от 35,000₽ б/у</li>
                <li><strong>MacBook Air M2</strong> — от 45,000₽ б/у</li>
                <li><strong>MacBook Air M3</strong> — от 55,000₽ б/у</li>
                <li><strong>MacBook Pro 14" M2</strong> — от 80,000₽ б/у</li>
                <li><strong>MacBook Pro 16" M3</strong> — от 100,000₽ б/у</li>
              </ul>
              <div className="bg-primary/10 rounded-lg p-6">
                <p className="font-semibold mb-2">Лучшее соотношение цена/качество</p>
                <p className="text-sm text-muted-foreground">
                  MacBook Air M2 с 16GB RAM и 512GB SSD — идеальный баланс производительности, 
                  портативности и цены для большинства задач в 2024 году.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Итоги: какой MacBook выбрать?</h2>
              <div className="space-y-4">
                <div className="border-l-4 border-primary pl-4">
                  <p className="font-semibold mb-1">Для студентов и офиса</p>
                  <p className="text-sm text-muted-foreground">
                    MacBook Air M2, 8-16GB RAM, 512GB SSD. Баланс цены и возможностей.
                  </p>
                </div>
                
                <div className="border-l-4 border-primary pl-4">
                  <p className="font-semibold mb-1">Для разработчиков</p>
                  <p className="text-sm text-muted-foreground">
                    MacBook Pro 14" M3, 32GB RAM, 1TB SSD. Производительность и портативность.
                  </p>
                </div>
                
                <div className="border-l-4 border-primary pl-4">
                  <p className="font-semibold mb-1">Для видео и дизайна</p>
                  <p className="text-sm text-muted-foreground">
                    MacBook Pro 16" M3 Pro/Max, 64GB RAM, 2TB+ SSD. Максимум производительности.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-12 bg-gradient-primary rounded-lg p-8 text-white text-center">
            <h3 className="text-2xl font-bold mb-4">Готовы купить MacBook?</h3>
            <p className="mb-6">Посмотрите наши актуальные предложения</p>
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

export default KakVybratMacbook2024;

