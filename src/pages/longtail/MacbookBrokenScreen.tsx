import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";
import LeadForm from "@/components/LeadForm";
import BuyoutTable from "@/components/BuyoutTable";
import { generateBreadcrumbSchema } from "@/lib/structured-data";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AlertCircle, Wrench, DollarSign, Clock } from "lucide-react";

const MacbookBrokenScreen = () => {
  const breadcrumbItems = [
    { name: "Главная", url: "/" },
    { name: "Продать", url: "/sell" },
    { name: "Выкуп MacBook с разбитым экраном", url: "/sell/macbook-broken-screen" }
  ];

  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Выкуп MacBook с разбитым экраном в Москве — срочно и дорого | BestMac"
        description="Выкупаем MacBook с разбитым, треснутым экраном в Москве. Оценка за 5 минут, выезд на дом, оплата сразу наличными. Справедливая цена за неисправный MacBook."
        canonical="/sell/macbook-broken-screen"
        keywords="выкуп macbook с разбитым экраном, продать macbook разбитый экран, скупка неисправных macbook, macbook треснутый экран цена"
        schema={breadcrumbSchema}
      />
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={breadcrumbItems} />
        
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Выкуп MacBook с разбитым экраном в Москве
        </h1>
        
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <div className="flex flex-col items-center text-center p-4 bg-card rounded-lg border">
            <DollarSign className="w-8 h-8 text-primary mb-2" />
            <p className="font-semibold">До 70% от цены</p>
            <p className="text-sm text-muted-foreground">исправного MacBook</p>
          </div>
          <div className="flex flex-col items-center text-center p-4 bg-card rounded-lg border">
            <Clock className="w-8 h-8 text-primary mb-2" />
            <p className="font-semibold">Оценка за 5 минут</p>
            <p className="text-sm text-muted-foreground">по фото или при осмотре</p>
          </div>
          <div className="flex flex-col items-center text-center p-4 bg-card rounded-lg border">
            <Wrench className="w-8 h-8 text-primary mb-2" />
            <p className="font-semibold">Любые дефекты</p>
            <p className="text-sm text-muted-foreground">трещины, пятна, полосы</p>
          </div>
          <div className="flex flex-col items-center text-center p-4 bg-card rounded-lg border">
            <AlertCircle className="w-8 h-8 text-primary mb-2" />
            <p className="font-semibold">Оплата сразу</p>
            <p className="text-sm text-muted-foreground">наличными или переводом</p>
          </div>
        </div>

        <div className="prose max-w-none mb-12">
          <h2 className="text-3xl font-bold mb-4">Почему мы выкупаем MacBook с разбитым экраном?</h2>
          <p className="text-lg text-muted-foreground mb-6">
            У вас разбился экран MacBook? Не спешите его выбрасывать! Мы выкупаем MacBook с любыми 
            дефектами дисплея: трещины, пятна, вертикальные полосы, полностью разбитые экраны. 
            После восстановления такие устройства получают вторую жизнь.
          </p>

          <h3 className="text-2xl font-bold mb-3">Какие дефекты экрана выкупаем</h3>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="border border-border rounded-lg p-6">
              <h4 className="font-semibold mb-2">✓ Трещины и сколы</h4>
              <p className="text-sm text-muted-foreground">
                Небольшие трещины в углу или паутина по всему экрану — выкупаем всё
              </p>
            </div>
            <div className="border border-border rounded-lg p-6">
              <h4 className="font-semibold mb-2">✓ Пятна и разводы</h4>
              <p className="text-sm text-muted-foreground">
                Темные или светлые пятна, "stain gate" на Retina дисплеях
              </p>
            </div>
            <div className="border border-border rounded-lg p-6">
              <h4 className="font-semibold mb-2">✓ Вертикальные полосы</h4>
              <p className="text-sm text-muted-foreground">
                Цветные или черные полосы на экране, артефакты изображения
              </p>
            </div>
            <div className="border border-border rounded-lg p-6">
              <h4 className="font-semibold mb-2">✓ Полностью разбитый</h4>
              <p className="text-sm text-muted-foreground">
                Экран не работает совсем или частично, битые пиксели
              </p>
            </div>
          </div>

          <h3 className="text-2xl font-bold mb-3">Как формируется цена?</h3>
          <p className="mb-4">
            Стоимость MacBook с разбитым экраном зависит от нескольких факторов:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-6">
            <li><strong>Модель и год выпуска</strong> — новые модели M3/M4 ценнее старых</li>
            <li><strong>Конфигурация</strong> — больше RAM и SSD = выше цена</li>
            <li><strong>Степень повреждения</strong> — трещина в углу дешевле заменить, чем полностью разбитый дисплей</li>
            <li><strong>Состояние корпуса</strong> — если корпус тоже поврежден, цена ниже</li>
            <li><strong>Работоспособность</strong> — включается ли MacBook, работают ли порты</li>
          </ul>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mb-6">
            <p className="font-semibold mb-2">💡 Примерные цены</p>
            <ul className="text-sm space-y-1">
              <li>• MacBook Air M1 (разбитый экран) — от 25,000₽</li>
              <li>• MacBook Air M2 (разбитый экран) — от 35,000₽</li>
              <li>• MacBook Pro 14" M2 (разбитый экран) — от 55,000₽</li>
              <li>• MacBook Pro 16" M3 (разбитый экран) — от 75,000₽</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              *Цены ориентировочные, зависят от конфигурации и степени повреждения
            </p>
          </div>

          <h3 className="text-2xl font-bold mb-3">Процесс выкупа за 3 шага</h3>
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                1
              </div>
              <h4 className="font-semibold mb-2">Отправьте фото</h4>
              <p className="text-sm text-muted-foreground">
                Сфотографируйте MacBook спереди и разбитый экран крупным планом
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                2
              </div>
              <h4 className="font-semibold mb-2">Получите оценку</h4>
              <p className="text-sm text-muted-foreground">
                Мы оценим MacBook за 5-10 минут и назовем точную цену
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                3
              </div>
              <h4 className="font-semibold mb-2">Встреча и оплата</h4>
              <p className="text-sm text-muted-foreground">
                Встречаемся в удобном месте, осматриваем и сразу платим
              </p>
            </div>
          </div>

          <h3 className="text-2xl font-bold mb-3">Часто задаваемые вопросы</h3>
          <div className="space-y-4">
            <div className="border border-border rounded-lg p-4">
              <p className="font-semibold mb-2">Выкупаете ли MacBook с полностью черным экраном?</p>
              <p className="text-sm text-muted-foreground">
                Да, если MacBook включается и работают другие компоненты. Проверяем по звуку загрузки.
              </p>
            </div>
            <div className="border border-border rounded-lg p-4">
              <p className="font-semibold mb-2">А если еще и корпус помят?</p>
              <p className="text-sm text-muted-foreground">
                Выкупаем, но цена будет ниже. Оценим по фото все повреждения.
              </p>
            </div>
            <div className="border border-border rounded-lg p-4">
              <p className="font-semibold mb-2">Можно ли продать по частям (без экрана)?</p>
              <p className="text-sm text-muted-foreground">
                Нет, выкупаем только полностью собранные MacBook. Без экрана цена будет слишком низкой.
              </p>
            </div>
          </div>
        </div>

        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center">Примерные цены выкупа исправных MacBook</h2>
          <p className="text-center text-muted-foreground mb-6">
            Для сравнения: цены на MacBook в отличном состоянии (от них отнимаем стоимость ремонта экрана)
          </p>
          <BuyoutTable />
        </section>

        <section className="mb-12">
          <div className="bg-gradient-primary rounded-lg p-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-4">Продайте MacBook с разбитым экраном прямо сейчас</h2>
            <p className="mb-6">Оценка за 5 минут, выезд на дом бесплатно, оплата сразу</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button asChild size="lg" variant="secondary">
                <a href="https://t.me/romanmanro" target="_blank" rel="noopener noreferrer">
                  Написать в Telegram
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-white text-primary hover:bg-white/90">
                <a href="tel:+79032990029">Позвонить сейчас</a>
              </Button>
            </div>
          </div>
        </section>

        <section>
          <LeadForm 
            title="Оставьте заявку на выкуп"
            subtitle="Опишите состояние вашего MacBook, и мы назовем точную цену"
            formType="sell"
          />
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default MacbookBrokenScreen;
