import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BookOpen, Calendar, Clock, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";

// Метаданные существующих статей (из роутов App.tsx)
const BLOG_POSTS = [
    {
        id: "kak-vybrat-macbook-2024",
        title: "Как выбрать MacBook в 2024 году",
        description: "Полное руководство по выбору MacBook в 2024 году: сравниваем модели M1, M2, M3, M4, подбираем конфигурацию под задачи.",
        date: "2024-03-15",
        readTime: "8 мин",
        category: "Покупка",
        slug: "/blog/kak-vybrat-macbook-2024"
    },
    {
        id: "proverka-macbook-pered-pokupkoi",
        title: "Проверка MacBook перед покупкой",
        description: "На что смотреть при покупке б/у макбука: чек-лист из 10 шагов. Как проверить батарею, экран, порты и отвязан ли iCloud.",
        date: "2024-02-28",
        readTime: "6 мин",
        category: "Гайды",
        slug: "/blog/proverka-macbook-pered-pokupkoi"
    },
    {
        id: "macbook-air-m2-vs-m3",
        title: "MacBook Air M2 vs M3: какой выбрать?",
        description: "Подробное сравнение двух поколений самых популярных ноутбуков Apple. Стоит ли переплачивать за новый чип M3?",
        date: "2024-04-10",
        readTime: "5 мин",
        category: "Сравнение",
        slug: "/blog/macbook-air-m2-vs-m3"
    },
    {
        id: "kak-prodat-macbook-vygodno",
        title: "Как продать MacBook выгодно и быстро",
        description: "Секреты успешной продажи техники Apple на вторичном рынке. Подготовка устройства, ценообразование и безопасность сделки.",
        date: "2024-01-20",
        readTime: "7 мин",
        category: "Продажа",
        slug: "/blog/kak-prodat-macbook-vygodno"
    },
    {
        id: "macbook-m4-obzor",
        title: "Обзор чипа Apple M4: возможности и перспективы",
        description: "Разбираем архитектуру новейшего процессора M4, его возможности в ИИ и прирост производительности по сравнению с M3.",
        date: "2024-05-12",
        readTime: "5 мин",
        category: "Обзоры",
        slug: "/blog/macbook-m4-obzor"
    },
    {
        id: "macbook-vs-windows",
        title: "MacBook или Windows-ноутбук: что лучше?",
        description: "Объективное сравнение платформ MacOS и Windows для разных задач: игр, разработки, дизайна и офисной работы.",
        date: "2023-11-05",
        readTime: "9 мин",
        category: "Сравнение",
        slug: "/blog/macbook-vs-windows"
    },
    {
        id: "macbook-bu-podvodnye",
        title: "Подводные камни при покупке б/у MacBook",
        description: "О чем молчат продавцы на Авито. MDM профили, залочка EFI, неоригинальные запчасти и как избежать мошенников.",
        date: "2024-03-02",
        readTime: "7 мин",
        category: "Гайды",
        slug: "/blog/macbook-bu-podvodnye"
    },
    {
        id: "macbook-dlia-studenta",
        title: "Идеальный MacBook для студента в 2024",
        description: "Какую модель выбрать для учебы, программирования и рефератов, чтобы не переплатить и чтобы хватило на весь срок обучения.",
        date: "2024-08-15",
        readTime: "4 мин",
        category: "Покупка",
        slug: "/blog/macbook-dlia-studenta"
    },
    {
        id: "macbook-apgreid",
        title: "Можно ли сделать апгрейд MacBook?",
        description: "Мифы и реальность об увеличении оперативной памяти и замене SSD накопителя в современных ноутбуках Apple Silicon.",
        date: "2023-12-10",
        readTime: "5 мин",
        category: "Ремонт",
        slug: "/blog/macbook-apgreid"
    }
];

// Сортировка по убыванию даты (новые сверху)
const sortedPosts = [...BLOG_POSTS].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

const BlogIndex = () => {
    const breadcrumbItems = [
        { name: "Главная", url: "/" },
        { name: "Блог", url: "/blog" }
    ];

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <SEOHead
                title="Блог о технике Apple | Статьи, гайды и обзоры MacBook — BestMac"
                description="Полезные статьи о правильном выборе, проверке, покупке и продаже техники Apple (MacBook Pro/Air). Актуальные гайды и сравнения моделей M1-M4."
                canonical="/blog"
                keywords="блог apple, статьи macbook, гайды macbook, как выбрать макбук, проверка macbook"
            />
            <Header />

            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                <Breadcrumbs items={breadcrumbItems} />

                <div className="text-center max-w-3xl mx-auto mb-16 mt-8">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-6">
                            <BookOpen className="w-8 h-8 text-primary" />
                        </div>
                    </motion.div>

                    <motion.h1
                        className="text-4xl md:text-5xl font-bold font-apple mb-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        Блог о технике Apple
                    </motion.h1>

                    <motion.p
                        className="text-xl text-muted-foreground"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        Всё, что нужно знать перед тем, как купить, продать или выбрать свой идеальный MacBook.
                    </motion.p>
                </div>

                {/* Grid со статьями */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {sortedPosts.map((post, index) => (
                        <motion.article
                            key={post.id}
                            className="group relative flex flex-col items-start bg-card hover:bg-accent/50 border border-border rounded-2xl p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-1"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 * (index % 3) }}
                        >
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 w-full">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                    {post.category}
                                </span>
                                <div className="flex items-center gap-1.5 ml-auto">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <time dateTime={post.date}>{formatDate(post.date)}</time>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{post.readTime}</span>
                                </div>
                            </div>

                            <div className="flex-1">
                                <h2 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2">
                                    <Link to={post.slug} className="focus:outline-none focus-visible:underline">
                                        {/* Скрытая ссылка для доступности и кликабельности всей карточки */}
                                        <span className="absolute inset-0" aria-hidden="true" />
                                        {post.title}
                                    </Link>
                                </h2>
                                <p className="text-muted-foreground line-clamp-3 mb-6 text-sm leading-relaxed">
                                    {post.description}
                                </p>
                            </div>

                            <div className="flex items-center text-sm font-medium text-primary mt-auto">
                                Читать статью
                                <ArrowRight className="w-4 h-4 ml-1.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                            </div>
                        </motion.article>
                    ))}
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default BlogIndex;
