// Данные по б/у мониторам (партия HP/Lenovo) — единый источник для хаба и карточек моделей.
// Характеристики взяты из semantic-core.md (официальные datasheet HP QuickSpecs / Lenovo PSREF).
// Цены — рекомендованные для быстрой продажи (см. раздел 2 семантического ядра).

export interface MonitorSpec {
  label: string;
  value: string;
}

export interface MonitorModel {
  slug: string;
  brand: "HP" | "Lenovo";
  name: string; // короткое имя, напр. "HP Z24i G2"
  fullName: string; // полное имя для schema/alt
  diagonal: string; // напр. 24"
  resolution: string; // напр. 1920×1200 (WUXGA)
  aspectRatio: string; // 16:10
  refreshRate: string;
  h1: string;
  title: string;
  metaDescription: string;
  price: number;
  stock: number;
  keyFeature: string; // короткая фишка для карточки в хабе
  forWhom: string[];
  specs: MonitorSpec[];
  image: string; // путь в /public/images/monitors
  imageAlt: string;
  newPriceNote?: string; // якорь цены нового (для Z24f G3)
  bulk?: { fromQty: number; price: number }; // опт (для Z24i G2)
  honestNote?: string; // честная оговорка (например, только наклон у S24q-10)
}

export const MONITORS: MonitorModel[] = [
  {
    slug: "hp-z24i-g2",
    brand: "HP",
    name: "HP Z24i G2",
    fullName: "HP Z24i G2 24 IPS 1920x1200 (WUXGA)",
    diagonal: "24\"",
    resolution: "1920×1200 (WUXGA)",
    aspectRatio: "16:10",
    refreshRate: "60 Гц",
    h1: "Монитор HP Z24i G2 24\" IPS 1920×1200 (WUXGA) — б/у, самовывоз",
    title: "HP Z24i G2 б/у купить в Москве — 24\" WUXGA 1920×1200, самовывоз",
    metaDescription:
      "Купить б/у монитор HP Z24i G2 24\" IPS 1920×1200 (WUXGA, формат 16:10) в Москве. 25 шт в наличии, опт от 3 шт — 7 000 ₽. Самовывоз м. Киевская, проверка на месте.",
    price: 8000,
    stock: 25,
    keyFeature: "16:10 WUXGA — больше рабочей высоты, чем у Full HD",
    forWhom: [
      "Программистам и аналитикам — больше строк кода и таблиц на экране без прокрутки",
      "Офисным сотрудникам — комфортная работа с документами Word/Excel и таблицами",
      "Небольшим компаниям и коворкингам — оснащение рабочих мест партией по опту",
      "Тем, кто ищет второй монитор для расширения рабочего стола",
    ],
    specs: [
      { label: "Диагональ", value: "24\"" },
      { label: "Разрешение / формат", value: "1920×1200 (WUXGA), 16:10, 60 Гц" },
      { label: "Матрица", value: "IPS с LED-подсветкой, 5 мс GtG, углы обзора 178°/178°, до 99% sRGB, 6-bit+2FRC" },
      { label: "Яркость / контраст", value: "300 кд/м², 1000:1 (10 000 000:1 dynamic)" },
      { label: "Порты", value: "DisplayPort, HDMI, VGA, 2× USB 3.0 Type-A (USB-хаб)" },
      {
        label: "Эргономика",
        value:
          "Наклон −5°…+22°, разворот ±45°, поддержка поворота (pivot), регулировка высоты (функция подтверждена датащитом HP)",
      },
      { label: "Год выпуска", value: "~2020–2021 (datasheet обновлён 02/2021)" },
    ],
    image: "/images/monitors/hp-z24i-g2.png",
    imageAlt: "HP Z24i G2 24 IPS 1920x1200 монитор б/у",
    bulk: { fromQty: 3, price: 7000 },
  },
  {
    slug: "lenovo-thinkvision-s24q-10",
    brand: "Lenovo",
    name: "Lenovo ThinkVision S24q-10",
    fullName: "Lenovo ThinkVision S24q-10 23.8 IPS 2560x1440 (QHD)",
    diagonal: "23.8\"",
    resolution: "2560×1440 (QHD)",
    aspectRatio: "16:9",
    refreshRate: "60 Гц",
    h1: "Монитор Lenovo ThinkVision S24q-10 23.8\" IPS QHD — б/у",
    title: "Lenovo ThinkVision S24q-10 б/у — 23.8\" QHD, купить в Москве",
    metaDescription:
      "Купить б/у монитор Lenovo ThinkVision S24q-10 23.8\" IPS 2560×1440 (QHD) в Москве. 5 шт в наличии, 7 500 ₽. Тонкие рамки, самовывоз, проверка при получении.",
    price: 7500,
    stock: 5,
    keyFeature: "QHD 2560×1440 с тонкими рамками по доступной цене",
    forWhom: [
      "Тем, кому важно чёткое изображение QHD, а не полная эргономика подставки",
      "Для настольной установки без частой перестройки высоты/поворота",
      "Офисам с фиксированным рабочим местом под монитор",
      "Покупателям, ищущим самую доступную QHD-модель в линейке",
    ],
    specs: [
      { label: "Диагональ", value: "23.8\" (60.5 см)" },
      { label: "Разрешение / формат", value: "2560×1440 (QHD), 16:9, 60 Гц" },
      { label: "Матрица", value: "IPS, 6 мс (4 мс Overdrive), углы обзора 178°/178°, ~99% sRGB" },
      { label: "Яркость / контраст", value: "300 кд/м², 1000:1" },
      { label: "Порты", value: "1× HDMI 1.4, 1× DisplayPort 1.2" },
      { label: "Эргономика", value: "Только наклон (tilt −5°…+22°); есть VESA 100×100" },
      { label: "Год выпуска", value: "2019" },
    ],
    image: "/images/monitors/lenovo-s24q-10.png",
    imageAlt: "Lenovo ThinkVision S24q-10 23.8 IPS 2560x1440 монитор б/у",
    honestNote:
      "Честно предупреждаем: у этой модели регулируется только наклон экрана — нет регулировки по высоте, поворота (pivot) и разворота (swivel). Если нужна полная эргономика при том же разрешении QHD — обратите внимание на Lenovo ThinkVision E24q-20.",
  },
  {
    slug: "lenovo-thinkvision-e24q-20",
    brand: "Lenovo",
    name: "Lenovo ThinkVision E24q-20",
    fullName: "Lenovo ThinkVision E24q-20 23.8 IPS 2560x1440 (QHD)",
    diagonal: "23.8\"",
    resolution: "2560×1440 (QHD)",
    aspectRatio: "16:9",
    refreshRate: "до 75 Гц",
    h1: "Монитор Lenovo ThinkVision E24q-20 23.8\" IPS QHD — б/у, pivot",
    title: "Lenovo ThinkVision E24q-20 б/у — 23.8\" QHD с регулировкой высоты",
    metaDescription:
      "Купить б/у монитор Lenovo ThinkVision E24q-20 23.8\" IPS 2560×1440 (QHD) в Москве. Осталось всего 2 шт, 10 000 ₽. Полная эргономика: высота, pivot, встроенные колонки.",
    price: 10000,
    stock: 2,
    keyFeature: "QHD + полная эргономика: высота до 155 мм, pivot, колонки",
    forWhom: [
      "Тем, кто часто меняет высоту и угол экрана под себя",
      "Разработчикам, которым удобен поворот экрана в портретный режим (pivot) для чтения кода",
      "Пользователям, которым важен звук без отдельных колонок",
      "Покупателям QHD-монитора премиум-уровня эргономики в линейке",
    ],
    specs: [
      { label: "Диагональ", value: "23.8\" (60.5 см)" },
      { label: "Разрешение / формат", value: "2560×1440 (QHD), 16:9, до 75 Гц" },
      { label: "Матрица", value: "IPS, углы обзора 178°/178°, ~99% sRGB, 16.7 млн цветов" },
      { label: "Яркость / контраст", value: "300 кд/м², 1000:1" },
      { label: "Порты", value: "1× HDMI 1.4, 1× DisplayPort 1.2, аудио-выход 3.5 мм, встроенные стереоколонки" },
      {
        label: "Эргономика",
        value: "Полная регулировка: наклон, поворот (pivot), разворот (swivel), высота до 155 мм; VESA 100×100",
      },
      { label: "Год выпуска", value: "~2021–2022" },
    ],
    image: "/images/monitors/lenovo-e24q-20.png",
    imageAlt: "Lenovo ThinkVision E24q-20 23.8 IPS 2560x1440 монитор б/у",
  },
  {
    slug: "hp-z24f-g3",
    brand: "HP",
    name: "HP Z24f G3",
    fullName: "HP Z24f G3 23.8 IPS 1920x1080 (Full HD)",
    diagonal: "23.8\"",
    resolution: "1920×1080 (Full HD)",
    aspectRatio: "16:9",
    refreshRate: "60 Гц",
    h1: "Монитор HP Z24f G3 23.8\" IPS Full HD — б/у, самовывоз",
    title: "HP Z24f G3 б/у купить — 23.8\" Full HD IPS, самовывоз Москва",
    metaDescription:
      "Купить б/у монитор HP Z24f G3 23.8\" IPS Full HD в Москве. Единственный экземпляр, 9 000 ₽ (новый ~37 000 ₽). Алюминиевый корпус, daisy-chain DP, USB-хаб.",
    price: 9000,
    stock: 1,
    keyFeature: "Премиум Z-серия: алюминий, daisy-chain DP, USB-хаб",
    forWhom: [
      "Тем, кто ищет топовый монитор HP Z-серии по цене в разы ниже новой розницы",
      "Пользователям, которым нужен daisy-chain через DisplayPort для второго монитора",
      "Дизайнерам и разработчикам, ценящим безрамочный алюминиевый корпус",
      "Покупателям, которым важна максимальная эргономика (высота, pivot, разворот)",
    ],
    specs: [
      { label: "Диагональ", value: "23.8\"" },
      { label: "Разрешение / формат", value: "1920×1080 (Full HD), 16:9, 60 Гц" },
      {
        label: "Матрица",
        value: "IPS, 5 мс GtG (Overdrive), углы обзора 178°/178°, 99% sRGB / 85% P3",
      },
      { label: "Яркость / контраст", value: "300 нит, 1000:1 (10M:1 dynamic)" },
      {
        label: "Порты",
        value:
          "1× DP 1.2 IN, 1× DP 1.2 OUT (daisy-chain), 1× HDMI 1.4, USB-B upstream, 4× USB 3.2 Gen1 Type-A (2 с зарядкой 7.5W)",
      },
      {
        label: "Эргономика",
        value:
          "Высота до 150 мм, наклон −5°…+20°, разворот ±45°, поворот (pivot) ±90°; корпус из алюминия, безрамочный дизайн",
      },
      { label: "Год выпуска", value: "~2020" },
    ],
    image: "/images/monitors/hp-z24f-g3.png",
    imageAlt: "HP Z24f G3 23.8 IPS 1920x1080 монитор б/у",
    newPriceNote: "Новый HP Z24f G3 в рознице стоит около 37 000 ₽ — за б/у экземпляр в хорошем состоянии вы платите примерно четверть этой цены.",
  },
  {
    slug: "hp-e23-g4",
    brand: "HP",
    name: "HP E23 G4",
    fullName: "HP E23 G4 23 IPS 1920x1080 (Full HD)",
    diagonal: "23\"",
    resolution: "1920×1080 (Full HD)",
    aspectRatio: "16:9",
    refreshRate: "60 Гц",
    h1: "Монитор HP E23 G4 23\" IPS Full HD — б/у, недорого",
    title: "HP E23 G4 б/у — 23\" Full HD IPS, недорого, Москва",
    metaDescription:
      "Купить б/у монитор HP E23 G4 23\" IPS Full HD в Москве. 3 шт в наличии, от 6 500 ₽ — самый доступный монитор в линейке. Полная эргономика, USB-хаб, VGA.",
    price: 6500,
    stock: 3,
    keyFeature: "Самый доступный вариант линейки с полной эргономикой",
    forWhom: [
      "Тем, кто ищет самый недорогой вариант с IPS-матрицей и полной эргономикой",
      "Пользователям со старыми ПК — есть порт VGA",
      "Для второго/третьего рабочего места в офисе без переплаты",
      "Покупателям, которым важна регулировка высоты и pivot по минимальной цене",
    ],
    specs: [
      { label: "Диагональ", value: "23\"" },
      { label: "Разрешение / формат", value: "1920×1080 (Full HD), 16:9, 60 Гц (диапазон 50–60 Гц)" },
      { label: "Матрица", value: "IPS, 5 мс GtG, углы обзора 178°/178°, 6-bit+FRC (16.7 млн цветов)" },
      { label: "Яркость / контраст", value: "250 кд/м², 1000:1" },
      {
        label: "Порты",
        value: "1× DisplayPort 1.2, 1× HDMI 1.4, 1× VGA, 1× USB-B, 4× USB-A 3.0/3.2 Gen1",
      },
      {
        label: "Эргономика",
        value:
          "Высота до 150 мм, наклон −5°…+23°, разворот ±45°, поворот (pivot) ±90°; 3-сторонний микро-рамочный дизайн, антибликовое покрытие, режим низкого синего света",
      },
      { label: "Год выпуска", value: "2020" },
    ],
    image: "/images/monitors/hp-e23-g4.png",
    imageAlt: "HP E23 G4 23 IPS 1920x1080 монитор б/у",
  },
];

export const getMonitorBySlug = (slug: string) => MONITORS.find((m) => m.slug === slug);

export const formatPriceRub = (price: number) => `${price.toLocaleString("ru-RU")} ₽`;
