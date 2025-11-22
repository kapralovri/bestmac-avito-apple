// Structured data generators for SEO

interface ProductData {
  name: string;
  price: number;
  condition: string;
  image?: string;
  description: string;
  sku?: string;
}

interface ReviewData {
  author: string;
  rating: number;
  text: string;
  date: string;
}

export const generateProductSchema = (product: ProductData) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  "name": product.name,
  "description": product.description,
  "image": product.image || "https://bestmac.ru/favicon.png",
  "sku": product.sku || product.name.replace(/\s+/g, '-'),
  "offers": {
    "@type": "Offer",
    "url": "https://bestmac.ru/buy",
    "priceCurrency": "RUB",
    "price": product.price,
    "itemCondition": `https://schema.org/${product.condition === 'новый' ? 'NewCondition' : 'UsedCondition'}`,
    "availability": "https://schema.org/InStock",
    "seller": {
      "@type": "Organization",
      "name": "BestMac"
    }
  },
  "brand": {
    "@type": "Brand",
    "name": "Apple"
  }
});

export const generateReviewSchema = (reviews: ReviewData[]) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "BestMac - Техника Apple",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": reviews.length.toString()
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
      "ratingValue": review.rating.toString(),
      "bestRating": "5"
    },
    "reviewBody": review.text
  }))
});

export const generateBreadcrumbSchema = (items: Array<{ name: string; url: string }>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "item": `https://bestmac.ru${item.url}`
  }))
});

export const generateArticleSchema = (article: {
  title: string;
  description: string;
  datePublished: string;
  dateModified: string;
  author: string;
  url: string;
  image?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": article.title,
  "description": article.description,
  "image": article.image || "https://bestmac.ru/favicon.png",
  "datePublished": article.datePublished,
  "dateModified": article.dateModified,
  "author": {
    "@type": "Person",
    "name": article.author
  },
  "publisher": {
    "@type": "Organization",
    "name": "BestMac",
    "logo": {
      "@type": "ImageObject",
      "url": "https://bestmac.ru/favicon.png"
    }
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": `https://bestmac.ru${article.url}`
  }
});
