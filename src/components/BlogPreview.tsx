import { motion } from "framer-motion";
import { ArrowRight, Calendar, User } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  image?: string;
  date: string;
  author?: string;
}

interface BlogPreviewProps {
  posts?: BlogPost[];
  title?: string;
}

const defaultPosts: BlogPost[] = [
  {
    slug: "kak-vybrat-macbook-2024",
    title: "Как выбрать MacBook в 2024: полное руководство",
    excerpt: "Подробный гид по выбору MacBook. Сравниваем модели Air и Pro, процессоры M1/M2/M3, объясняем какие характеристики важны для разных задач.",
    date: "2024-03-20",
    author: "Роман Капралов"
  },
  {
    slug: "proverka-macbook-pered-pokupkoi",
    title: "Как проверить MacBook перед покупкой б/у",
    excerpt: "Чек-лист проверки MacBook при покупке с рук: состояние батареи, дисплей, клавиатура, блокировки iCloud, скрытые дефекты.",
    date: "2024-03-18",
    author: "Роман Капралов"
  },
  {
    slug: "macbook-air-m2-vs-m3",
    title: "MacBook Air M2 vs M3: стоит ли переплачивать?",
    excerpt: "Сравниваем MacBook Air на чипах M2 и M3. Реальные тесты производительности, автономности и цены. Какой выбрать в 2024 году?",
    date: "2024-03-15",
    author: "Роман Капралов"
  }
];

const BlogPreview = ({ posts = defaultPosts, title = "Полезные статьи" }: BlogPreviewProps) => {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <section className="py-16 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold font-apple mb-4">
            {title}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Экспертные советы по выбору, проверке и покупке техники Apple
          </p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {posts.map((post) => (
            <motion.article
              key={post.slug}
              className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
              variants={itemVariants}
              whileHover={{ y: -5 }}
              onClick={() => navigate(`/blog/${post.slug}`)}
            >
              {post.image && (
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={post.image} 
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              )}
              
              <div className="p-6">
                <div className="flex items-center text-sm text-muted-foreground mb-3 gap-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(post.date).toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                  {post.author && (
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {post.author}
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
                
                <p className="text-muted-foreground mb-4 line-clamp-3">
                  {post.excerpt}
                </p>

                <Button 
                  variant="link" 
                  className="p-0 h-auto text-primary group-hover:gap-2 transition-all"
                >
                  Читать далее
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </motion.article>
          ))}
        </motion.div>

        <motion.div 
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => navigate('/blog')}
            className="hover:bg-secondary"
          >
            Все статьи
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default BlogPreview;
