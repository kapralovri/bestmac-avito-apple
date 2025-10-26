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
    "addressRegion": "Дорогомилово",
    "addressCountry": "RU"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "55.739052",
    "longitude": "37.519755"
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
      ],
      "opens": "10:00",
      "closes": "23:00"
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

// Schema для сервисов (услуги)
export const serviceSchema = (params: {
  name: string;
  description: string;
  url: string;
  priceFromRub?: number;
  aggregateLowRub?: number;
  aggregateHighRub?: number;
}) => {
  let offers: any = undefined;
  if (typeof params.aggregateLowRub === 'number' && typeof params.aggregateHighRub === 'number') {
    offers = {
      "@type": "AggregateOffer",
      priceCurrency: "RUB",
      lowPrice: String(params.aggregateLowRub),
      highPrice: String(params.aggregateHighRub),
      url: params.url,
      offerCount: "1",
      seller: {
        "@type": "Organization",
        name: "BestMac"
      }
    };
  } else if (typeof params.priceFromRub === 'number') {
    offers = {
      "@type": "Offer",
      priceCurrency: "RUB",
      price: String(params.priceFromRub),
      url: params.url,
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "BestMac"
      }
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: params.name,
    description: params.description,
    provider: {
      "@type": "LocalBusiness",
      name: "BestMac",
      url: "https://bestmac.ru"
    },
    areaServed: {
      "@type": "City",
      name: "Москва"
    },
    offers,
    url: params.url
  } as const;
};

// FAQ данные для разных страниц
export const faqData = {
  home: [
    {
      question: "Какую технику Apple вы продаете?",
      answer: "Мы продаем MacBook Air, MacBook Pro, iMac, Mac Mini, iPhone, iPad и другую технику Apple. Все устройства б/у в отличном состоянии с гарантией 1 месяц."
    },
    {
      question: "Есть ли гарантия на технику?",
      answer: "Да, на всю технику предоставляется гарантия 1 месяц. Перед продажей мы проводим полную диагностику устройства."
    },
    {
      question: "Как происходит оплата?",
      answer: "Работаем официально через ИП без НДС. Принимаем наличные, переводы на карту. Предоставляем полный пакет документов: договор купли-продажи, чек."
    },
    {
      question: "Доставляете ли вы технику?",
      answer: "Да, доставка по Москве в день заказа или на следующий день. Также отправляем по России транспортными компаниями."
    },
    {
      question: "Можно ли обменять старую технику на новую?",
      answer: "Да, мы принимаем вашу технику Apple в зачет при покупке. Оценим ваше устройство и предложим выгодный обмен."
    },
    {
      question: "Где можно посмотреть технику перед покупкой?",
      answer: "Мы находимся в Москве, район Дорогомилово. Можете приехать, посмотреть и протестировать технику перед покупкой."
    }
  ],
  buy: [
    {
      question: "Как проверить MacBook перед покупкой?",
      answer: "Мы проводим полную диагностику: проверяем батарею, дисплей, клавиатуру, тачпад, порты, камеру, динамики. Показываем отчет о состоянии устройства."
    },
    {
      question: "Какое состояние у техники?",
      answer: "Мы продаем технику в состоянии от А (отличное) до B+ (хорошее). На фото и в описании указываем все дефекты, если они есть."
    },
    {
      question: "Можно ли купить MacBook в рассрочку?",
      answer: "Да, мы работаем с банками-партнерами. Рассрочка от 3 до 12 месяцев без переплаты для физических лиц."
    },
    {
      question: "Что входит в комплект?",
      answer: "Обычно устройство идет с оригинальной зарядкой. Коробка и другие аксессуары — по наличию, уточняйте в объявлении."
    },
    {
      question: "Сколько стоит доставка?",
      answer: "Доставка по Москве в пределах МКАД — бесплатно. За МКАД и по России — рассчитывается индивидуально."
    },
    {
      question: "Можно ли вернуть технику?",
      answer: "Да, в течение 7 дней можете вернуть технику, если она не подошла. Вернем деньги полностью при условии сохранности товарного вида."
    }
  ],
  sell: [
    {
      question: "Как быстро вы оцениваете технику?",
      answer: "Предварительную оценку даем в течение 30 минут после получения фото и информации об устройстве."
    },
    {
      question: "Куда приехать для продажи MacBook?",
      answer: "Мы находимся в Москве, район Дорогомилово, ул. Дениса Давыдова 3. Также можем выехать к вам для оценки и выкупа."
    },
    {
      question: "Какие документы нужны для продажи?",
      answer: "Нужен только паспорт. Мы оформим договор купли-продажи, выдадим расписку о получении денег."
    },
    {
      question: "Покупаете ли вы технику с дефектами?",
      answer: "Да, выкупаем технику с дефектами: трещины, сколы, проблемы с дисплеем или батареей. Цена зависит от состояния."
    },
    {
      question: "Как происходит оплата при выкупе?",
      answer: "Наличными сразу после осмотра и согласования цены. Или переводом на карту, если вам так удобнее."
    },
    {
      question: "Выкупаете ли технику с блокировкой iCloud?",
      answer: "К сожалению, нет. Устройство должно быть отвязано от iCloud и Find My должен быть отключен."
    }
  ],
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
