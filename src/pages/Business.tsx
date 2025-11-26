import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  FileText, 
  CreditCard, 
  Truck, 
  Shield, 
  Users, 
  TrendingUp, 
  Clock,
  CheckCircle,
  ArrowRight,
  Calculator,
  Handshake
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { serviceSchema } from "@/lib/schema";
import Breadcrumbs from "@/components/Breadcrumbs";
import FAQ from "@/components/FAQ";
import { faqData } from "@/lib/schema";

const Business = () => {
  const breadcrumbItems = [
    { name: "Главная", url: "/" },
    { name: "Для бизнеса", url: "/business" }
  ];

  const advantages = [
    {
      icon: FileText,
      title: "Полный пакет документов",
      description: "Работаем официально через ИП. Предоставляем все необходимые документы для бухгалтерии: договоры, акты, счета-фактуры."
    },
    {
      icon: CreditCard,
      title: "Безналичный расчет",
      description: "Оплата по безналичному расчету на расчетный счет. Работаем без НДС, что позволяет предложить выгодные цены."
    },
    {
      icon: Truck,
      title: "Корпоративная доставка",
      description: "Доставляем технику прямо в офис. Возможна доставка по регионам транспортными компаниями."
    },
    {
      icon: Shield,
      title: "Расширенная гарантия",
      description: "Для корпоративных клиентов предоставляем расширенную гарантию до 3 месяцев на всю технику."
    },
    {
      icon: Users,
      title: "Персональный менеджер",
      description: "Закрепляем персонального менеджера, который знает особенности вашего бизнеса и потребности."
    },
    {
      icon: TrendingUp,
      title: "Масштабирование",
      description: "Помогаем масштабировать IT-инфраструктуру: от единичных покупок до комплексного оснащения офисов."
    }
  ];

  const services = [
    {
      title: "Корпоративные закупки",
      description: "Комплексное оснащение офисов техникой Apple",
      features: ["Подбор под задачи", "Объемные скидки", "Поэтапная поставка"],
      price: "От 10 устройств"
    },
    {
      title: "Лизинг и рассрочка",
      description: "Гибкие схемы финансирования для бизнеса",
      features: ["Лизинг до 36 месяцев", "Без первоначального взноса", "Быстрое оформление"],
      price: "От 0% переплаты"
    },
    {
      title: "Trade-in для бизнеса",
      description: "Обновление корпоративного парка техники",
      features: ["Оценка старой техники", "Зачет при покупке новой", "Утилизация по экостандартам"],
      price: "До 40% скидки"
    }
  ];

  const cases = [
    {
      company: "IT-агентство",
      devices: "15 MacBook Pro",
      result: "Увеличение производительности команды на 25%",
      economy: "Экономия 800,000 ₽"
    },
    {
      company: "Дизайн-студия",
      devices: "8 iMac + 5 iPad Pro",
      result: "Ускорение работы с проектами в 2 раза",
      economy: "Экономия 600,000 ₽"
    },
    {
      company: "Образовательный центр",
      devices: "25 MacBook Air",
      result: "Модернизация компьютерного класса",
      economy: "Экономия 1,200,000 ₽"
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead 
        title="Техника Apple для бизнеса в Москве — корпоративные решения | BestMac"
        description="Оснащение офисов техникой Apple: от единичных закупок до комплексных поставок. Работаем через ИП с полным пакетом документов, безналичный расчет без НДС. Лизинг до 36 месяцев, trade-in старых устройств, персональный менеджер, расширенная гарантия до 3 месяцев."
        canonical="/business"
        keywords="техника apple для бизнеса, корпоративные закупки, лизинг macbook, trade-in для бизнеса москва"
        schema={serviceSchema({
          name: "Корпоративные решения BestMac",
          description: "Поставка, лизинг и trade-in техники Apple для бизнеса",
          url: "https://bestmac.ru/business"
        })}
      />
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={breadcrumbItems} />
        
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold font-apple mb-6">
            Техника Apple для бизнеса
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Комплексные решения для корпоративных клиентов. От единичных закупок до оснащения 
            целых офисов. Работаем официально с полным пакетом документов.
          </p>
        </div>

        {/* Advantages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {advantages.map((advantage, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4">
                  <advantage.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{advantage.title}</h3>
                <p className="text-muted-foreground">{advantage.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Services */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold font-apple text-center mb-12">Наши услуги</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl">{service.title}</CardTitle>
                  <p className="text-muted-foreground">{service.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="text-center">
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                      {service.price}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Cases */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold font-apple text-center mb-12">Кейсы</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {cases.map((case_, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-2">{case_.company}</h3>
                  <p className="text-muted-foreground mb-4">{case_.devices}</p>
                  <div className="space-y-2">
                    <p className="text-sm"><strong>Результат:</strong> {case_.result}</p>
                    <p className="text-sm text-primary font-semibold">{case_.economy}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mb-16">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">Готовы обсудить проект?</h2>
              <p className="text-muted-foreground mb-6">
                Свяжитесь с нами для получения персонального предложения
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button className="bg-gradient-primary hover:opacity-90">
                  <a href="tel:+79032990029" className="text-inherit no-underline">
                    Позвонить
                  </a>
                </Button>
                <Button variant="outline">
                  <a href="https://t.me/romanmanro" target="_blank" rel="noopener noreferrer" className="text-inherit no-underline">
                    Написать в Telegram
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <FAQ items={faqData.business} title="Часто задаваемые вопросы для бизнеса" />
      </main>

      <Footer />
    </div>
  );
};

export default Business;
