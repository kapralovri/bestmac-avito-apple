import GeoLanding from "./GeoLanding";

const Arbat = () => (
  <GeoLanding
    district="Арбат"
    metroStation="Арбатская"
    slug="arbat"
    nearbyAreas={["Хамовники", "Пресненский", "Тверской", "Дорогомилово", "Якиманка"]}
    landmarks={["Старый Арбат", "Новый Арбат", "МИД России", "Смоленская площадь"]}
    customDescription="Скупка MacBook и техники Apple в районе Арбат. Наш офис — 10 минут от Арбатской. Выкуп любых моделей MacBook, iMac, iPhone. Бесплатный выезд курьера."
  />
);

export default Arbat;
