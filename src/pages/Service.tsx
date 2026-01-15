import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { 
  Wrench, 
  Monitor, 
  Keyboard, 
  Battery, 
  Droplets, 
  Fan, 
  HardDrive, 
  Cpu,
  Phone, 
  MapPin, 
  Clock, 
  Mail,
  CheckCircle,
  Zap,
  Shield,
  MessageCircle
} from "lucide-react";

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Сервисный Центр Apple \"Чиним Яблоки\" на Киевской",
  "description": "Профессиональный ремонт MacBook, iPhone, iPad, iMac в Москве. Бесплатная диагностика, гарантия на все работы.",
  "image": "https://bestmac.ru/favicon.png",
  "url": "https://bestmac.ru/service",
  "telephone": "+7-495-369-51-62",
  "email": "info@appleprofessional.ru",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Кутузовский проспект д.5/3 к.2",
    "addressLocality": "Москва",
    "postalCode": "121248",
    "addressCountry": "RU"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "55.7438",
    "longitude": "37.5603"
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "11:00",
      "closes": "20:00"
    }
  ],
  "priceRange": "₽₽",
  "areaServed": {
    "@type": "City",
    "name": "Москва"
  }
};

const services = [
  {
    icon: Monitor,
    title: "Замена дисплея",
    description: "Трещины на экране, нет изображения, нет подсветки",
    price: "от 17 690 ₽",
    time: "1,5 часа"
  },
  {
    icon: Keyboard,
    title: "Замена клавиатуры",
    description: "Попадание влаги, залипание клавиш, не работают кнопки",
    price: "от 8 000 ₽",
    time: "2 часа"
  },
  {
    icon: Battery,
    title: "Замена аккумулятора",
    description: "Быстро разряжается, вздулась батарея, не держит заряд",
    price: "от 5 990 ₽",
    time: "30 минут"
  },
  {
    icon: Droplets,
    title: "Чистка после залития",
    description: "Попадание жидкости, коррозия, окисление контактов",
    price: "от 2 990 ₽",
    time: "1 день"
  },
  {
    icon: Fan,
    title: "Чистка системы охлаждения",
    description: "Перегрев, шум вентилятора, замена термопасты",
    price: "от 1 500 ₽",
    time: "30 минут"
  },
  {
    icon: HardDrive,
    title: "Увеличение SSD",
    description: "Расширение объёма накопителя, перенос данных",
    price: "от 500 ₽",
    time: "30 минут"
  },
  {
    icon: Cpu,
    title: "Ремонт материнской платы",
    description: "Компонентный ремонт, пайка микросхем, восстановление",
    price: "от 3 990 ₽",
    time: "1 день"
  },
  {
    icon: Wrench,
    title: "Установка macOS / Windows",
    description: "Переустановка системы, настройка ПО, восстановление данных",
    price: "от 1 000 ₽",
    time: "1 час"
  }
];

const advantages = [
  {
    icon: Zap,
    title: "Быстрый ремонт",
    description: "Большинство работ выполняется в присутствии клиента"
  },
  {
    icon: Shield,
    title: "Гарантия",
    description: "На все виды работ и комплектующие от 3 месяцев"
  },
  {
    icon: CheckCircle,
    title: "Бесплатная диагностика",
    description: "Определим неисправность за 20 минут бесплатно"
  }
];

const devices = [
  "MacBook Pro Retina",
  "MacBook Pro",
  "MacBook Air",
  "MacBook 12\"",
  "iMac",
  "Mac Mini",
  "Mac Pro",
  "iPhone",
  "iPad"
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const Service = () => {
  const breadcrumbs = [
    { name: "Главная", url: "/" },
    { name: "Сервисный центр", url: "/service" }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead 
        title="Ремонт MacBook, iPhone, iPad в Москве | Сервисный центр Apple на Киевской"
        description="Профессиональный ремонт техники Apple в Москве. Бесплатная диагностика за 20 минут. Замена дисплея, клавиатуры, аккумулятора. Гарантия от 3 месяцев. Кутузовский проспект."
        canonical="/service"
        schema={serviceSchema}
        keywords="ремонт macbook москва, ремонт iphone москва, сервисный центр apple, замена экрана macbook, ремонт macbook киевская"
      />
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={breadcrumbs} />
          
          {/* Hero Section */}
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="secondary" className="mb-4">
              <Wrench className="w-4 h-4 mr-2" />
              Партнёрский сервис
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold font-apple mb-6">
              Сервисный центр Apple
              <span className="block text-primary mt-2">«Чиним Яблоки»</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
              Профессиональный ремонт MacBook, iPhone, iPad, iMac в Москве. 
              Бесплатная диагностика, гарантия на все работы, оригинальные запчасти.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" asChild>
                <a href="tel:+74953695162">
                  <Phone className="w-5 h-5 mr-2" />
                  +7 (495) 369-51-62
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="https://t.me/romanmanro" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Написать в Telegram
                </a>
              </Button>
            </div>
          </motion.div>

          {/* Advantages */}
          <motion.div 
            className="grid md:grid-cols-3 gap-6 mb-16"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {advantages.map((advantage, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="text-center h-full border-primary/20 bg-card/50">
                  <CardContent className="pt-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                      <advantage.icon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{advantage.title}</h3>
                    <p className="text-muted-foreground">{advantage.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Services Grid */}
          <motion.section 
            className="mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold font-apple text-center mb-10">
              Услуги и цены
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.map((service, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow border-border/50">
                    <CardHeader className="pb-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                        <service.icon className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{service.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {service.description}
                      </p>
                      <div className="flex justify-between items-center pt-3 border-t border-border/50">
                        <span className="font-semibold text-primary">{service.price}</span>
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {service.time}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Supported Devices */}
          <motion.section 
            className="mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold font-apple text-center mb-8">
              Ремонтируем все устройства Apple
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {devices.map((device, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-base py-2 px-4"
                >
                  {device}
                </Badge>
              ))}
            </div>
          </motion.section>

          {/* Contact Info */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="overflow-hidden">
              <div className="grid md:grid-cols-2">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold mb-6">Контакты сервиса</h2>
                  
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Адрес</p>
                        <p className="text-muted-foreground">
                          Москва, Кутузовский проспект д.5/3 к.2
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Вход с торца здания, со стороны ул. 2-я Бородинская
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Телефон</p>
                        <a 
                          href="tel:+74953695162" 
                          className="text-primary hover:underline"
                        >
                          +7 (495) 369-51-62
                        </a>
                        <p className="text-sm text-muted-foreground">многоканальный</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Время работы</p>
                        <p className="text-muted-foreground">Пн–Пт: 11:00–20:00</p>
                        <p className="text-sm text-muted-foreground">Сб–Вс: выходной</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Email</p>
                        <a 
                          href="mailto:info@appleprofessional.ru" 
                          className="text-primary hover:underline"
                        >
                          info@appleprofessional.ru
                        </a>
                      </div>
                    </div>
                  </div>

                  <Button className="w-full mt-8" size="lg" asChild>
                    <a href="tel:+74953695162">
                      Записаться на ремонт
                    </a>
                  </Button>
                </CardContent>

                <div className="bg-muted/30 p-8 flex flex-col justify-center">
                  <h3 className="text-xl font-semibold mb-4">Почему выбирают нас?</h3>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>Работаем только с техникой Apple</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>Собственный склад запчастей</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>Ремонт в присутствии клиента</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>Гарантия от 3 месяцев</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>Бесплатная диагностика за 20 минут</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span>Берёмся за сложные случаи</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </motion.section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Service;
