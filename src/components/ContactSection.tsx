import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

const ContactSection = () => {
  return (
    <section className="py-20 bg-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold font-apple mb-6">
            Свяжитесь с нами
          </h2>
          <p className="text-xl text-apple-gray max-w-2xl mx-auto">
            Готовы ответить на все ваши вопросы и помочь с выбором техники Apple
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Контактная информация */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-semibold mb-6">Наши контакты</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Телефон</p>
                    <a href="tel:+79032990029" className="text-primary hover:underline">
                      +7 903 299 00 29
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Email</p>
                    <a href="mailto:info@bestmac.ru" className="text-primary hover:underline">
                      info@bestmac.ru
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Адрес</p>
                    <p className="text-apple-gray">Москва, доставка по всему городу</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Режим работы</p>
                    <p className="text-apple-gray">Пн-Пт: 10:00-20:00<br />Сб-Вс: 11:00-18:00</p>
                  </div>
                </div>
              </div>
            </div>

            <Card className="bg-gradient-primary text-white border-0">
              <CardContent className="p-6">
                <h4 className="text-xl font-semibold mb-4">Наши преимущества</h4>
                <ul className="space-y-3 text-sm">
                  <li>✓ Гарантия 1 месяц на всю технику</li>
                  <li>✓ Проверка устройств перед продажей</li>
                  <li>✓ Работаем как ИП без НДС</li>
                  <li>✓ Выкуп техники по выгодным ценам</li>
                  <li>✓ Доставка по Москве и регионам</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Форма обратной связи */}
          <Card className="shadow-card">
            <CardContent className="p-8">
              <h3 className="text-2xl font-semibold mb-6">Оставить заявку</h3>
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Имя *</label>
                    <Input placeholder="Ваше имя" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Телефон *</label>
                    <Input placeholder="+7 (___) ___-__-__" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input type="email" placeholder="your@email.com" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Тип обращения</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип обращения" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buy">Хочу купить</SelectItem>
                      <SelectItem value="sell">Хочу продать</SelectItem>
                      <SelectItem value="trade">Обмен</SelectItem>
                      <SelectItem value="consultation">Консультация</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Сообщение</label>
                  <Textarea 
                    placeholder="Расскажите, что вас интересует..."
                    rows={4}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-primary hover:opacity-90 py-3"
                  size="lg"
                >
                  Отправить заявку
                </Button>
                
                <p className="text-xs text-apple-gray text-center">
                  Нажимая кнопку, вы соглашаетесь с обработкой персональных данных
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;