import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import SEOHead from "@/components/SEOHead";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <>
      <SEOHead 
        title="Страница не найдена 404 | BestMac"
        description="Запрашиваемая страница не найдена. Вернитесь на главную страницу BestMac для покупки и продажи техники Apple."
      />
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4">
        <div className="max-w-2xl w-full text-center">
          <h1 className="text-8xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">404</h1>
          <h2 className="text-3xl font-bold mb-4">Страница не найдена</h2>
          <p className="text-xl text-muted-foreground mb-8">
            К сожалению, страница, которую вы ищете, не существует или была перемещена.
          </p>
          
          <div className="mb-12">
            <a href="/" className="inline-block px-8 py-4 rounded-lg bg-gradient-primary text-white font-semibold hover:opacity-90 transition-opacity">
              Вернуться на главную
            </a>
          </div>

          {/* Полезные ссылки */}
          <div className="bg-card border border-border rounded-lg p-8 text-left">
            <h3 className="text-xl font-bold mb-6 text-center">Возможно, вы искали:</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <a href="/buy" className="block p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <h4 className="font-semibold mb-2">🛒 Купить MacBook</h4>
                <p className="text-sm text-muted-foreground">Большой выбор б/у техники Apple с гарантией</p>
              </a>
              <a href="/sell" className="block p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <h4 className="font-semibold mb-2">💰 Продать MacBook</h4>
                <p className="text-sm text-muted-foreground">Онлайн-калькулятор оценки, быстрый выкуп</p>
              </a>
              <a href="/comparison" className="block p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <h4 className="font-semibold mb-2">⚖️ Сравнение моделей</h4>
                <p className="text-sm text-muted-foreground">Сравните характеристики разных MacBook</p>
              </a>
              <a href="/selection" className="block p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <h4 className="font-semibold mb-2">🎯 Подбор техники</h4>
                <p className="text-sm text-muted-foreground">Персональная консультация эксперта</p>
              </a>
              <a href="/business" className="block p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <h4 className="font-semibold mb-2">🏢 Для бизнеса</h4>
                <p className="text-sm text-muted-foreground">Корпоративные закупки и лизинг</p>
              </a>
              <a href="/contact" className="block p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <h4 className="font-semibold mb-2">📞 Контакты</h4>
                <p className="text-sm text-muted-foreground">Адреса, телефоны, время работы</p>
              </a>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-sm text-muted-foreground">
              Если вы считаете, что это ошибка, свяжитесь с нами:{" "}
              <a href="tel:+79032990029" className="text-primary hover:underline">+7 (903) 299-00-29</a>
              {" "}или{" "}
              <a href="https://t.me/romanmanro" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Telegram</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
