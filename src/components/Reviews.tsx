import { Star } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "./SEOHead";

interface Review {
  author: string;
  rating: number;
  date: string;
  text: string;
  device?: string;
}

interface ReviewsProps {
  reviews?: Review[];
  title?: string;
}

const defaultReviews: Review[] = [
  {
    author: "Александр М.",
    rating: 5,
    date: "2024-03-15",
    text: "Купил MacBook Air M2 — отличное состояние, всё работает идеально. Гарантия, документы, быстрая доставка. Рекомендую!",
    device: "MacBook Air M2"
  },
  {
    author: "Екатерина С.",
    rating: 5,
    date: "2024-03-10",
    text: "Продала свой старый MacBook Pro. Оценили честно, расчёт на месте, оформили все документы. Очень довольна!",
    device: "MacBook Pro 13"
  },
  {
    author: "Дмитрий К.",
    rating: 5,
    date: "2024-03-05",
    text: "Покупал MacBook Pro 14 M1 Pro. Всё прошло отлично — проверили при мне, дали месяц гарантии. Цена адекватная.",
    device: "MacBook Pro 14"
  },
  {
    author: "Мария Л.",
    rating: 5,
    date: "2024-02-28",
    text: "Отличный сервис! Быстро ответили, приехали на следующий день, купили мой iMac по хорошей цене. Всё официально.",
    device: "iMac 24"
  },
  {
    author: "Игорь В.",
    rating: 5,
    date: "2024-02-20",
    text: "Купил MacBook Air M1 для работы. Состояние как новый, батарея держит отлично. Спасибо за честную сделку!",
    device: "MacBook Air M1"
  },
  {
    author: "Анна П.",
    rating: 5,
    date: "2024-02-15",
    text: "Продала iPhone 13 Pro. Оценили справедливо, без торгов. Деньги сразу, документы на руки. Очень профессионально!",
    device: "iPhone 13 Pro"
  }
];

const Reviews = ({ reviews = defaultReviews, title = "Отзывы наших клиентов" }: ReviewsProps) => {
  const reviewSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "BestMac",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "5.0",
      "reviewCount": reviews.length,
      "bestRating": "5",
      "worstRating": "5"
    },
    "review": reviews.map(review => ({
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": review.author
      },
      "datePublished": review.date,
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": review.rating,
        "bestRating": "5",
        "worstRating": "1"
      },
      "reviewBody": review.text
    }))
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
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
    <>
      <SEOHead 
        title=""
        description=""
        schema={reviewSchema}
      />
      <section className="py-16 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold font-apple text-center mb-12">
              {title}
            </h2>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {reviews.map((review, index) => (
              <motion.div
                key={index}
                className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow duration-300"
                variants={itemVariants}
                whileHover={{ y: -5 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold text-foreground">{review.author}</p>
                    {review.device && (
                      <p className="text-sm text-muted-foreground">{review.device}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
                <p className="text-muted-foreground mb-3 leading-relaxed">
                  {review.text}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(review.date).toLocaleDateString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default Reviews;
