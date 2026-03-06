import GeoLanding from "./GeoLanding";

const Kievskaya = () => (
  <GeoLanding
    district="Дорогомилово"
    metroStation="Киевская"
    slug="kievskaya"
    nearbyAreas={["Раменки", "Филёвский парк", "Пресненский", "Хамовники", "Арбат"]}
    landmarks={["Киевский вокзал", "ТЦ Европейский", "Набережная Тараса Шевченко", "Мост Богдана Хмельницкого"]}
    customDescription="Скупка MacBook, iMac и iPhone у м. Киевская (район Дорогомилово). Офис в 3 минутах от метро, оценка за 5 минут, оплата наличными или переводом. Работаем ежедневно."
  />
);

export default Kievskaya;
