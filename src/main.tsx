import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import './index.css'

// Глобальные обработчики — ловят ошибки вне React-дерева
window.addEventListener('error', (event) => {
  console.error('[Global Error]', event.error);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Rejection]', event.reason);
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#000;color:#fff;font-family:-apple-system,sans-serif;text-align:center;padding:24px">
      <div>
        <h1 style="font-size:24px;margin-bottom:16px">BestMac</h1>
        <p style="color:#999;margin-bottom:16px">Ошибка при загрузке страницы. Попробуйте обновить.</p>
        <a href="tel:+79032990029" style="color:#0071e3">+7 (903) 299-00-29</a>
      </div>
    </div>`;
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
