import { useState, useEffect } from 'react';
import { loadBuyoutData, estimatePrice, type EstimateInput } from '@/lib/buyout';
import type { BuyoutRow } from '@/types/buyout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

const Sell = () => {
  const [data, setData] = useState<BuyoutRow[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [formData, setFormData] = useState<EstimateInput>({
    model: '',
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

  const handleCalculate = () => {
    if (!formData.model) return;
    const estimate = estimatePrice(formData, data);
    setResult(estimate);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Калькулятор выкупа техники Apple</h1>
          <p className="text-muted-foreground mb-8">Узнайте примерную стоимость вашего устройства прямо сейчас</p>

          <div className="grid md:grid-cols-2 gap-6">
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

                <Button onClick={handleCalculate} className="w-full" size="lg" disabled={!formData.model}>
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

                        <Button variant="default" size="lg" className="w-full">
                          Связаться с нами
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sell;
