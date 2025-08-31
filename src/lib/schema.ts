// Базовые данные организации
export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": ["Organization", "LocalBusiness"],
  "name": "BestMac",
  "description": "Купить MacBook, продать MacBook, скупка MacBook в Москве. Продажа подержанной техники Apple с гарантией.",
  "image": "https://bestmac.ru/favicon.png",
  "url": "https://bestmac.ru",
  "telephone": "+7-903-299-00-29",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "ул. Дениса Давыдова 3",
    "addressLocality": "Москва",
    "addressCountry": "RU"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "55.7558",
    "longitude": "37.6176"
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "10:00",
      "closes": "20:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Saturday", "Sunday"],
      "opens": "11:00",
      "closes": "18:00"
    }
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "128"
  },
  "priceRange": "$$",
  "sameAs": ["https://t.me/romanmanro"],
  "serviceType": "Продажа и скупка техники Apple",
  "areaServed": {
    "@type": "City",
    "name": "Москва"
  }
};

// Schema для страниц покупки/продажи
export const productOfferSchema = (type: 'buy' | 'sell') => ({
  "@context": "https://schema.org",
  "@type": "Product",
  "name": type === 'buy' ? "MacBook б/у для покупки" : "Услуга выкупа MacBook",
  "description": type === 'buy' 
    ? "Купить MacBook б/у в Москве с гарантией. Широкий выбор моделей MacBook Air и MacBook Pro."
    : "Выкуп MacBook в Москве. Быстрая оценка, наличный расчет, выезд специалиста.",
  "brand": {
    "@type": "Brand",
    "name": "Apple"
  },
  "category": "Компьютеры и ноутбуки",
  "offers": {
    "@type": "Offer",
    "availability": "https://schema.org/InStock",
    "priceCurrency": "RUB",
    "price": type === 'buy' ? "50000" : "30000",
    "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    "seller": {
      "@type": "Organization",
      "name": "BestMac"
    },
    "url": `https://bestmac.ru/${type}`
  }
});

// Schema для FAQ
export const faqSchema = (faqs: Array<{question: string, answer: string}>) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(faq => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer
    }
  }))
});

// Schema для хлебных крошек
export const breadcrumbSchema = (items: Array<{name: string, url: string}>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "item": item.url
  }))
});

// FAQ данные для разных страниц
export const faqData = {
  selection: [
    {
      question: "Как происходит подбор техники?",
      answer: "Мы анализируем ваши потребности, бюджет и предпочтения, затем подбираем оптимальные варианты из нашего ассортимента или находим подходящие устройства."
    },
    {
      question: "Сколько времени занимает подбор?",
      answer: "Обычно подбор занимает 1-2 дня. Мы свяжемся с вами в течение нескольких часов после получения заявки."
    },
    {
      question: "Можете ли вы найти редкие модели?",
      answer: "Да, у нас есть доступ к широкой сети поставщиков и частных продавцов, что позволяет найти даже редкие модели Apple техники."
    },
    {
      question: "Есть ли гарантия на подобранную технику?",
      answer: "Да, вся подобранная техника имеет гарантию от 1 месяца. Дополнительно можем предоставить расширенную гарантию."
    },
    {
      question: "Можете ли вы доставить технику?",
      answer: "Да, мы предоставляем услуги доставки по Москве и области. Также возможна отправка в другие регионы."
    }
  ],
  business: [
    {
      question: "Какие документы нужны для работы с юр. лицами?",
      answer: "Для работы с юридическими лицами необходимы: договор, акты приема-передачи, счет-фактура. Мы работаем с НДС и без НДС."
    },
    {
      question: "Есть ли скидки для корпоративных клиентов?",
      answer: "Да, для корпоративных клиентов действуют специальные условия и скидки в зависимости от объема закупок."
    },
    {
      question: "Можете ли вы обслуживать офисы?",
      answer: "Да, мы предоставляем услуги по обслуживанию офисов: поставка техники, настройка, техническая поддержка."
    },
    {
      question: "Есть ли лизинг или рассрочка?",
      answer: "Да, мы сотрудничаем с лизинговыми компаниями и можем предложить выгодные условия финансирования."
    },
    {
      question: "Как происходит техническая поддержка?",
      answer: "Мы предоставляем техническую поддержку по телефону, в мессенджерах и с выездом специалиста при необходимости."
    }
  ]
};
