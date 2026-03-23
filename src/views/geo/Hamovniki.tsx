import GeoLanding from "./GeoLanding";

const Hamovniki = () => (
  <GeoLanding
    district="Хамовники"
    metroStation="Парк Культуры"
    slug="hamovniki"
    nearbyAreas={["Арбат", "Якиманка", "Дорогомилово", "Раменки", "Гагаринский"]}
    landmarks={["Парк Горького", "Москва-Сити", "Лужники", "Фрунзенская набережная"]}
    customDescription="Продать MacBook в Хамовниках — 15 минут до нашего офиса на м. Киевская. Скупка Apple техники б/у с оценкой по рынку, оплата сразу."
  />
);

export default Hamovniki;
