import { useEffect } from 'react';

const METRIKA_ID = 50006968;

// Функция для отправки целей в Яндекс.Метрику
export const trackGoal = (goalName: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).ym) {
    (window as any).ym(METRIKA_ID, 'reachGoal', goalName, params);
  }
};

// Функция для отслеживания кликов по контактам
export const trackContactClick = (type: 'phone' | 'email' | 'telegram' | 'whatsapp') => {
  trackGoal(`click_${type}`);
};

// Компонент для отслеживания отправки форм
export const trackFormSubmit = (formType: string) => {
  trackGoal(`${formType}_form_success`);
};

// Хук для отслеживания просмотров страниц
export const usePageTracking = (pageName: string) => {
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ym) {
      (window as any).ym(METRIKA_ID, 'hit', window.location.href, { title: pageName });
    }
  }, [pageName]);
};

// Компонент для отслеживания кликов по кнопкам
export const useClickTracking = (elementId: string, goalName: string) => {
  useEffect(() => {
    const element = document.getElementById(elementId);
    if (element) {
      element.addEventListener('click', () => {
        trackGoal(goalName);
      });
    }
  }, [elementId, goalName]);
};

// Функция для инициализации аналитики
export const initAnalytics = () => {
  // Инициализация встроена в index.html, здесь ничего не делаем
};

export default { trackGoal, trackContactClick, trackFormSubmit, usePageTracking, useClickTracking, initAnalytics };
