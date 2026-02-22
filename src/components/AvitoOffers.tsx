import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface AvitoOffer {
  id: string;
  title: string;
  price: number;
  url: string;
  imageUrl?: string;
  status: string;
}

interface AvitoOffersProps {
  limit?: number;
}

const AvitoOffers = ({ limit }: AvitoOffersProps = {}) => {
  const [offers, setOffers] = useState<AvitoOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAvitoOffers();
  }, []);

  const loadAvitoOffers = async () => {
    try {
      const response = await fetch('https://bestmac-avito-back.vercel.app/api/items');
      if (!response.ok) {
        throw new Error(`Ошибка сети: ${response.status}`);
      }
      const data = await response.json();

      // Фильтруем только активные объявления
      const activeOffers = data.filter((offer: AvitoOffer) => offer.status === 'active');
      setOffers(activeOffers);
    } catch (error) {
      console.error('Не удалось загрузить предложения с Avito:', error);
      setError('Не удалось загрузить предложения. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const createOfferCard = (offer: AvitoOffer) => {
    const formattedPrice = new Intl.NumberFormat('ru-RU').format(offer.price);

    return (
      <motion.div
        key={offer.id}
        className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        whileHover={{ y: -5 }}
      >
        <a href={offer.url} target="_blank" rel="noopener noreferrer" className="block">
          <img
            className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
            src={offer.imageUrl || ''}
            alt={`${offer.title} - MacBook или техника Apple по цене ${formattedPrice} ₽ на Avito`}
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </a>

        <div className="p-6">
          <a
            href={offer.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors duration-200 mb-2 line-clamp-2"
          >
            {offer.title}
          </a>

          <div className="text-2xl font-bold text-blue-600 mb-4">
            {formattedPrice} ₽
          </div>

          <a
            href={offer.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block w-full bg-blue-600 text-white text-center py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
          >
            Посмотреть на Avito
          </a>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Загрузка предложений с Avito...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadAvitoOffers}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Актуальных предложений на Avito пока нет.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {(limit ? offers.slice(0, limit) : offers).map(createOfferCard)}
    </div>
  );
};

export default AvitoOffers;
