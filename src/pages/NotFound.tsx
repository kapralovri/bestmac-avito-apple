import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center px-6 py-12">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-6">
          Извините, такая страница не найдена. Возможно, вы ошиблись в адресе или она была удалена.
        </p>
        <a href="/" className="inline-block px-6 py-3 rounded-md bg-gradient-primary text-white hover:opacity-90 transition">
          Вернуться на главную
        </a>
      </div>
    </div>
  );
};

export default NotFound;
