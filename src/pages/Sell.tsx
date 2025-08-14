import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, ArrowRight, Calculator, Clock, Shield, Banknote } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Sell = () => {
  const [formData, setFormData] = useState({
    device: "",
    model: "",
    year: "",
    condition: "",
    storage: "",
    description: "",
    contact: "",
    phone: ""
  });

  const priceRanges = {
    "MacBook Air M1": "80,000 - 120,000 ₽",
    "MacBook Pro 14\" M2": "150,000 - 200,000 ₽", 
    "iMac 24\" M1": "100,000 - 150,000 ₽",
    "iPhone 14 Pro": "70,000 - 95,000 ₽",
    "iPhone 13": "50,000 - 70,000 ₽",
    "iPad Pro 12.9\"": "60,000 - 100,000 ₽"
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here would be integration with Telegram Bot API
    console.log("Form submitted:", formData);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold font-apple mb-6">
              Продать технику Apple
            </h1>
            <p className="text-xl text-apple-gray max-w-3xl mx-auto mb-8">
              Честная оценка, быстрая сделка и максимальная цена за вашу технику Apple. 
              Работаем официально через ИП с полным пакетом документов.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            {/* Process Steps */}
            <div>
              <h2 className="text-3xl font-bold font-apple mb-8">Как проходит выкуп</h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Заявка и оценка</h3>
                    <p className="text-apple-gray">
                      Оставляете заявку с описанием устройства. Мы даем предварительную оценку стоимости в течение 30 минут.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Встреча и диагностика</h3>
                    <p className="text-apple-gray">
                      Встречаемся в удобном для вас месте. Проводим полную диагностику устройства и определяем финальную стоимость.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Оформление и оплата</h3>
                    <p className="text-apple-gray">
                      Заключаем договор купли-продажи, выдаем все документы. Оплата наличными или переводом на карту.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Quote Form */}
            <Card className="bg-card border-border shadow-elegant">
              <CardHeader>
                <CardTitle className="text-2xl font-apple">Быстрая оценка</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="device">Тип устройства</Label>
                    <Select value={formData.device} onValueChange={(value) => setFormData({...formData, device: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите устройство" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="macbook">MacBook</SelectItem>
                        <SelectItem value="imac">iMac</SelectItem>
                        <SelectItem value="iphone">iPhone</SelectItem>
                        <SelectItem value="ipad">iPad</SelectItem>
                        <SelectItem value="airpods">AirPods</SelectItem>
                        <SelectItem value="watch">Apple Watch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="model">Модель</Label>
                    <Input 
                      placeholder="Например: MacBook Pro 14\" M2"
                      value={formData.model}
                      onChange={(e) => setFormData({...formData, model: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="year">Год</Label>
                      <Select value={formData.year} onValueChange={(value) => setFormData({...formData, year: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Год" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2024">2024</SelectItem>
                          <SelectItem value="2023">2023</SelectItem>
                          <SelectItem value="2022">2022</SelectItem>
                          <SelectItem value="2021">2021</SelectItem>
                          <SelectItem value="2020">2020</SelectItem>
                          <SelectItem value="older">Старше</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="condition">Состояние</Label>
                      <Select value={formData.condition} onValueChange={(value) => setFormData({...formData, condition: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Состояние" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="excellent">Отличное</SelectItem>
                          <SelectItem value="good">Хорошее</SelectItem>
                          <SelectItem value="fair">Удовлетворительное</SelectItem>
                          <SelectItem value="poor">Требует ремонта</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone">Телефон</Label>
                    <Input 
                      placeholder="+7 (999) 123-45-67"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Дополнительная информация</Label>
                    <Textarea 
                      placeholder="Комплектация, дефекты, особенности..."
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                  </div>

                  <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90">
                    Получить оценку
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Price Ranges */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold font-apple text-center mb-8">
              Примерные цены выкупа
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(priceRanges).map(([model, price]) => (
                <Card key={model} className="bg-card border-border hover:shadow-elegant transition-all duration-300">
                  <CardContent className="p-6 text-center">
                    <h3 className="font-semibold mb-2">{model}</h3>
                    <p className="text-2xl font-bold text-primary">{price}</p>
                    <p className="text-sm text-apple-gray mt-2">В зависимости от состояния</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Advantages */}
          <div className="bg-card rounded-lg border border-border p-8">
            <h2 className="text-3xl font-bold font-apple text-center mb-8">
              Преимущества продажи нам
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <Calculator className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Честная оценка</h3>
                <p className="text-sm text-apple-gray">Реальная рыночная стоимость без занижения</p>
              </div>
              
              <div className="text-center">
                <Clock className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Быстро</h3>
                <p className="text-sm text-apple-gray">Оценка за 30 минут, сделка в день обращения</p>
              </div>
              
              <div className="text-center">
                <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Безопасно</h3>
                <p className="text-sm text-apple-gray">Официальное оформление через ИП</p>
              </div>
              
              <div className="text-center">
                <Banknote className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Удобная оплата</h3>
                <p className="text-sm text-apple-gray">Наличные или перевод на карту</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Sell;