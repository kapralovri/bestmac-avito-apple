import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { motion } from "framer-motion";

const ContactSection = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut" as const
      }
    }
  };

  const contactInfo = [
    {
      icon: Phone,
      title: "Телефон",
      content: "+7 903 299 00 29",
      link: "tel:+79032990029",
      type: "phone"
    },
    {
      icon: Mail,
      title: "Email",
      content: "info@bestmac.ru",
      link: "mailto:info@bestmac.ru",
      type: "email"
    },
    {
      icon: MapPin,
      title: "Адрес",
      content: "Москва, доставка по всему городу",
      link: null,
      type: "address"
    },
    {
      icon: Clock,
      title: "Режим работы",
      content: "Пн-Пт: 10:00-20:00\nСб-Вс: 11:00-18:00",
      link: null,
      type: "schedule"
    },
    {
      icon: Phone,
      title: "Telegram",
      content: "@romanmanro",
      link: "https://t.me/romanmanro",
      type: "telegram"
    }
  ];

  return (
    <section className="py-20 bg-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-bold font-apple mb-6">
            Свяжитесь с нами
          </h2>
          <p className="text-xl text-apple-gray max-w-2xl mx-auto">
            Готовы ответить на все ваши вопросы и помочь с выбором техники Apple
          </p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-12"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Контактная информация */}
          <motion.div className="space-y-8" variants={itemVariants}>
            <div>
              <h3 className="text-2xl font-semibold mb-6">Мои контакты</h3>
              <div className="space-y-4">
                {contactInfo.map((contact, index) => (
                  <motion.div 
                    key={index}
                    className="flex items-center space-x-4"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ x: 5 }}
                  >
                    <motion.div 
                      className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <contact.icon className="w-6 h-6 text-primary" />
                    </motion.div>
                    <div>
                      <p className="font-medium">{contact.title}</p>
                      {contact.link ? (
                        <a 
                          href={contact.link} 
                          className="text-primary hover:underline transition-colors"
                        >
                          {contact.content}
                        </a>
                      ) : (
                        <p className="text-apple-gray whitespace-pre-line">{contact.content}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
            >
              <Card className="bg-gradient-primary text-white border-0">
                <CardContent className="p-6">
                  <h4 className="text-xl font-semibold mb-4">Мои преимущества</h4>
                  <ul className="space-y-3 text-sm">
                    <li>✓ Гарантия 1 месяц на всю технику</li>
                    <li>✓ Проверка устройств перед продажей</li>
                    <li>✓ Работаем как ИП без НДС</li>
                    <li>✓ Выкуп техники по выгодным ценам</li>
                    <li>✓ Доставка по Москве и регионам</li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Форма обратной связи */}
          <motion.div variants={itemVariants}>
            <Card className="shadow-card hover:shadow-elegant transition-all duration-300">
              <CardContent className="p-8">
                <h3 className="text-2xl font-semibold mb-6">Оставить заявку</h3>
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      viewport={{ once: true }}
                    >
                      <label className="block text-sm font-medium mb-2">Имя *</label>
                      <Input placeholder="Ваше имя" />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      viewport={{ once: true }}
                    >
                      <label className="block text-sm font-medium mb-2">Телефон *</label>
                      <Input placeholder="+7 (___) ___-__-__" />
                    </motion.div>
                  </div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    viewport={{ once: true }}
                  >
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <Input type="email" placeholder="your@email.com" />
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    viewport={{ once: true }}
                  >
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
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    viewport={{ once: true }}
                  >
                    <label className="block text-sm font-medium mb-2">Сообщение</label>
                    <Textarea 
                      placeholder="Расскажите, что вас интересует..."
                      rows={4}
                    />
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    viewport={{ once: true }}
                  >
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-primary hover:opacity-90 py-3"
                      size="lg"
                    >
                      Отправить заявку
                    </Button>
                  </motion.div>
                  
                  <motion.p 
                    className="text-xs text-apple-gray text-center"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                    viewport={{ once: true }}
                  >
                    Нажимая кнопку, вы соглашаетесь с обработкой персональных данных
                  </motion.p>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default ContactSection;