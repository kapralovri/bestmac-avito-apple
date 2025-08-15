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

const Business = () => {
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
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 text-primary border-primary">
              Для юридических лиц
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold font-apple mb-6">
              Корпоративные решения Apple
            </h1>
            <p className="text-xl text-apple-gray max-w-3xl mx-auto mb-8">
              Помогаем бизнесу оснащаться качественной техникой Apple по выгодным ценам. 
              Работаем официально с полным пакетом документов и персональным сервисом.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-gradient-primary hover:opacity-90" onClick={() => window.location.href = '/contact'}>
                Получить коммерческое предложение
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button variant="outline" size="lg" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground" onClick={() => window.location.href = '/contact'}>
                Рассчитать стоимость
                <Calculator className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Advantages */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold font-apple text-center mb-12">
              Преимущества работы с нами
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {advantages.map((advantage, index) => {
                const IconComponent = advantage.icon;
                return (
                  <Card key={index} className="bg-card border-border hover:shadow-elegant transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-2">{advantage.title}</h3>
                          <p className="text-apple-gray text-sm">{advantage.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Services */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold font-apple text-center mb-12">
              Корпоративные услуги
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {services.map((service, index) => (
                <Card key={index} className="bg-card border-border shadow-elegant">
                  <CardHeader>
                    <CardTitle className="text-xl font-apple">{service.title}</CardTitle>
                    <p className="text-apple-gray">{service.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 mb-6">
                      {service.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-apple-green" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-primary font-semibold">{service.price}</div>
                      <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                        Подробнее
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Success Cases */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold font-apple text-center mb-12">
              Успешные проекты
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {cases.map((case_, index) => (
                <Card key={index} className="bg-card border-border">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                        <Building2 className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{case_.company}</h3>
                      <p className="text-apple-gray mb-4">{case_.devices}</p>
                      <div className="space-y-2">
                        <p className="text-sm">{case_.result}</p>
                        <p className="text-primary font-semibold">{case_.economy}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Process */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold font-apple text-center mb-12">
              Как мы работаем
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">1</span>
                </div>
                <h3 className="font-semibold mb-2">Анализ потребностей</h3>
                <p className="text-apple-gray text-sm">
                  Изучаем специфику вашего бизнеса и технические требования
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">2</span>
                </div>
                <h3 className="font-semibold mb-2">Коммерческое предложение</h3>
                <p className="text-apple-gray text-sm">
                  Готовим детальное КП с техническими характеристиками и ценами
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">3</span>
                </div>
                <h3 className="font-semibold mb-2">Заключение договора</h3>
                <p className="text-apple-gray text-sm">
                  Оформляем официальный договор поставки с гарантийными обязательствами
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">4</span>
                </div>
                <h3 className="font-semibold mb-2">Поставка и поддержка</h3>
                <p className="text-apple-gray text-sm">
                  Доставляем технику и обеспечиваем техническую поддержку
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-primary rounded-lg p-8 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">
              Готовы обсудить ваш проект?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Оставьте заявку, и мы подготовим персональное коммерческое предложение
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <Button variant="secondary" size="lg" className="bg-white text-primary hover:bg-gray-100">
                Оставить заявку
                <Handshake className="ml-2 w-5 h-5" />
              </Button>
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-primary">
                Связаться с менеджером
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Business;