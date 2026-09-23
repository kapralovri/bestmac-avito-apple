"use client";

import { useEffect } from 'react';
import { contactGoal } from '@/lib/contact-goal';
import { trackGoal } from '@/components/Analytics';

/**
 * Считает клики по всем ссылкам-контактам сайта (телефон, Telegram, WhatsApp,
 * почта) одной подпиской на документ. Отдельные onClick у ссылок не нужны —
 * новые страницы размечаются сами. В параметрах цели — страница, чтобы видеть,
 * какие страницы приводят заявки.
 */
export default function ContactClickTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a) return;
      const goal = contactGoal(a.getAttribute('href') || '');
      if (goal) trackGoal(goal, { page: window.location.pathname });
    };
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);
  return null;
}
