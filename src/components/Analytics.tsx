import { useEffect } from 'react';

// Функция для отправки целей в Яндекс.Метрику
export const trackGoal = (goalName: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.ym) {
    window.ym(123456789, 'reachGoal', goalName, params);
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
    if (typeof window !== 'undefined' && window.ym) {
      window.ym(123456789, 'hit', window.location.href, {
        title: pageName
      });
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
  if (typeof window !== 'undefined') {
    // Яндекс.Метрика
    (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();
    for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
    k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
    (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

    window.ym(123456789, "init", {
      defer: true
    });
  }
};

export default { trackGoal, trackContactClick, trackFormSubmit, usePageTracking, useClickTracking, initAnalytics };

