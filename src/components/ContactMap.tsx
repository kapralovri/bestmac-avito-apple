import { useEffect, useRef } from 'react';

const ContactMap = () => {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Загружаем Яндекс.Карты API
    const script = document.createElement('script');
    script.src = 'https://api-maps.yandex.ru/2.1/?apikey=YOUR_API_KEY&lang=ru_RU';
    script.async = true;
    
    script.onload = () => {
      if (window.ymaps && mapRef.current) {
        window.ymaps.ready(() => {
          const map = new window.ymaps.Map(mapRef.current!, {
            center: [55.7558, 37.6176], // Координаты центра Москвы
            zoom: 15,
            controls: ['zoomControl', 'fullscreenControl']
          });

          // Добавляем маркер
          const placemark = new window.ymaps.Placemark([55.7558, 37.6176], {
            balloonContent: `
              <div style="padding: 10px;">
                <h3 style="margin: 0 0 10px 0; font-weight: bold;">BestMac</h3>
                <p style="margin: 0 0 5px 0;">ул. Дениса Давыдова 3</p>
                <p style="margin: 0 0 5px 0;">Москва</p>
                <p style="margin: 0 0 5px 0;">Тел: +7 (903) 299-00-29</p>
                <a href="https://t.me/romanmanro" target="_blank" style="color: #007AFF; text-decoration: none;">
                  Telegram: @romanmanro
                </a>
              </div>
            `
          }, {
            preset: 'islands#redDotIcon'
          });

          map.geoObjects.add(placemark);
        });
      }
    };

    document.head.appendChild(script);

    return () => {
      // Очищаем скрипт при размонтировании
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="w-full h-96 rounded-lg overflow-hidden border border-border">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};

export default ContactMap;
