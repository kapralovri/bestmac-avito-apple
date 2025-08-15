import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageCircle, 
  Phone, 
  Mail, 
  MapPin, 
  Clock,
  Send,
  CheckCircle
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    subject: "",
    message: "",
    preferredContact: ""
  });

  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Here would be integration with Telegram Bot API
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsSubmitted(true);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setIsSubmitted(false);
        setFormData({
          name: "",
          phone: "",
          email: "",
          subject: "",
          message: "",
          preferredContact: ""
        });
      }, 3000);
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
              Связаться с нами
            </h1>
            <p className="text-xl text-apple-gray max-w-3xl mx-auto mb-8">
              Есть вопросы о покупке или продаже техники Apple? Хотите получить персональную консультацию? 
              Мы всегда готовы помочь и ответить на все ваши вопросы.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <Card className="bg-card border-border shadow-elegant">
              <CardHeader>
                <CardTitle className="text-2xl font-apple flex items-center">
                  <MessageCircle className="w-6 h-6 mr-2 text-primary" />
                  Оставить заявку
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isSubmitted ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 text-apple-green mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Сообщение отправлено!</h3>
                    <p className="text-apple-gray">
                      Мы получили вашу заявку и свяжемся с вами в ближайшее время.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Имя *</Label>
                      <Input 
                        id="name"
                        placeholder="Ваше имя"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Телефон *</Label>
                      <Input 
                        id="phone"
                        placeholder="+7 (999) 123-45-67"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>

                    <div>
                      <Label htmlFor="subject">Тема обращения</Label>
                      <Select value={formData.subject} onValueChange={(value) => setFormData({...formData, subject: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите тему" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="buy">Покупка техники</SelectItem>
                          <SelectItem value="sell">Продажа техники</SelectItem>
                          <SelectItem value="selection">Подбор устройства</SelectItem>
                          <SelectItem value="business">Корпоративные закупки</SelectItem>
                          <SelectItem value="support">Техническая поддержка</SelectItem>
                          <SelectItem value="other">Другое</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="preferredContact">Предпочтительный способ связи</Label>
                      <Select value={formData.preferredContact} onValueChange={(value) => setFormData({...formData, preferredContact: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Как с вами связаться?" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="phone">Телефонный звонок</SelectItem>
                          <SelectItem value="telegram">Telegram</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="message">Сообщение *</Label>
                      <Textarea 
                        id="message"
                        placeholder="Опишите ваш вопрос или требования..."
                        value={formData.message}
                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                        rows={4}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90">
                      Отправить сообщение
                      <Send className="ml-2 w-4 h-4" />
                    </Button>

                    <p className="text-xs text-apple-gray text-center">
                      * Обязательные поля для заполнения
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Contact Information */}
            <div className="space-y-8">
              {/* Contact Methods */}
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-6">Контактная информация</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                        <Phone className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">Телефон</p>
                        <a href="tel:+79032990029" className="text-primary hover:underline">
                          +7 903 299 00 29
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">Telegram</p>
                        <a href="https://t.me/Romanmanro" className="text-primary hover:underline">
                          @bestmac_ru
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                        <Mail className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">Email</p>
                        <a href="mailto:info@bestmac.ru" className="text-primary hover:underline">
                          info@bestmac.ru
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">Адрес</p>
                        <p className="text-apple-gray">г. Москва</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Working Hours */}
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-6 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-primary" />
                    Время работы
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Понедельник - Пятница</span>
                      <span className="font-medium">10:00 - 20:00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Суббота - Воскресенье</span>
                      <span className="font-medium">11:00 - 19:00</span>
                    </div>
                  </div>
                  <p className="text-sm text-apple-gray mt-4">
                    Консультации по телефону и в мессенджерах доступны ежедневно с 9:00 до 22:00
                  </p>
                </CardContent>
              </Card>

              {/* Quick Responses */}
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-6">Быстрые ответы</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-apple-light-gray rounded-lg">
                      <p className="font-medium text-sm">Время ответа на заявки</p>
                      <p className="text-apple-gray text-sm">В течение 30 минут в рабочее время</p>
                    </div>
                    <div className="p-3 bg-apple-light-gray rounded-lg">
                      <p className="font-medium text-sm">Консультации</p>
                      <p className="text-apple-gray text-sm">Бесплатно по всем вопросам</p>
                    </div>
                    <div className="p-3 bg-apple-light-gray rounded-lg">
                      <p className="font-medium text-sm">Выезд на осмотр</p>
                      <p className="text-apple-gray text-sm">По Москве в течение дня</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-16">
            <h2 className="text-3xl font-bold font-apple text-center mb-12">
              Часто задаваемые вопросы
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3">Как быстро вы отвечаете на заявки?</h3>
                  <p className="text-apple-gray text-sm">
                    Мы отвечаем на все заявки в течение 30 минут в рабочее время. 
                    В выходные дни - в течение 2-3 часов.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3">Можно ли посмотреть технику перед покупкой?</h3>
                  <p className="text-apple-gray text-sm">
                    Конечно! Мы организуем встречу в удобном для вас месте или 
                    вы можете приехать к нам для осмотра техники.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3">Какие документы вы предоставляете?</h3>
                  <p className="text-apple-gray text-sm">
                    При покупке выдаем договор купли-продажи, чек, гарантийный талон. 
                    Для юридических лиц - полный пакет документов.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3">Есть ли доставка?</h3>
                  <p className="text-apple-gray text-sm">
                    Да, доставляем по Москве в день покупки. 
                    В регионы отправляем транспортными компаниями.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Contact;