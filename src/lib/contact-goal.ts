/**
 * Клик по ссылке-контакту → имя цели Метрики. Основная доля заявок уходит не
 * через формы, а в Telegram и по телефону, а размечены были только ссылки в
 * футере и на паре страниц. Единый перехватчик (ContactClickTracker) считает
 * клики по всем ссылкам сайта через эту функцию.
 *
 * Чистая функция без импортов: тест — tests/contact-goal.test.ts.
 */
export type ContactGoal = 'click_phone' | 'click_telegram' | 'click_whatsapp' | 'click_email';

// Контакты партнёрского сервисного центра на /service — не заявки BestMac.
const PARTNER_CONTACTS = ['tel:+74953695162', 'mailto:info@appleprofessional.ru'];

export function contactGoal(href: string): ContactGoal | null {
  const h = (href || '').trim().toLowerCase();
  if (PARTNER_CONTACTS.includes(h)) return null;
  if (h.startsWith('tel:')) return 'click_phone';
  if (h.startsWith('mailto:')) return 'click_email';
  let host = '';
  try {
    host = new URL(h).hostname;
  } catch {
    return null;
  }
  if (host === 't.me' || host === 'telegram.me') return 'click_telegram';
  if (host === 'wa.me' || host === 'api.whatsapp.com' || host === 'web.whatsapp.com') return 'click_whatsapp';
  return null;
}
