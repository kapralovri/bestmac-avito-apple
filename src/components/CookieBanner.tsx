import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "bestmac_cookie_consent";

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "accepted") return;
      setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 pointer-events-none">
      <div className="max-w-5xl mx-auto px-4 pb-4">
        <div className="pointer-events-auto bg-card border border-border shadow-lg rounded-2xl px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-sm">
          <p className="text-muted-foreground md:mr-4">
            Мы используем файлы cookie, чтобы улучшить работу сайта, анализировать трафик и запоминать ваши
            настройки. Продолжая пользоваться сайтом, вы соглашаетесь с использованием cookie.
          </p>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={accept}>
              Понятно
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;

