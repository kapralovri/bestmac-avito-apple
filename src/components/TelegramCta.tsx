'use client';

import { useEffect, useState } from 'react';

const BOT_URL = 'https://t.me/thebestmac_bot';

/**
 * Плавающая кнопка «сайт → Telegram-бот».
 * Конвертирует трафик сайта в лиды бота @thebestmac_bot.
 * Клик трекается целью Яндекс.Метрики (tg_cta_click) и событием GA.
 */
export default function TelegramCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // показываем с задержкой, чтобы не мешать LCP
    const t = setTimeout(() => setShow(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const handleClick = () => {
    try {
      (window as unknown as { ym?: (...a: unknown[]) => void }).ym?.(
        50006968, 'reachGoal', 'tg_cta_click',
      );
    } catch { /* noop */ }
    try {
      (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.(
        'event', 'tg_cta_click', { event_label: 'site_to_bot' },
      );
    } catch { /* noop */ }
  };

  return (
    <a
      href={BOT_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      aria-label="Оценить Mac в Telegram-боте BestMac"
      className={[
        'fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full',
        'bg-[#229ED9] px-5 py-3 text-white font-semibold',
        'shadow-lg shadow-[#229ED9]/30 ring-1 ring-white/10',
        'transition-all duration-300 hover:bg-[#1c8dc4] hover:scale-105 active:scale-95',
        show ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0 pointer-events-none',
      ].join(' ')}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71l-4.14-3.05-1.99 1.93c-.23.23-.42.42-.84.42z" />
      </svg>
      <span className="hidden sm:inline whitespace-nowrap">Оценить Mac за минуту</span>
      <span className="sm:hidden">Оценить</span>
    </a>
  );
}
