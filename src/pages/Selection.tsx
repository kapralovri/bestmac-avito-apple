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
import SEOHead from "@/components/SEOHead";
import { serviceSchema } from "@/lib/schema";
import Breadcrumbs from "@/components/Breadcrumbs";
import FAQ from "@/components/FAQ";
import { faqData } from "@/lib/schema";
import { trackFormSubmit } from "@/components/Analytics";
import MacbookQuiz from "@/components/MacbookQuiz";
import TopDevicesByRole from "@/components/TopDevicesByRole";

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

  const breadcrumbItems = [
    { name: "Главная", url: "/" },
    { name: "Подбор техники", url: "/selection" }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendEmail({ form: "selection", ...formData, budget: budget[0] });
      trackFormSubmit('selection');
      setIsSubmitted(true);
      setFormData(initialState);
      setBudget([100000]);
      setTimeout(() => setIsSubmitted(false), 3000);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead 
        title="Подбор техники Apple в Москве — персональные консультации | BestMac"
        description="Не знаете, какой MacBook, iMac или iPhone выбрать? Эксперты BestMac подберут технику Apple под ваши задачи и бюджет. Анализ потребностей, 2-3 варианта решений, консультация по телефону или в Telegram. Помощь с настройкой и обслуживанием."
        canonical="/selection"
        keywords="подбор техники apple, консультация macbook, выбор iphone, подбор imac москва"
        schema={serviceSchema({
          name: "Подбор техники Apple",
          description: "Персональная консультация и подбор техники Apple под задачи и бюджет",
          url: "https://bestmac.ru/selection"
        })}
      />
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={breadcrumbItems} />
        
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold font-apple mb-6">
            Подбор техники Apple
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Не знаете, какую технику Apple выбрать? Мы поможем подобрать идеальное решение 
            под ваши задачи и бюджет. Персональные консультации и рекомендации от экспертов.
          </p>
        </div>

        {/* MacBook Quiz */}
        <MacbookQuiz />

        {/* Top Devices by Role */}
        <TopDevicesByRole />

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
                  <p className="text-muted-foreground">
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
                  <p className="text-muted-foreground">
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
                  <p className="text-muted-foreground">
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
                  <h3 className="font-semibold mb-2">Поддержка</h3>
                  <p className="text-muted-foreground">
                    Помогаем с покупкой, настройкой и дальнейшим обслуживанием. 
                    Вы всегда можете обратиться к нам за советом.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-center">
                  Заявка на подбор
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isSubmitted ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 text-apple-green mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Заявка отправлена!</h3>
                    <p className="text-muted-foreground">
                      Мы получили вашу заявку и свяжемся с вами в ближайшее время.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <Label htmlFor="purpose">Для чего нужна техника?</Label>
                      <Select 
                        value={formData.purpose} 
                        onValueChange={(value) => setFormData({...formData, purpose: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите основное назначение" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Работа">Работа и офис</SelectItem>
                          <SelectItem value="Учеба">Учеба и образование</SelectItem>
                          <SelectItem value="Творчество">Творчество и дизайн</SelectItem>
                          <SelectItem value="Развлечения">Развлечения и игры</SelectItem>
                          <SelectItem value="Другое">Другое</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="devices">Какие устройства интересуют?</Label>
                      <Select 
                        value={formData.devices} 
                        onValueChange={(value) => setFormData({...formData, devices: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите тип устройств" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MacBook">MacBook (ноутбук)</SelectItem>
                          <SelectItem value="iMac">iMac (моноблок)</SelectItem>
                          <SelectItem value="iPhone">iPhone</SelectItem>
                          <SelectItem value="iPad">iPad</SelectItem>
                          <SelectItem value="Комплект">Комплект устройств</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="budget">Бюджет (₽)</Label>
                      <div className="space-y-2">
                        <Slider
                          value={budget}
                          onValueChange={setBudget}
                          max={500000}
                          min={50000}
                          step={10000}
                          className="w-full"
                        />
                        <p className="text-sm text-muted-foreground">
                          До {budget[0].toLocaleString()} ₽
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="features">Важные характеристики</Label>
                      <Textarea
                        id="features"
                        placeholder="Например: мощный процессор, большой экран, портативность..."
                        value={formData.features}
                        onChange={(e) => setFormData({...formData, features: e.target.value})}
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="timeline">Когда планируете покупку?</Label>
                      <Select 
                        value={formData.timeline} 
                        onValueChange={(value) => setFormData({...formData, timeline: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите сроки" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Срочно">Срочно (в течение недели)</SelectItem>
                          <SelectItem value="Месяц">В течение месяца</SelectItem>
                          <SelectItem value="Квартал">В течение квартала</SelectItem>
                          <SelectItem value="Планирую">Пока планирую</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="phone">Контактный телефон</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+7 (999) 123-45-67"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="additional">Дополнительная информация</Label>
                      <Textarea
                        id="additional"
                        placeholder="Любая дополнительная информация, которая поможет нам лучше понять ваши потребности..."
                        value={formData.additional}
                        onChange={(e) => setFormData({...formData, additional: e.target.value})}
                        rows={3}
                      />
                    </div>

                    <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90">
                      Отправить заявку
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ Section */}
        <FAQ items={faqData.selection} title="Часто задаваемые вопросы о подборе" />
      </main>

      <Footer />
    </div>
  );
};

export default Selection;
