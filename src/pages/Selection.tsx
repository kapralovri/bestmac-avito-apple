import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Search, Target, CheckCircle, MessageCircle, HandHeart, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { sendEmail } from "@/services/email";

const Selection = () => {
  const [budget, setBudget] = useState([100000]);
  const initialState = {
    purpose: "",
    devices: "",
    features: "",
    timeline: "",
    phone: "",
    additional: ""
  };
  const [formData, setFormData] = useState(initialState);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendEmail({ form: "selection", ...formData, budget: budget[0] });
      setIsSubmitted(true);
      setFormData(initialState);
      setBudget([100000]);
      setTimeout(() => setIsSubmitted(false), 3000);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold font-apple mb-6">
              Подбор техники Apple
            </h1>
            <p className="text-xl text-apple-gray max-w-3xl mx-auto mb-8">
              Не знаете, какую технику Apple выбрать? Мы поможем подобрать идеальное решение 
              под ваши задачи и бюджет. Персональные консультации и рекомендации от экспертов.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            {/* Process Description */}
            <div>
              <h2 className="text-3xl font-bold font-apple mb-8">Как работает подбор</h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Search className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Анализ потребностей</h3>
                    <p className="text-apple-gray">
                      Заполняете подробную анкету с описанием задач, предпочтений и бюджета. 
                      Это поможет нам понять ваши потребности.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Персональные рекомендации</h3>
                    <p className="text-apple-gray">
                      Наш эксперт анализирует ваши требования и подготавливает 2-3 варианта 
                      с объяснением плюсов и минусов каждого.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Консультация</h3>
                    <p className="text-apple-gray">
                      Обсуждаем варианты по телефону или в мессенджере, отвечаем на все вопросы 
                      и помогаем принять окончательное решение.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <HandHeart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Помощь в покупке</h3>
                    <p className="text-apple-gray">
                      При необходимости помогаем найти и приобрести выбранную технику 
                      по лучшей цене с гарантией качества.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-6 bg-apple-light-gray rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center">
                  <CheckCircle className="w-5 h-5 text-apple-green mr-2" />
                  Консультация бесплатно
                </h3>
                <p className="text-sm text-apple-gray">
                  Подбор и консультация абсолютно бесплатны. Вы платите только за технику, 
                  если решите приобрести ее через нас.
                </p>
              </div>
            </div>

            {/* Selection Form */}
            <Card className="bg-card border-border shadow-elegant">
              <CardHeader>
                <CardTitle className="text-2xl font-apple">Заявка на подбор</CardTitle>
              </CardHeader>
              <CardContent>
                {isSubmitted ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 text-apple-green mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Сообщение успешно отправлено</h3>
                    <p className="text-apple-gray">
                      Мы получили вашу заявку и свяжемся с вами в ближайшее время.
                    </p>
                  </div>
                ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="purpose">Для каких задач нужна техника?</Label>
                    <Select value={formData.purpose} onValueChange={(value) => setFormData({...formData, purpose: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите основное назначение" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="work">Работа и бизнес</SelectItem>
                        <SelectItem value="design">Дизайн и творчество</SelectItem>
                        <SelectItem value="programming">Программирование</SelectItem>
                        <SelectItem value="study">Учеба</SelectItem>
                        <SelectItem value="home">Домашнее использование</SelectItem>
                        <SelectItem value="gaming">Игры и развлечения</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="devices">Какую технику рассматриваете?</Label>
                    <Select value={formData.devices} onValueChange={(value) => setFormData({...formData, devices: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Тип устройства" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="macbook">MacBook</SelectItem>
                        <SelectItem value="imac">iMac</SelectItem>
                        <SelectItem value="iphone">iPhone</SelectItem>
                        <SelectItem value="ipad">iPad</SelectItem>
                        <SelectItem value="complex">Комплексное решение</SelectItem>
                        <SelectItem value="unsure">Не уверен</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="budget">Бюджет: {budget[0].toLocaleString('ru-RU')} ₽</Label>
                    <div className="mt-2">
                      <Slider
                        value={budget}
                        onValueChange={setBudget}
                        max={500000}
                        min={30000}
                        step={10000}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-apple-gray mt-2">
                        <span>30,000 ₽</span>
                        <span>500,000 ₽</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="features">Важные характеристики</Label>
                    <Textarea 
                      placeholder="Размер экрана, производительность, портативность, время работы..."
                      value={formData.features}
                      onChange={(e) => setFormData({...formData, features: e.target.value})}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="timeline">Когда планируете покупку?</Label>
                    <Select value={formData.timeline} onValueChange={(value) => setFormData({...formData, timeline: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Временные рамки" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">Срочно (в течение недели)</SelectItem>
                        <SelectItem value="month">В течение месяца</SelectItem>
                        <SelectItem value="quarter">В течение 3 месяцев</SelectItem>
                        <SelectItem value="planning">Планирую заранее</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="phone">Телефон для связи</Label>
                    <Input 
                      placeholder="+7 (999) 123-45-67"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="additional">Дополнительные пожелания</Label>
                    <Textarea 
                      placeholder="Любая дополнительная информация, которая поможет в подборе..."
                      value={formData.additional}
                      onChange={(e) => setFormData({...formData, additional: e.target.value})}
                      rows={3}
                    />
                  </div>

                  <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90">
                    Получить рекомендации
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Popular Requests */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold font-apple text-center mb-8">
              Популярные запросы
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-card border-border hover:shadow-elegant transition-all duration-300">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3">Для студента</h3>
                  <p className="text-apple-gray text-sm mb-4">
                    MacBook Air M1, учеба, до 80,000 ₽
                  </p>
                  <div className="text-primary font-semibold">MacBook Air 13" M1</div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border hover:shadow-elegant transition-all duration-300">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3">Для дизайнера</h3>
                  <p className="text-apple-gray text-sm mb-4">
                    Работа с графикой, до 150,000 ₽
                  </p>
                  <div className="text-primary font-semibold">MacBook Pro 14" M2</div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border hover:shadow-elegant transition-all duration-300">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3">Рабочая станция</h3>
                  <p className="text-apple-gray text-sm mb-4">
                    Домашний офис, до 200,000 ₽
                  </p>
                  <div className="text-primary font-semibold">iMac 24" M1</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-card rounded-lg border border-border p-8">
            <h2 className="text-3xl font-bold font-apple text-center mb-8">
              Почему стоит воспользоваться подбором
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl">💰</span>
                </div>
                <h3 className="font-semibold mb-3">Экономия денег</h3>
                <p className="text-apple-gray">
                  Не переплачиваете за ненужные функции и не покупаете слабую технику
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl">⏰</span>
                </div>
                <h3 className="font-semibold mb-3">Экономия времени</h3>
                <p className="text-apple-gray">
                  Не нужно изучать характеристики и сравнивать модели самостоятельно
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl">🎯</span>
                </div>
                <h3 className="font-semibold mb-3">Точное попадание</h3>
                <p className="text-apple-gray">
                  Получаете именно то, что нужно для ваших задач и бюджета
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Selection;
