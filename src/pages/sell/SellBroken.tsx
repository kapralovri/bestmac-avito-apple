import { motion } from "framer-motion";
import { Wrench, Droplets, Lock, AlertTriangle, MessageCircle, Wallet, Clock, Camera } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { generateLocalBusinessSchema, generateProductSchema } from "@/lib/structured-data";

const SellBroken = () => {
    const title = "Продать сломанный MacBook на запчасти в Москве | Скупка залитых и разбитых макбуков";
    const description = "Выкуп нерабочих, сломанных, залитых водой, заблокированных на iCloud и разбитых MacBook Pro/Air. Быстрая оценка по фото в Telegram/WhatsApp за 5 минут. Деньги сразу!";
    const canonical = "/sell/broken";
    const keywords = "продать сломанный macbook, скупка макбуков на запчасти, продать залитый macbook, скупка нерабочих macbook в москве, продать разбитый макбук, заблокированный macbook";

    const breadcrumbItems = [
        { name: "Главная", url: "/" },
        { name: "Выкуп MacBook", url: "/sell" },
        { name: "На запчасти", url: canonical }
    ];

    const productSchema = generateProductSchema({
        name: "Скупка сломанных MacBook на запчасти в Москве",
        price: 30000,
        condition: "DamagedCondition",
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

            <main className="flex-1 w-full">
                {/* Hero Section */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
                    <Breadcrumbs items={breadcrumbItems} />

                    <div className="grid lg:grid-cols-2 gap-12 items-center mt-12">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                            className="space-y-8"
                        >
                            <div>
                                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-destructive/10 text-destructive mb-6">
                                    <span className="flex h-2 w-2 rounded-full bg-destructive mr-2"></span>
                                    Скупка на запчасти
                                </div>
                                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-apple leading-tight mb-6">
                                    Сломался MacBook?<br />
                                    <span className="text-primary">Мы купим его сегодня.</span>
                                </h1>
                                <p className="text-xl text-muted-foreground leading-relaxed">
                                    Пролили кофе? Разбили экран? Ноутбук просто перестал включаться или заблокирован MDM/iCloud?
                                    <br className="hidden sm:block" />
                                    Оценим реальную стоимость уцелевших деталей по фото за 5 минут.
                                </p>
                            </div>

                            {/* Кнопки мессенджеров (Primary CTA) */}
                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg bg-[#0088cc] hover:bg-[#0077b3] text-white" asChild>
                                    <a href="https://t.me/romanmanro" target="_blank" rel="noopener noreferrer">
                                        <MessageCircle className="w-5 h-5 mr-2" />
                                        Оценить в Telegram
                                    </a>
                                </Button>
                                <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10" asChild>
                                    <a href="https://wa.me/79851722830" target="_blank" rel="noopener noreferrer">
                                        Оценить в WhatsApp
                                    </a>
                                </Button>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground opacity-80 pt-4">
                                <div className="flex items-center gap-1.5">
                                    <Camera className="w-4 h-4" />
                                    <span>Фото = точная цена</span>
                                </div>
                                <div className="w-1 h-1 rounded-full bg-border" />
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-4 h-4" />
                                    <span>Ответ за 5 мин</span>
                                </div>
                                <div className="w-1 h-1 rounded-full bg-border" />
                                <div className="flex items-center gap-1.5">
                                    <Wallet className="w-4 h-4" />
                                    <span>Наличные сразу</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Графика / Блоки проблем */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="grid grid-cols-2 gap-4 relative"
                        >
                            {/* Декоративный круг фона */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-primary/5 rounded-full blur-3xl -z-10" />

                            <div className="bg-card border p-6 rounded-2xl shadow-sm">
                                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                                    <Droplets className="w-6 h-6 text-blue-500" />
                                </div>
                                <h3 className="font-bold text-lg mb-2">Залитые водой</h3>
                                <p className="text-sm text-muted-foreground">Кофе, чай, вода. Выкупаем с замкнутыми платами.</p>
                            </div>

                            <div className="bg-card border p-6 rounded-2xl shadow-sm translate-y-8">
                                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-4">
                                    <AlertTriangle className="w-6 h-6 text-red-500" />
                                </div>
                                <h3 className="font-bold text-lg mb-2">Разбитые</h3>
                                <p className="text-sm text-muted-foreground">Битые матрицы, помятые корпуса после падений.</p>
                            </div>

                            <div className="bg-card border p-6 rounded-2xl shadow-sm">
                                <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mb-4">
                                    <Lock className="w-6 h-6 text-orange-500" />
                                </div>
                                <h3 className="font-bold text-lg mb-2">Заблокированные</h3>
                                <p className="text-sm text-muted-foreground">Забыли пароль EFI, MDM-профиль, привязка к iCloud.</p>
                            </div>

                            <div className="bg-card border p-6 rounded-2xl shadow-sm translate-y-8">
                                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4">
                                    <Wrench className="w-6 h-6 text-purple-500" />
                                </div>
                                <h3 className="font-bold text-lg mb-2">На запчасти (труп)</h3>
                                <p className="text-sm text-muted-foreground">Просто не включается, сгорел процессор, нет SSD.</p>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* LSI Текст для SEO */}
                <section className="bg-muted/30 border-t border-b py-16">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                        <h2 className="text-3xl font-bold">Как мы оцениваем сломанные MacBook</h2>

                        <div className="prose prose-lg dark:prose-invert text-muted-foreground max-w-none">
                            <p>
                                Многие сервисные центры либо отказывают в выкупе "мертвых" макбуков, либо предлагают копейки, так как не умеют их рентабельно разбирать или ремонтировать. Мы в BestMac специализируемся на ремонте техники Apple на компонентном уровне, и нам <strong>всегда</strong> нужны оригинальные запчасти.
                            </p>
                            <p>
                                Даже если ваш MacBook раздавлен машиной, внутри остаются ценные микросхемы (NAND-память, контроллеры, живые ячейки батареи, топкейс), которые стоят денег.
                            </p>

                            <div className="bg-card border p-6 rounded-2xl my-8">
                                <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-foreground">
                                    <Camera className="text-primary" />
                                    Как происходит онлайн-оценка:
                                </h3>
                                <ol className="list-decimal list-inside space-y-3 marker:font-bold marker:text-primary">
                                    <li>Сфотографируйте повреждения (например, разбитый экран или погнутый корпус).</li>
                                    <li>Если макбук включается, сфотографируйте экран об этом маке или назовите серийный номер с нижней крышки.</li>
                                    <li>Опишите, что произошло (упал, залили, перестал заряжаться).</li>
                                    <li>Отправьте эти данные нам в Telegram или WhatsApp. В течение 5 минут мы назовем окончательную цену, которую готовы заплатить.</li>
                                </ol>
                            </div>

                            <p>
                                Мы честно покупаем заблокированные модели (MDM/iCloud), устройства с поврежденными цепями питания после скачков напряжения, "утопленников" из моря и залитые пивом клавиатуры. Вывоз возможен курьером в Москве в день обращения — деньги мы переводим сразу на карту при курьере, без "диагностик по две недели".
                            </p>
                        </div>
                    </div>
                </section>

            </main>
            <Footer />
        </div>
    );
};

export default SellBroken;
