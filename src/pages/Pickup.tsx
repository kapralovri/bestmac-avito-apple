import { motion } from "framer-motion";
import { MapPin, Clock, Phone, Navigation } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ContactMap from "@/components/ContactMap";
import Reviews from "@/components/Reviews";

const Pickup = () => {
  const breadcrumbItems = [
    { name: "Главная", url: "/" },
    { name: "Точки самовывоза", url: "/pickup" }
  ];

  const pickupPoints = [
    {
      name: "Основной офис",
      address: "ул. Дениса Давыдова 3, Москва",
      district: "Дорогомилово, м. Киевская",
      metro: "Киевская",
      schedule: "Пн-Пт: 10:00 - 20:00, Сб-Вс: 11:00 - 18:00",
      phone: "+7 (903) 299-00-29",
      features: [
        "Проверка техники при получении",
        "Оплата наличными или картой",
        "Бесплатная парковка",
        "Консультация специалиста"
      ]
    }
  ];

  const schema = {
    "@context": "https://schema.org",
    "@type": "Store",
    "name": "BestMac",
    "image": "https://bestmac.ru/favicon.png",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "ул. Дениса Давыдова 3",
      "addressLocality": "Москва",
      "addressRegion": "Москва",
      "addressCountry": "RU"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "55.7558",
      "longitude": "37.6176"
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "10:00",
        "closes": "20:00"
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Saturday", "Sunday"],
        "opens": "11:00",
        "closes": "18:00"
      }
    ],
    "telephone": "+79032990029",
    "priceRange": "₽₽"
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead 
        title="Точки самовывоза MacBook в Москве — ЦАО, Киевская, Дорогомилово | BestMac"
        description="Точки самовывоза техники Apple в Москве: ЦАО, метро Киевская, район Дорогомилово. График работы, адреса, контакты. Проверка при получении."
        canonical="/pickup"
        keywords="самовывоз macbook москва, адрес bestmac, киевская дорогомилово, пункт выдачи apple"
        schema={schema}
      />
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={breadcrumbItems} />
        
        {/* Hero Section */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold font-apple mb-6">
            Точки самовывоза в Москве
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Приезжайте к нам в офис в центре Москвы — район Дорогомилово, метро Киевская, ЦАО. 
            Проверьте технику перед покупкой, получите консультацию специалиста.
          </p>
        </motion.div>

        {/* Pickup Points */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {pickupPoints.map((point, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center text-2xl">
                    <MapPin className="w-6 h-6 mr-2 text-primary" />
                    {point.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Navigation className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{point.address}</p>
                      <p className="text-sm text-muted-foreground">{point.district}</p>
                      <p className="text-sm text-primary font-medium">м. {point.metro}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Clock className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Режим работы</p>
                      <p className="text-sm text-muted-foreground">{point.schedule}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Phone className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Телефон</p>
                      <a 
                        href={`tel:${point.phone.replace(/\s/g, '')}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {point.phone}
                      </a>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <p className="font-medium mb-3">Наши преимущества:</p>
                    <ul className="space-y-2">
                      {point.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start space-x-2 text-sm">
                          <span className="text-primary mt-1">✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* Map */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-2xl">Как нас найти</CardTitle>
              </CardHeader>
              <CardContent>
                <ContactMap />
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Как добраться:</strong> От метро Киевская 5 минут пешком. 
                    Выход к Киевскому вокзалу, далее по ул. Дениса Давыдова. 
                    Район Дорогомилово, ЦАО.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* How to Order */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h2 className="text-3xl font-bold font-apple text-center mb-8">
            Как оформить самовывоз
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">
                  1
                </div>
                <h3 className="font-semibold text-lg mb-2">Выберите товар</h3>
                <p className="text-muted-foreground">
                  Выберите устройство на сайте или свяжитесь с нами для подбора
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">
                  2
                </div>
                <h3 className="font-semibold text-lg mb-2">Согласуйте визит</h3>
                <p className="text-muted-foreground">
                  Позвоните или напишите нам, чтобы согласовать удобное время
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">
                  3
                </div>
                <h3 className="font-semibold text-lg mb-2">Заберите и проверьте</h3>
                <p className="text-muted-foreground">
                  Приезжайте к нам, проверьте технику и заберите с документами
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Reviews */}
        <Reviews title="Отзывы наших клиентов о самовывозе" />
      </main>

      <Footer />
    </div>
  );
};

export default Pickup;
