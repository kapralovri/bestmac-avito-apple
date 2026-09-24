/**
 * Страница сайта → параметр start для ссылки на бота-оценщика
 * (t.me/thebestmac_bot?start=site_sell_mac-mini-2024-m4). Бот показывает его
 * в заявке, и видно, какие страницы приводят заявки через Telegram.
 * Telegram принимает в start только A-Z, a-z, 0-9, _ и -, до 64 символов.
 */
export function botStartParam(pathname: string): string {
  const path = (pathname || '/').split(/[?#]/)[0];
  const parts = path.split('/').filter(Boolean).map((p) => p.replace(/[^A-Za-z0-9-]/g, ''));
  return ['site', ...parts.filter(Boolean)].join('_').slice(0, 64);
}
