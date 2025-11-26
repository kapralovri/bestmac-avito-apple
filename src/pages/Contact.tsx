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
import { sendEmail } from "@/services/email";
import SEOHead from "@/components/SEOHead";
import { organizationSchema } from "@/lib/schema";
import Breadcrumbs from "@/components/Breadcrumbs";
import ContactMap from "@/components/ContactMap";
import { trackFormSubmit, trackContactClick } from "@/components/Analytics";

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

  const breadcrumbItems = [
    { name: "Главная", url: "/" },
    { name: "Контакты", url: "/contact" }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendEmail({ form: "contact", ...formData });
      trackFormSubmit('contact');
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
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead 
        title="Контакты BestMac — связаться с нами в Москве | BestMac"
        description="Свяжитесь с BestMac в Москве: телефон +7 (903) 299-00-29, адрес ул. Дениса Давыдова 3 (м. Киевская, Дорогомилово). График: Пн-Пт 10:00-20:00, Сб-Вс 11:00-18:00. Telegram @romanmanro. Форма обратной связи, карта проезда, способы оплаты."
        canonical="/contact"
        keywords="контакты bestmac, адрес bestmac, телефон bestmac москва, связаться с bestmac"
        schema={organizationSchema}
      />
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={breadcrumbItems} />
        
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold font-apple mb-6">
            Связаться с нами
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Есть вопросы о покупке или продаже техники Apple? Хотите получить персональную консультацию? 
            Мы всегда готовы помочь и ответить на все ваши вопросы.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center">
                <MessageCircle className="w-6 h-6 mr-2 text-primary" />
                Оставить заявку
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isSubmitted ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Сообщение отправлено!</h3>
                  <p className="text-muted-foreground">
                    Мы получили вашу заявку и свяжемся с вами в ближайшее время.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        type="tel"
                        placeholder="+7 (999) 123-45-67"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        required
                      />
                    </div>
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
                    <Label htmlFor="subject">Тема</Label>
                    <Select 
                      value={formData.subject} 
                      onValueChange={(value) => setFormData({...formData, subject: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тему обращения" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Покупка техники">Покупка техники</SelectItem>
                        <SelectItem value="Продажа техники">Продажа техники</SelectItem>
                        <SelectItem value="Подбор техники">Подбор техники</SelectItem>
                        <SelectItem value="Корпоративные закупки">Корпоративные закупки</SelectItem>
                        <SelectItem value="Техническая поддержка">Техническая поддержка</SelectItem>
                        <SelectItem value="Другое">Другое</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="message">Сообщение *</Label>
                    <Textarea
                      id="message"
                      placeholder="Опишите ваш вопрос или задачу..."
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      rows={4}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="preferredContact">Предпочтительный способ связи</Label>
                    <Select 
                      value={formData.preferredContact} 
                      onValueChange={(value) => setFormData({...formData, preferredContact: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите способ связи" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Телефон">Телефон</SelectItem>
                        <SelectItem value="Email">Email</SelectItem>
                        <SelectItem value="Telegram">Telegram</SelectItem>
                        <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90">
                    Отправить сообщение
                    <Send className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Contact Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-bold">Контактная информация</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Телефон</p>
                    <a 
                      href="tel:+79032990029" 
                      className="text-primary hover:underline"
                      onClick={() => trackContactClick('phone')}
                    >
                      +7 (903) 299-00-29
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Email</p>
                    <a 
                      href="mailto:info@bestmac.ru" 
                      className="text-primary hover:underline"
                      onClick={() => trackContactClick('email')}
                    >
                      info@bestmac.ru
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <p className="font-medium">Адрес</p>
                    <p className="text-muted-foreground">
                      ул. Дениса Давыдова 3<br />
                      Москва, Дорогомилово, ЦАО<br />
                      м. Киевская
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Время работы</p>
                    <p className="text-muted-foreground">
                      Пн-Пт: 10:00 - 20:00<br />
                      Сб-Вс: 11:00 - 18:00
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-bold">Мессенджеры</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a 
                    href="https://t.me/romanmanro" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => trackContactClick('telegram')}
                  >
                    💬 Telegram: @romanmanro
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a 
                    href="https://wa.me/79032990029" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => trackContactClick('whatsapp')}
                  >
                    📱 WhatsApp: +7 (903) 299-00-29
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Map Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">Как нас найти</h2>
          <ContactMap />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
