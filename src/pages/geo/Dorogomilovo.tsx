import GeoLanding from "./GeoLanding";

const Dorogomilovo = () => (
  <GeoLanding
    district="Дорогомилово"
    metroStation="Киевская"
    slug="dorogomilovo"
    nearbyAreas={["Филёвский парк", "Раменки", "Хамовники", "Пресненский", "Арбат"]}
    landmarks={["Киевский вокзал", "Кутузовский проспект", "Парк Победы", "ТЦ Европейский"]}
    customDescription="Выкуп техники Apple в Дорогомилово, Москва. Офис на ул. Дениса Давыдова 3 в самом районе. Скупка MacBook Pro, Air, iMac — оценка за 5 минут, моментальная оплата."
  />
);

export default Dorogomilovo;
