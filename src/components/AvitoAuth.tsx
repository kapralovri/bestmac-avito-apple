"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { avitoApiService } from "@/services/avitoApi";
import { motion } from "framer-motion";

const AvitoAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Проверяем авторизацию при загрузке
    checkAuthStatus();
    
    // Проверяем URL на наличие кода авторизации
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');
    
    if (authCode) {
      handleAuthCode(authCode);
    }
  }, []);

  const checkAuthStatus = () => {
    const authenticated = avitoApiService.isAuthenticated();
    setIsAuthenticated(authenticated);
  };

  const handleAuthCode = async (code: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await avitoApiService.exchangeCodeForToken(code);
      if (success) {
        setIsAuthenticated(true);
        // Очищаем URL от кода авторизации
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        setError('Не удалось получить доступ к API Avito');
      }
    } catch (err) {
      setError('Ошибка авторизации');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    setIsLoading(true);
    setError(null);
    avitoApiService.initiateAuth();
  };

  const handleLogout = () => {
    avitoApiService.logout();
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border shadow-elegant">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-8 h-8 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-apple-gray">Выполняется авторизация...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-card border-border shadow-elegant">
        <CardHeader>
          <CardTitle className="text-xl font-apple flex items-center gap-2">
            <span>Интеграция с Avito</span>
            {isAuthenticated && (
              <Badge variant="secondary" className="bg-apple-green text-white">
                <CheckCircle className="w-3 h-3 mr-1" />
                Подключено
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAuthenticated ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Успешно подключено к API Avito</span>
              </div>
              <p className="text-sm text-apple-gray">
                Теперь ваши объявления будут автоматически загружаться с Avito и отображаться на сайте.
              </p>
              <div className="pt-2">
                <Button 
                  variant="outline" 
                  onClick={handleLogout}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  Отключить интеграцию
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}
              
              <div className="space-y-3">
                <p className="text-sm text-apple-gray">
                  Для отображения ваших объявлений с Avito необходимо авторизоваться через API.
                </p>
                
                <div className="bg-blue-50 p-4 rounded-lg text-sm border border-blue-200">
                  <p className="font-medium mb-3 text-blue-800">📋 Настройка в Avito:</p>
                  <div className="space-y-2 text-blue-700">
                    <div className="flex items-start space-x-2">
                      <span className="font-mono text-xs bg-blue-100 px-2 py-1 rounded">1</span>
                      <span>Перейдите на <a href="https://developers.avito.ru/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">developers.avito.ru</a></span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-mono text-xs bg-blue-100 px-2 py-1 rounded">2</span>
                      <span>Создайте приложение и получите Client ID и Client Secret</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="font-mono text-xs bg-blue-100 px-2 py-1 rounded">3</span>
                      <span>Укажите Redirect URL: <code className="bg-blue-100 px-2 py-1 rounded text-xs">https://bestmac.ru</code></span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg text-sm border border-yellow-200">
                  <p className="font-medium mb-3 text-yellow-800">⚙️ Настройка для разработки:</p>
                  <div className="space-y-2 text-yellow-700">
                    <p className="text-xs">Создайте файл <code className="bg-yellow-100 px-2 py-1 rounded">.env.local</code> в корне проекта:</p>
                    <div className="bg-yellow-100 p-3 rounded text-xs font-mono">
                      VITE_AVITO_CLIENT_ID=ваш_client_id<br/>
                      VITE_AVITO_CLIENT_SECRET=ваш_client_secret<br/>
                      VITE_AVITO_REDIRECT_URL=http://localhost:8080
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                  <p className="font-medium mb-2">Что произойдет после авторизации:</p>
                  <ul className="space-y-1 text-apple-gray">
                    <li>• Автоматическая загрузка ваших объявлений</li>
                    <li>• Отображение реальных цен и состояния товаров</li>
                    <li>• Прямые ссылки на объявления на Avito</li>
                    <li>• Синхронизация данных в реальном времени</li>
                  </ul>
                </div>
              </div>
              
              <Button 
                onClick={handleLogin}
                className="w-full bg-gradient-primary hover:opacity-90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Авторизация...
                  </>
                ) : (
                  'Подключить к Avito'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AvitoAuth;
