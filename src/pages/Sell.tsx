import { useState, useEffect } from 'react';
import { loadBuyoutData, estimatePrice, type EstimateInput } from '@/lib/buyout';
import type { BuyoutRow } from '@/types/buyout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import SEOHead from '@/components/SEOHead';
import BuyoutTable from '@/components/BuyoutTable';
import { CheckCircle2, Shield, Clock, Wallet, TrendingUp, Award } from 'lucide-react';
import { generateProductSchema } from '@/lib/structured-data';

const Sell = () => {
  const [data, setData] = useState<BuyoutRow[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [ramOptions, setRamOptions] = useState<string[]>([]);
  const [storageOptions, setStorageOptions] = useState<string[]>([]);
  const [formData, setFormData] = useState<Partial<EstimateInput>>({
    model: '',
    ram: '',
    storage: '',
    condition: 'A',
    batteryCycles: 0,
    displayDefect: false,
    bodyDefect: false,
    hasCharger: true,
    hasBox: true,
    icloudBlocked: false,
  });
  const [result, setResult] = useState<{ base: number; priceMin: number; priceMax: number } | null>(null);

  useEffect(() => {
    loadBuyoutData().then((rows) => {
      setData(rows);
      const uniqueModels = Array.from(new Set(rows.map(r => r.model))).sort((a, b) => a.localeCompare(b, 'ru'));
      setModels(uniqueModels);
    });
  }, []);

  // При выборе модели обновляем доступные RAM
  useEffect(() => {
    if (!formData.model) {
      setRamOptions([]);
      setStorageOptions([]);
      return;
    }
    
    const rowsForModel = data.filter(r => r.model === formData.model);
    const uniqueRam = Array.from(new Set(rowsForModel.map(r => r.ram).filter(Boolean) as string[]))
      .sort((a, b) => parseInt(a) - parseInt(b));
    setRamOptions(uniqueRam);
    
    // Сбрасываем RAM и Storage при смене модели
    setFormData(prev => ({ ...prev, ram: '', storage: '' }));
  }, [formData.model, data]);

  // При выборе RAM обновляем доступные Storage
  useEffect(() => {
    if (!formData.model || !formData.ram) {
      setStorageOptions([]);
      return;
    }
    
    const rowsForConfig = data.filter(r => r.model === formData.model && r.ram === formData.ram);
    const uniqueStorage = Array.from(new Set(rowsForConfig.map(r => r.storage).filter(Boolean) as string[]))
      .sort((a, b) => parseInt(a) - parseInt(b));
    setStorageOptions(uniqueStorage);
    
    // Сбрасываем Storage при смене RAM
    setFormData(prev => ({ ...prev, storage: '' }));
  }, [formData.ram, formData.model, data]);

  const handleCalculate = () => {
    if (!formData.model || !formData.ram || !formData.storage) return;
    const estimate = estimatePrice(formData as EstimateInput, data);
    setResult(estimate);
  };

  const productSchema = generateProductSchema({
    name: "Выкуп MacBook в Москве",
    price: 50000,
    condition: "UsedCondition",
    description: "Быстрый выкуп MacBook по честной цене. Оценка за 2 минуты, выезд на дом бесплатно, оплата сразу наличными или переводом."
  });

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Продать MacBook в Москве - Выкуп техники Apple | BestMac"
        description="Онлайн-калькулятор выкупа MacBook за 2 минуты. Оценка по модели, памяти, состоянию батареи. Выезд специалиста на дом бесплатно, оплата сразу наличными или переводом. Честные цены на MacBook Air, Pro, iMac, iPhone в Москве."
        canonical="/sell"
        keywords="продать macbook, выкуп macbook, скупка macbook москва, продать macbook срочно, оценка macbook, сдать macbook"
        schema={productSchema}
      />
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={[
          { name: 'Главная', url: '/' },
          { name: 'Продать технику', url: '/sell' }
        ]} />

        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Продать MacBook в Москве</h1>
          <p className="text-lg text-muted-foreground mb-8">Узнайте стоимость вашего устройства за 2 минуты. Честная цена, выезд на дом, оплата сразу.</p>

          {/* Преимущества */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <div className="text-center p-4 bg-card rounded-lg border">
              <Clock className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="font-semibold">Оценка за 2 минуты</p>
            </div>
            <div className="text-center p-4 bg-card rounded-lg border">
              <Wallet className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="font-semibold">Оплата сразу</p>
            </div>
            <div className="text-center p-4 bg-card rounded-lg border">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="font-semibold">Высокая цена</p>
            </div>
            <div className="text-center p-4 bg-card rounded-lg border">
              <Shield className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="font-semibold">Безопасно</p>
            </div>
          </div>

          {/* Калькулятор */}
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <Card>
              <CardHeader>
                <CardTitle>Параметры устройства</CardTitle>
                <CardDescription>Заполните информацию о вашем MacBook</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="model">Модель</Label>
                  <Select value={formData.model} onValueChange={(value) => setFormData({ ...formData, model: value })}>
                    <SelectTrigger id="model">
                      <SelectValue placeholder="Выберите модель" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {models.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ram">Оперативная память</Label>
                  <Select 
                    value={formData.ram} 
                    onValueChange={(value) => setFormData({ ...formData, ram: value })}
                    disabled={!formData.model}
                  >
                    <SelectTrigger id="ram">
                      <SelectValue placeholder="Выберите RAM" />
                    </SelectTrigger>
                    <SelectContent>
                      {ramOptions.map((ram) => (
                        <SelectItem key={ram} value={ram}>
                          {ram} GB
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storage">SSD накопитель</Label>
                  <Select 
                    value={formData.storage} 
                    onValueChange={(value) => setFormData({ ...formData, storage: value })}
                    disabled={!formData.ram}
                  >
                    <SelectTrigger id="storage">
                      <SelectValue placeholder="Выберите SSD" />
                    </SelectTrigger>
                    <SelectContent>
                      {storageOptions.map((storage) => (
                        <SelectItem key={storage} value={storage}>
                          {storage} GB
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="condition">Состояние</Label>
                  <Select value={formData.condition} onValueChange={(value: any) => setFormData({ ...formData, condition: value })}>
                    <SelectTrigger id="condition">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A - Отличное (минимальные следы использования)</SelectItem>
                      <SelectItem value="B">B - Хорошее (видимые следы использования)</SelectItem>
                      <SelectItem value="C">C - Удовлетворительное (значительные следы)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cycles">Циклы батареи</Label>
                  <Input
                    id="cycles"
                    type="number"
                    min="0"
                    value={formData.batteryCycles}
                    onChange={(e) => setFormData({ ...formData, batteryCycles: Number(e.target.value) })}
                    placeholder="Например: 150"
                  />
                  <p className="text-xs text-muted-foreground">Узнать в: О системе → Питание → Информация о батарее</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="displayDefect"
                      checked={formData.displayDefect}
                      onCheckedChange={(checked) => setFormData({ ...formData, displayDefect: checked as boolean })}
                    />
                    <Label htmlFor="displayDefect" className="cursor-pointer">Дефекты экрана (царапины, пятна)</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="bodyDefect"
                      checked={formData.bodyDefect}
                      onCheckedChange={(checked) => setFormData({ ...formData, bodyDefect: checked as boolean })}
                    />
                    <Label htmlFor="bodyDefect" className="cursor-pointer">Дефекты корпуса (вмятины, сколы)</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasCharger"
                      checked={formData.hasCharger}
                      onCheckedChange={(checked) => setFormData({ ...formData, hasCharger: checked as boolean })}
                    />
                    <Label htmlFor="hasCharger" className="cursor-pointer">Есть зарядное устройство</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasBox"
                      checked={formData.hasBox}
                      onCheckedChange={(checked) => setFormData({ ...formData, hasBox: checked as boolean })}
                    />
                    <Label htmlFor="hasBox" className="cursor-pointer">Есть коробка</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="icloudBlocked"
                      checked={formData.icloudBlocked}
                      onCheckedChange={(checked) => setFormData({ ...formData, icloudBlocked: checked as boolean })}
                    />
                    <Label htmlFor="icloudBlocked" className="cursor-pointer text-destructive">iCloud заблокирован</Label>
                  </div>
                </div>

                <Button 
                  onClick={handleCalculate} 
                  className="w-full" 
                  size="lg" 
                  disabled={!formData.model || !formData.ram || !formData.storage}
                >
                  Рассчитать стоимость
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Оценка стоимости</CardTitle>
                <CardDescription>Примерная цена выкупа вашего устройства</CardDescription>
              </CardHeader>
              <CardContent>
                {!result ? (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    <p>Заполните параметры и нажмите "Рассчитать стоимость"</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {result.priceMin === 0 && result.priceMax === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-lg font-semibold text-destructive mb-2">Выкуп невозможен</p>
                        <p className="text-sm text-muted-foreground">
                          {formData.icloudBlocked ? 'Устройство с блокировкой iCloud не подлежит выкупу' : 'К сожалению, выкуп данного устройства невозможен'}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="text-center py-6 border-b">
                          <p className="text-sm text-muted-foreground mb-2">Диапазон цены</p>
                          <p className="text-4xl font-bold text-primary">
                            {result.priceMin.toLocaleString('ru-RU')} - {result.priceMax.toLocaleString('ru-RU')} ₽
                          </p>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Модель:</span>
                            <span className="font-semibold text-right">{formData.model}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">RAM:</span>
                            <span className="font-semibold">{formData.ram} GB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">SSD:</span>
                            <span className="font-semibold">{formData.storage} GB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Базовая цена:</span>
                            <span className="font-semibold">{result.base.toLocaleString('ru-RU')} ₽</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Состояние:</span>
                            <span className="font-semibold">{formData.condition}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Циклы батареи:</span>
                            <span className="font-semibold">{formData.batteryCycles}</span>
                          </div>
                        </div>

                        <div className="bg-muted/50 p-4 rounded-lg">
                          <p className="text-xs text-muted-foreground">
                            ⚠️ Итоговая цена может отличаться после осмотра устройства. Для точной оценки свяжитесь с нами.
                          </p>
                        </div>

                        <Button 
                          variant="default" 
                          size="lg" 
                          className="w-full"
                          asChild
                        >
                          <a href="https://t.me/romanmanro" target="_blank" rel="noopener noreferrer">
                            Написать в Telegram
                          </a>
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Таблица с ценами */}
          <BuyoutTable />

          {/* Процесс выкупа */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6 text-center">Как проходит выкуп?</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
                <h3 className="font-semibold mb-2">Оценка онлайн</h3>
                <p className="text-sm text-muted-foreground">Заполните калькулятор выше и узнайте примерную стоимость</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
                <h3 className="font-semibold mb-2">Связь с нами</h3>
                <p className="text-sm text-muted-foreground">Свяжитесь через Telegram для уточнения деталей</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
                <h3 className="font-semibold mb-2">Осмотр техники</h3>
                <p className="text-sm text-muted-foreground">Бесплатный выезд или встреча в удобном месте</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">4</div>
                <h3 className="font-semibold mb-2">Получение денег</h3>
                <p className="text-sm text-muted-foreground">Оплата наличными или переводом сразу после осмотра</p>
              </div>
            </div>
          </section>

          {/* Гарантии */}
          <section className="mb-16 bg-card p-8 rounded-lg border">
            <h2 className="text-3xl font-bold mb-6 text-center">Наши гарантии</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Честная цена</h3>
                  <p className="text-sm text-muted-foreground">Цена не меняется после осмотра, если вы правильно указали состояние</p>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Конфиденциальность</h3>
                  <p className="text-sm text-muted-foreground">Полное удаление ваших данных с устройства при выкупе</p>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Работаем официально</h3>
                  <p className="text-sm text-muted-foreground">Оформление через ИП, договор купли-продажи</p>
                </div>
              </div>
              <div className="flex gap-4">
                <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Быстро и удобно</h3>
                  <p className="text-sm text-muted-foreground">Выезд в любую точку Москвы, оплата сразу</p>
                </div>
              </div>
            </div>
          </section>

          {/* Срочный выкуп */}
          <section className="mb-16 bg-gradient-to-r from-primary/10 to-primary/5 p-8 rounded-lg border border-primary/20">
            <div className="max-w-3xl mx-auto text-center">
              <Award className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h2 className="text-3xl font-bold mb-4">Нужно продать срочно?</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Готовы приехать в течение часа! При срочном выкупе предлагаем максимальную цену без торга.
              </p>
              <Button size="lg" asChild>
                <a href="https://t.me/romanmanro" target="_blank" rel="noopener noreferrer">
                  Продать срочно
                </a>
              </Button>
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6 text-center">Частые вопросы</h2>
            <div className="space-y-4 max-w-3xl mx-auto">
              <details className="bg-card p-4 rounded-lg border">
                <summary className="font-semibold cursor-pointer">Как узнать циклы батареи на MacBook?</summary>
                <p className="mt-2 text-sm text-muted-foreground">
                  Зажмите Option и нажмите на логотип Apple → "Информация о системе" → "Питание" → "Информация о батарее". Там будет указано "Счетчик циклов".
                </p>
              </details>
              <details className="bg-card p-4 rounded-lg border">
                <summary className="font-semibold cursor-pointer">Выкупаете ли MacBook с дефектами?</summary>
                <p className="mt-2 text-sm text-muted-foreground">
                  Да, выкупаем технику с дефектами корпуса, экрана, но с учетом снижения цены. Не выкупаем устройства с блокировкой iCloud.
                </p>
              </details>
              <details className="bg-card p-4 rounded-lg border">
                <summary className="font-semibold cursor-pointer">Как происходит оплата?</summary>
                <p className="mt-2 text-sm text-muted-foreground">
                  Оплата производится наличными или переводом сразу после проверки и подписания договора. Никаких задержек.
                </p>
              </details>
              <details className="bg-card p-4 rounded-lg border">
                <summary className="font-semibold cursor-pointer">Нужна ли коробка и зарядное устройство?</summary>
                <p className="mt-2 text-sm text-muted-foreground">
                  Наличие коробки и зарядки увеличивает стоимость, но не обязательно. Выкупаем и без комплекта.
                </p>
              </details>
              <details className="bg-card p-4 rounded-lg border">
                <summary className="font-semibold cursor-pointer">Сколько времени занимает сделка?</summary>
                <p className="mt-2 text-sm text-muted-foreground">
                  Обычно 15-30 минут: проверка устройства, подписание договора и передача денег.
                </p>
              </details>
            </div>
          </section>

          {/* CTA */}
          <section className="text-center py-12">
            <h2 className="text-3xl font-bold mb-4">Готовы продать свой MacBook?</h2>
            <p className="text-lg text-muted-foreground mb-6">Свяжитесь с нами прямо сейчас</p>
            <Button size="lg" asChild>
              <a href="https://t.me/romanmanro" target="_blank" rel="noopener noreferrer">
                Написать в Telegram
              </a>
            </Button>
          </section>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Sell;
