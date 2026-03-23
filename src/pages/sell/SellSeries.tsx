import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronRight, Laptop } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";
import { loadAvitoUrls, getModelsFromConfig, AvitoUrlsData } from "@/lib/avito-prices";
import { modelShortName, modelToSlug } from "@/lib/model-slugs";
import { generateLocalBusinessSchema, generateProductSchema } from "@/lib/structured-data";

interface SellSeriesProps {
    series: "pro" | "air";
}

const SellSeries = ({ series }: SellSeriesProps) => {
    const [urlsData, setUrlsData] = useState<AvitoUrlsData | null>(null);

    useEffect(() => {
        loadAvitoUrls().then(setUrlsData);
    }, []);

    // Извлекаем и фильтруем модели по серии (Pro или Air)
    const models = useMemo(() => {
        if (!urlsData) return [];
        const allModels = getModelsFromConfig(urlsData);

        return allModels.filter(modelName => {
            const lowerName = modelName.toLowerCase();
            // Оставляем только те, что содержат 'pro' или 'air', но не оба сразу, 
            // чтобы избежать конфликтов, если такие будут (хотя Apple так не делает).
            if (series === "pro") return lowerName.includes("pro");
            if (series === "air") return lowerName.includes("air");
            return false;
        });
    }, [urlsData, series]);

    const seriesName = series === "pro" ? "MacBook Pro" : "MacBook Air";
    const title = `Продать ${seriesName} в Москве дорого | Скупка ${seriesName} б/у — BestMac`;
    const description = `Скупка ${seriesName} на чипах M1, M2, M3, M4 и Intel. Оценка онлайн по рынку за 2 минуты. Моментальная выплата наличными. Принимаем б/у, сломанные и залитые макбуки.`;
    const canonical = `/sell/macbook-${series}`;
    const keywords = `продать ${seriesName.toLowerCase()}, скупка ${seriesName.toLowerCase()} москва, продать макбук ${series} дорого, ${seriesName.toLowerCase()} б/у`;

    const breadcrumbItems = [
        { name: "Главная", url: "/" },
        { name: "Выкуп MacBook", url: "/sell" },
        { name: `Скупка ${seriesName}`, url: canonical }
    ];

    const productSchema = generateProductSchema({
        name: `Скупка ${seriesName} в Москве`,
        price: 50000,
        condition: "UsedCondition",
        description: description
    });

    const schemaGraph = {
        "@context": "https://schema.org",
        "@graph": [productSchema, generateLocalBusinessSchema()]
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <SEOHead
                title={title}
                description={description}
                canonical={canonical}
                keywords={keywords}
                schema={schemaGraph}
            />
            <Header />

            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                <Breadcrumbs items={breadcrumbItems} />

                <div className="mt-8 text-center max-w-3xl mx-auto mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-4xl md:text-5xl font-bold font-apple leading-tight mb-4">
                            Скупка {seriesName} в Москве дорого
                        </h1>
                        <p className="text-xl text-muted-foreground">
                            Узнайте точную стоимость вашего {seriesName} с помощью нашего онлайн-калькулятора. Выкупаем любые модели: от старых Intel до новейших M3 и M4.
                        </p>
                    </motion.div>
                </div>

                {/* Сетка моделей */}
                <motion.div
                    className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: { opacity: 0 },
                        visible: {
                            opacity: 1,
                            transition: { staggerChildren: 0.05 }
                        }
                    }}
                >
                    {models.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                            Загрузка моделей...
                        </div>
                    ) : (
                        models.map(model => (
                            <motion.div
                                key={model}
                                variants={{
                                    hidden: { opacity: 0, y: 10 },
                                    visible: { opacity: 1, y: 0 }
                                }}
                            >
                                <Link to={`/sell/${modelToSlug(model)}`} className="block group h-full">
                                    <div className="bg-card hover:bg-muted/50 border border-border p-6 rounded-2xl transition-all duration-300 group-hover:shadow-md group-hover:-translate-y-1 h-full flex flex-col">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                                <Laptop className="w-6 h-6 text-primary" />
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                        <h3 className="font-bold text-lg mb-2 text-foreground group-hover:text-primary transition-colors">
                                            {modelShortName(model)}
                                        </h3>
                                        <p className="text-sm text-muted-foreground mt-auto">
                                            Рассчитать стоимость выкупа →
                                        </p>
                                    </div>
                                </Link>
                            </motion.div>
                        ))
                    )}
                </motion.div>

                {/* LSI Текст */}
                <motion.section
                    className="mb-16 bg-muted/30 rounded-3xl p-8 md:p-12 border border-border"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="max-w-3xl mx-auto space-y-6">
                        <h2 className="text-3xl font-bold">Выкуп {seriesName} в любом состоянии</h2>
                        <p className="text-muted-foreground">
                            Линейка {seriesName} — это {series === 'pro' ? 'мощные профессиональные решения' : 'легкие и сверхпортативные ноутбуки'}. Но технологии развиваются, и со временем возникает потребность в апгрейде. Мы предлагаем честную оценку, основанную на реальных рыночных данных парсера Avito.
                        </p>

                        <h3 className="text-xl font-bold mt-8 mb-4">Какие устройства мы принимаем:</h3>
                        <ul className="grid sm:grid-cols-2 gap-4">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <span>В идеальном состоянии, как новые</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <span>Б/У с царапинами или вмятинами</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <span>Залитые водой или кофе</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <span>С разбитым экраном (дисплеем)</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <span>Заблокированные (MDM, EFI, iCloud)</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <span>На запчасти (не включаются)</span>
                            </li>
                        </ul>

                        <div className="mt-8 pt-8 border-t border-border">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Вам не нужно создавать объявления, общаться с мошенниками или торговаться. Просто выберите вашу модель {seriesName} из списка выше, укажите процессор (M1, M2, M3, M4 или Intel), объем памяти (RAM) и накопитель (SSD). Калькулятор мгновенно покажет рыночную цену и нашу прозрачную цену выкупа. Если она вас устроит — мы бесплатно отправим курьера или будем ждать вас в нашем комфортном офисе на м. Киевская. Деньги вы получаете сразу после 10-минутной диагностики.
                            </p>
                        </div>
                    </div>
                </motion.section>

            </main>
            <Footer />
        </div>
    );
};

export default SellSeries;
