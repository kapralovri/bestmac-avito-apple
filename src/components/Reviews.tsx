"use client";

import { Star } from "lucide-react";
import { motion } from "framer-motion";

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

// Отзывы намеренно пусты: блок скрыт, пока не подключены РЕАЛЬНЫЕ отзывы
// (например, выгрузка из Яндекс.Карт / 2ГИС). Прежние тексты были выдуманными,
// что создавало риск санкций за фальшивую разметку Review/AggregateRating.
// Чтобы вернуть секцию — передайте реальные отзывы через проп `reviews`.
const defaultReviews: Review[] = [];

const Reviews = ({ reviews = defaultReviews, title = "Отзывы наших клиентов" }: ReviewsProps) => {
  // Без реальных отзывов ничего не рендерим и не выводим разметку.
  if (!reviews.length) return null;

  const reviewSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "BestMac",
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }}
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
