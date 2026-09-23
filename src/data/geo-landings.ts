// Гео-страницы /moskva/[district], рендерятся через GeoLanding.
// Добавить локацию = добавить объект.
//
// GST-76: оставлены только локации, которые Яндекс держит в поиске. Остальные
// районы и города МО он исключил как малоценные — они склеены 301-редиректами
// (src/data/seo-redirects.ts). Новую локацию добавляйте, только если туда
// действительно выезжаете и можете написать о ней что-то своё.

export interface GeoLandingConfig {
  slug: string;
  district: string;       // именительный падеж («Химки»)
  locative: string;       // для «в …» («Химках» / «Тверском районе»)
  metroStation: string;   // ближайшее метро
  heroTitle: string;      // полный H1
  nearbyAreas: string[];
  landmarks?: string[];
  customDescription: string;
  metaTitle: string;
  metaDescription: string;
}

export const GEO_LANDINGS: GeoLandingConfig[] = [
  // ── Подмосковье ──────────────────────────────────────────────────────────
  {
    slug: "lyubertsy",
    district: "Люберцы",
    locative: "Люберцах",
    metroStation: "Котельники",
    heroTitle: "Скупка MacBook в Люберцах с выездом",
    nearbyAreas: ["Котельники", "Жулебино", "Некрасовка", "Дзержинский", "ЮВАО Москвы"],
    landmarks: ["ТЦ «Мега Белая Дача»", "Октябрьский проспект"],
    customDescription:
      "Скупка MacBook и техники Apple в Люберцах, Котельниках и Жулебино. Выезд оценщика бесплатно, оценка по фото заранее, деньги на месте.",
    metaTitle: "Скупка MacBook в Люберцах — оценка за 5 минут",
    metaDescription:
      "Продать MacBook в Люберцах: бесплатный выезд, цена известна до встречи, оплата наличными на месте. Выкупаем любые модели Mac.",
  },
  {
    slug: "balashiha",
    district: "Балашиха",
    locative: "Балашихе",
    metroStation: "Щёлковская",
    heroTitle: "Скупка MacBook в Балашихе с выездом",
    nearbyAreas: ["Реутов", "Железнодорожный", "Новогиреево", "ВАО Москвы"],
    landmarks: ["Горьковское шоссе", "ТЦ «Светофор»", "мкр. Железнодорожный"],
    customDescription:
      "Скупка MacBook и техники Apple в Балашихе и Реутове. Выезд оценщика бесплатно по согласованию, предварительная оценка по фото, расчёт на месте.",
    metaTitle: "Скупка MacBook в Балашихе — выезд, деньги сразу",
    metaDescription:
      "Продать MacBook в Балашихе или Реутове: оценка по фото за 5 минут, бесплатный выезд, оплата наличными или переводом на месте.",
  },
];

export function getGeoLanding(slug: string): GeoLandingConfig | undefined {
  return GEO_LANDINGS.find((g) => g.slug === slug);
}
