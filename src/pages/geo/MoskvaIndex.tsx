import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";
import LeadForm from "@/components/LeadForm";

const districts = [
  { name: "Дорогомилово (м. Киевская)", slug: "kievskaya", highlight: true },
  { name: "Дорогомилово", slug: "dorogomilovo", highlight: true },
  { name: "Арбат (м. Арбатская)", slug: "arbat" },
  { name: "Хамовники (м. Парк Культуры)", slug: "hamovniki" },
];

const MoskvaIndex = () => {
  const breadcrumbItems = [
    { name: "Главная", url: "/" },
    { name: "Москва", url: "/moskva" }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Скупка MacBook в Москве по районам — BestMac"
        description="Выкуп техники Apple в любом районе Москвы. Бесплатный выезд курьера, оценка за 5 минут, оплата наличными или на карту. Офис у м. Киевская."
        canonical="/moskva"
        keywords="скупка macbook москва, выкуп apple москва, продать macbook район москва"
      />
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-16">
        <Breadcrumbs items={breadcrumbItems} />

        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Скупка MacBook в Москве по районам</h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Наш офис расположен у м. Киевская. Бесплатный выезд курьера в любой район Москвы.
            Выберите свой район для подробной информации.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-4 mb-16">
          {districts.map((d, i) => (
            <motion.div
              key={d.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.4 }}
            >
              <Link
                to={`/moskva/${d.slug}`}
                className={`flex items-center gap-3 p-6 rounded-xl border transition-colors group ${
                  d.highlight
                    ? "border-primary/30 bg-primary/5 hover:border-primary/60"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <MapPin className={`w-5 h-5 flex-shrink-0 ${d.highlight ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
                <span className="font-medium group-hover:text-primary transition-colors">{d.name}</span>
                {d.highlight && (
                  <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">Наш офис</span>
                )}
              </Link>
            </motion.div>
          ))}
        </div>

        <LeadForm
          title="Не нашли свой район?"
          subtitle="Мы приедем к вам в любую точку Москвы"
          formType="sell"
        />
      </main>

      <Footer />
    </div>
  );
};

export default MoskvaIndex;
