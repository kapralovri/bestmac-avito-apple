import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MessageCircle, CheckCircle2, Shield, Clock, MapPin, Calculator } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { trackContactClick } from "@/components/Analytics";
import { generateLocalBusinessSchema, generateProductSchema } from "@/lib/structured-data";

interface SellDeviceLandingProps {
    deviceType: "iPhone" | "iPad" | "Apple Watch";
    title: string;
    h1: string;
    description: string;
    keywords: string;
    modelsBought: string[];
    heroImage: string;
}

const SellDeviceLanding = ({
    deviceType,
    title,
    h1,
    description,
    keywords,
    modelsBought,
    heroImage
}: SellDeviceLandingProps) => {

    const breadcrumbItems = [
        { name: "Главная", url: "/" },
        { name: "Выкуп MacBook", url: "/sell" },
        { name: `Скупка ${deviceType}`, url: `/sell/${deviceType.toLowerCase().replace(' ', '-')}` }
    ];

    const productSchema = generateProductSchema({
        name: `Скупка ${deviceType} в Москве`,
        price: 30000,
        condition: "UsedCondition",
        description: description
    });

    const localBusinessSchema = generateLocalBusinessSchema();

    const schemaGraph = {
        "@context": "https://schema.org",
        "@graph": [productSchema, localBusinessSchema]
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <SEOHead
                title={title}
                description={description}
                canonical={`/sell/${deviceType.toLowerCase().replace(' ', '-')}`}
                keywords={keywords}
                schema={schemaGraph}
            />
            <Header />

            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                <Breadcrumbs items={breadcrumbItems} />

                <div className="grid lg:grid-cols-2 gap-12 mt-8 items-center mb-16">
                    {/* Контент слева */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-apple leading-tight mb-6">
                            {h1}
                        </h1>
                        <p className="text-xl text-muted-foreground mb-8">
                            Быстрая оценка стоимости в Telegram за 5 минут. Узнайте точную цену выкупа прямо сейчас! Платим наличными или на карту.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 mb-8">
                            <Button
                                size="lg"
                                className="bg-[#0088cc] hover:bg-[#0077b3] text-white py-6 text-lg w-full sm:w-auto"
                                asChild
                            >
                                <a
                                    href="https://t.me/romanmanro"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => trackContactClick('telegram')}
                                    className="flex items-center justify-center gap-2"
                                >
                                    <MessageCircle className="w-5 h-5" />
                                    Оценить {deviceType} в Telegram
                                </a>
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                className="py-6 text-lg w-full sm:w-auto hover:bg-[#25D366]/10 hover:text-[#25D366] hover:border-[#25D366] transition-colors"
                                asChild
                            >
                                <a
                                    href="https://wa.me/79032990029"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => trackContactClick('whatsapp')}
                                    className="flex items-center justify-center gap-2"
                                >
                                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                                    </svg>
                                    Оценить в WhatsApp
                                </a>
                            </Button>
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-primary" />
                                Оценка 5 минут
                            </div>
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-primary" />
                                Безопасная сделка
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-primary" />
                                м. Киевская
                            </div>
                        </div>
                    </motion.div>

                    {/* Изображение справа */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="relative"
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-[2rem] blur-3xl -z-10" />
                        <img
                            src={heroImage}
                            alt={`Скупка ${deviceType} в Москве`}
                            className="w-full h-auto object-contain drop-shadow-2xl"
                            style={{ maxHeight: '500px' }}
                        />
                    </motion.div>
                </div>

                {/* Инструкция: Как это работает */}
                <motion.section
                    className="mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="bg-muted/30 rounded-3xl p-8 md:p-12 border border-border">
                        <h2 className="text-3xl font-bold mb-8 text-center">Как продать {deviceType}?</h2>

                        <div className="grid md:grid-cols-3 gap-8 relative">
                            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-border -z-10" />

                            <div className="relative z-10 text-center flex flex-col items-center">
                                <div className="w-16 h-16 bg-background rounded-full border-2 border-primary flex items-center justify-center mb-6 shadow-md">
                                    <Calculator className="w-8 h-8 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">1. Оценка онлайн</h3>
                                <p className="text-muted-foreground">Напишите нам в Telegram или WhatsApp. Пришлите фото {deviceType} и опишите состояние. Мы назовем предварительную цену за 5 минут.</p>
                            </div>

                            <div className="relative z-10 text-center flex flex-col items-center">
                                <div className="w-16 h-16 bg-background rounded-full border-2 border-primary flex items-center justify-center mb-6 shadow-md">
                                    <MapPin className="w-8 h-8 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">2. Встреча</h3>
                                <p className="text-muted-foreground">Приезжайте к нам в уютный офис на м. Киевская или мы можем отправить курьера в пределах МКАД.</p>
                            </div>

                            <div className="relative z-10 text-center flex flex-col items-center">
                                <div className="w-16 h-16 bg-background rounded-full border-2 border-primary flex items-center justify-center mb-6 shadow-md">
                                    <Shield className="w-8 h-8 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">3. Проверка и расчет</h3>
                                <p className="text-muted-foreground">Быстрая диагностика устройства займет 10-15 минут. После проверки сразу выплачиваем деньги наличными или переводом на карту.</p>
                            </div>
                        </div>
                    </div>
                </motion.section>

                {/* Что мы выкупаем */}
                <motion.section
                    className="mb-16 grid lg:grid-cols-2 gap-12 items-center"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <div>
                        <h2 className="text-3xl font-bold mb-6">Какие поколения {deviceType} мы берем?</h2>
                        <p className="text-muted-foreground mb-6">Мы выкупаем актуальные модели {deviceType} в любом состоянии: от идеальных до устройств с царапинами и техническими проблемами (сломан экран, не работает динамик).</p>

                        <ul className="space-y-4">
                            {modelsBought.map((modelGroup, idx) => (
                                <li key={idx} className="flex items-start gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                                    <span className="text-lg font-medium">{modelGroup}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-8 p-6 bg-primary/10 rounded-2xl border border-primary/20">
                            <h3 className="font-bold text-lg mb-2">Обмен по Trade-In</h3>
                            <p className="text-sm">Хотите обновить устройство? Сдайте свой старый {deviceType} и получите скидку на покупку нового MacBook или другого устройства Apple из нашего каталога!</p>
                            <Button variant="link" className="px-0 mt-2" asChild>
                                <Link to="/buy">Смотреть каталог →</Link>
                            </Button>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-3xl p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <h3 className="text-2xl font-bold mb-6">Узнайте стоимость вашего {deviceType} прямо сейчас</h3>
                        <p className="text-muted-foreground mb-8">Наши эксперты на связи и готовы проконсультировать вас по стоимости устройства в соответствии с актуальным рынком.</p>

                        <Button
                            size="lg"
                            className="bg-[#0088cc] hover:bg-[#0077b3] text-white w-full text-lg mb-4"
                            asChild
                        >
                            <a href="https://t.me/romanmanro">Кнопка в Telegram</a>
                        </Button>
                        <p className="text-center text-xs text-muted-foreground">Отвечаем за 5 минут в рабочее время</p>
                    </div>
                </motion.section>

            </main>
            <Footer />
        </div>
    );
};

export default SellDeviceLanding;
