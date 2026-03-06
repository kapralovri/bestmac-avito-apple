import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Clock, Shield, TrendingUp, Phone, MessageCircle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";
import FAQ from "@/components/FAQ";
import LeadForm from "@/components/LeadForm";
import { Button } from "@/components/ui/button";
import { trackContactClick } from "@/components/Analytics";

interface GeoLandingProps {
  district: string;
  metroStation: string;
  slug: string;
  nearbyAreas: string[];
  landmarks?: string[];
  customDescription?: string;
}

const GeoLanding = ({ district, metroStation, slug, nearbyAreas, landmarks, customDescription }: GeoLandingProps) => {
  const breadcrumbItems = [
    { name: "Главная", url: "/" },
    { name: "Москва", url: "/moskva" },
    { name: district, url: `/moskva/${slug}` }
  ];

  const faqItems = [
    {
      question: `Где находится ваш офис рядом с ${metroStation}?`,
      answer: `Наш офис расположен по адресу ул. Дениса Давыдова 3, в шаговой доступности от м. Киевская. Если вы находитесь в районе ${district}, добраться к нам можно за 5–15 минут.`
    },
    {
      question: `Вы выезжаете на дом в район ${district}?`,
      answer: `Да, мы отправляем курьера по всей Москве бесплатно. Для района ${district} выезд обычно занимает 30–60 минут после согласования. Оценка устройства проводится на месте.`
    },
    {
      question: "Какие устройства вы скупаете?",
      answer: "Мы покупаем MacBook Pro, MacBook Air, iMac, Mac mini, Mac Pro, iPhone и iPad любых моделей и в любом состоянии — от идеального до неисправного."
    },
    {
      question: "Как быстро я получу деньги?",
      answer: "Весь процесс от оценки до оплаты занимает 30–60 минут. Оплата наличными или переводом на карту — как вам удобнее."
    },
    {
      question: `Работаете ли вы в выходные в районе ${district}?`,
      answer: "Да, мы работаем ежедневно: пн–пт с 10:00 до 20:00, сб–вс с 11:00 до 18:00. Выезд курьера доступен также по выходным."
    }
  ];

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "name": `BestMac — скупка MacBook ${district}`,
        "url": `https://bestmac.ru/moskva/${slug}`,
        "telephone": "+79032990029",
        "image": "https://bestmac.ru/og-image.jpg",
        "priceRange": "$$$",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "ул. Дениса Давыдова 3",
          "addressLocality": "Москва",
          "addressRegion": district,
          "addressCountry": "RU"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 55.7369,
          "longitude": 37.5165
        },
        "areaServed": {
          "@type": "Place",
          "name": `${district}, Москва`
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "reviewCount": "156"
        }
      },
      {
        "@type": "FAQPage",
        "mainEntity": faqItems.map(item => ({
          "@type": "Question",
          "name": item.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": item.answer
          }
        }))
      }
    ]
  };

  const desc = customDescription || `Скупка MacBook, iMac, iPhone в районе ${district} (м. ${metroStation}). Выезд курьера бесплатно, оценка за 5 минут, оплата на месте. Работаем ежедневно.`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title={`Скупка MacBook в ${district} (м. ${metroStation}) — BestMac`}
        description={desc}
        canonical={`/moskva/${slug}`}
        keywords={`скупка macbook ${district.toLowerCase()}, продать macbook ${metroStation.toLowerCase()}, выкуп apple ${district.toLowerCase()} москва`}
        schema={schema}
      />
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-16">
        <Breadcrumbs items={breadcrumbItems} />

        {/* Hero */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm mb-6">
            <MapPin className="w-4 h-4" />
            {district}, м. {metroStation}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Скупка MacBook в районе {district}
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
            {desc}
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-primary">
              <a href="https://t.me/romanmanro" onClick={() => trackContactClick('telegram')}>
                <MessageCircle className="w-5 h-5 mr-2" />
                Написать в Telegram
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="tel:+79032990029" onClick={() => trackContactClick('phone')}>
                <Phone className="w-5 h-5 mr-2" />
                Позвонить
              </a>
            </Button>
          </div>
        </motion.div>

        {/* Advantages */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {[
            { icon: MapPin, title: "Рядом с вами", text: `Офис в 5–15 мин от м. ${metroStation}` },
            { icon: Clock, title: "30 минут", text: "Оценка и выплата за полчаса" },
            { icon: Shield, title: "Официально", text: "Договор купли-продажи, чек" },
            { icon: TrendingUp, title: "До 80% рынка", text: "Честные цены по Big Data" },
          ].map((item, i) => (
            <motion.div
              key={i}
              className="bg-card border border-border rounded-xl p-6 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.4 }}
            >
              <item.icon className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </motion.div>
          ))}
        </div>

        {/* Services */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Что мы покупаем в {district}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "MacBook Pro / Air", desc: "Любые модели от 2018 года: M1, M2, M3, M4 и Intel", link: "/sell" },
              { title: "iMac / Mac mini", desc: "Десктопы Apple на чипах Intel и Apple Silicon", link: "/sell/imac" },
              { title: "Сломанные устройства", desc: "Залитые, с разбитым экраном, не включающиеся", link: "/sell/broken" },
            ].map((s, i) => (
              <Link key={i} to={s.link} className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors group">
                <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Nearby areas */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Также обслуживаем близлежащие районы</h2>
          <div className="flex flex-wrap gap-2">
            {nearbyAreas.map((area, i) => (
              <span key={i} className="bg-muted px-4 py-2 rounded-full text-sm">{area}</span>
            ))}
          </div>
          {landmarks && landmarks.length > 0 && (
            <p className="text-sm text-muted-foreground mt-4">
              Ориентиры: {landmarks.join(", ")}
            </p>
          )}
        </section>

        {/* Lead Form */}
        <LeadForm
          title={`Оценка MacBook в ${district}`}
          subtitle="Узнайте стоимость вашего устройства за 5 минут"
          formType="sell"
        />

        {/* FAQ */}
        <FAQ items={faqItems} title={`Вопросы о скупке в ${district}`} />

        {/* SEO Text */}
        <section className="prose prose-lg max-w-none mb-16">
          <h2 className="text-2xl font-bold mb-4">Скупка техники Apple в {district}</h2>
          <p className="text-muted-foreground">
            BestMac — профессиональный сервис выкупа техники Apple в Москве. Если вы живёте или работаете
            в районе {district} (м. {metroStation}), вы можете продать свой MacBook, iMac или iPhone быстро и выгодно.
            Наш офис расположен на ул. Дениса Давыдова 3, в нескольких минутах от метро Киевская.
          </p>
          <p className="text-muted-foreground">
            Мы предлагаем бесплатный выезд курьера по району {district} и прилегающим территориям.
            Оценка устройства занимает 5 минут, а полный процесс от встречи до оплаты — не более часа.
            Работаем с физическими лицами и компаниями, оформляем все документы.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default GeoLanding;
