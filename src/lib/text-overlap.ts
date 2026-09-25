/**
 * Похожесть текстов страниц по 5-словным фрагментам (GST-81). Яндекс исключал
 * наши страницы как малоценные, когда они повторяли друг друга, — перед
 * выкаткой новых страниц проверяем, что их собственный текст не дублирует
 * соседние. Чистые функции без импортов: тесты запускает `node --test`.
 */
export function shingles(text: string, n = 5): Set<string> {
  const words = text.toLowerCase().replace(/ё/g, 'е').match(/[a-zа-я0-9]+/g) ?? [];
  const out = new Set<string>();
  for (let i = 0; i + n <= words.length; i++) out.add(words.slice(i, i + n).join(' '));
  return out;
}

/** Доля фрагментов текста a, которые встречаются в тексте b (0…1). */
export function overlapShare(a: string, b: string, n = 5): number {
  const own = shingles(a, n);
  if (!own.size) return 0;
  const other = shingles(b, n);
  let common = 0;
  for (const s of own) if (other.has(s)) common++;
  return common / own.size;
}

/**
 * Видимый текст основной части страницы: без шапки, подвала, скриптов и общих
 * блоков (отзывы, цены), помеченных атрибутом data-shared-block.
 */
export function ownPageText(html: string): string {
  let body = html;
  const headerEnd = body.indexOf('</header>');
  if (headerEnd >= 0) body = body.slice(headerEnd + '</header>'.length);
  const footerStart = body.lastIndexOf('<footer');
  if (footerStart >= 0) body = body.slice(0, footerStart);
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<section[^>]*data-shared-block[^>]*>[\s\S]*?<\/section>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
