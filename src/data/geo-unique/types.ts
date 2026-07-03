// Уникальные контент-блоки гео-страниц /moskva/[district].
// Зачем: шаблонные районные страницы были на ~70% идентичны (риск doorway-фильтра
// Яндекса); каждому району добавляются свои 250-350 слов локального контента.
export interface GeoUniqueBlock {
  heading: string;   // H2/H3 заголовок блока
  text: string;      // 80-150 слов; без выдуманных фактов и «местных офисов»
}

export type GeoUniqueMap = Record<string, GeoUniqueBlock[]>;
