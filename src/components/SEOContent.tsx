import { motion } from "framer-motion";
import { CheckCircle2, TrendingUp, Shield, Clock } from "lucide-react";

const SEOContent = () => {
  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Главный SEO блок */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Купить MacBook б/у в Москве — выгодно и безопасно
          </h2>
          <div className="prose prose-lg max-w-none text-muted-foreground">
            <p className="mb-4">
              BestMac — ваш надежный партнер в мире техники Apple. Мы специализируемся на продаже и выкупе MacBook, iMac, iPhone и другой продукции Apple в Москве. С 2018 года мы помогли тысячам клиентов найти идеальную технику по выгодной цене.
            </p>
            <p className="mb-4">
              Покупка б/у MacBook — это отличная возможность сэкономить до 50% от стоимости нового устройства, при этом получив полностью рабочую технику с гарантией. Все наши устройства проходят тщательную проверку на 35 параметров, включая состояние батареи, дисплея, клавиатуры и внутренних компонентов.
            </p>
          </div>
        </motion.div>

        {/* Преимущества */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >
          <h3 className="text-2xl md:text-3xl font-bold mb-8 text-center">
            Почему выбирают BestMac
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card p-6 rounded-xl border border-border">
              <Shield className="h-10 w-10 text-primary mb-4" />
              <h4 className="text-xl font-semibold mb-2">Гарантия качества</h4>
              <p className="text-muted-foreground">
                1 месяц гарантии на всю технику. Полная диагностика перед продажей.
              </p>
            </div>
            <div className="bg-card p-6 rounded-xl border border-border">
              <CheckCircle2 className="h-10 w-10 text-primary mb-4" />
              <h4 className="text-xl font-semibold mb-2">Проверенная техника</h4>
              <p className="text-muted-foreground">
                Каждое устройство проходит 35 проверок. Отчет о состоянии прилагается.
              </p>
            </div>
            <div className="bg-card p-6 rounded-xl border border-border">
              <TrendingUp className="h-10 w-10 text-primary mb-4" />
              <h4 className="text-xl font-semibold mb-2">Выгодные цены</h4>
              <p className="text-muted-foreground">
                Экономия до 50% от стоимости новой техники Apple в официальных магазинах.
              </p>
            </div>
            <div className="bg-card p-6 rounded-xl border border-border">
              <Clock className="h-10 w-10 text-primary mb-4" />
              <h4 className="text-xl font-semibold mb-2">Быстрая доставка</h4>
              <p className="text-muted-foreground">
                Доставка по Москве в день заказа. Отправка по России ТК.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Модели MacBook */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-16"
        >
          <h3 className="text-2xl md:text-3xl font-bold mb-6">
            Популярные модели MacBook в наличии
          </h3>
          <div className="prose prose-lg max-w-none text-muted-foreground">
            <h4 className="text-xl font-semibold text-foreground mb-3">MacBook Air — легкость и производительность</h4>
            <p className="mb-4">
              MacBook Air на чипах M1, M2 и M3 — идеальный выбор для учебы, работы и повседневных задач. Вес всего 1.29 кг, время работы до 18 часов, бесшумная работа без вентилятора. Отлично подходит для студентов, фрилансеров и офисной работы. Цены на б/у MacBook Air M1 начинаются от 45 000 рублей.
            </p>

            <h4 className="text-xl font-semibold text-foreground mb-3">MacBook Pro 13" — компактная мощность</h4>
            <p className="mb-4">
              MacBook Pro 13 дюймов — это профессиональная производительность в компактном корпусе. Процессоры M1 и M2 Pro обеспечивают высокую скорость работы в программах монтажа, дизайна и разработки. Touch Bar в старых моделях добавляет удобства. Цена б/у MacBook Pro 13" M1 — от 60 000 рублей.
            </p>

            <h4 className="text-xl font-semibold text-foreground mb-3">MacBook Pro 14" и 16" — для профессионалов</h4>
            <p className="mb-4">
              MacBook Pro 14 и 16 дюймов на чипах M1 Pro, M1 Max, M2 Pro, M2 Max, M3 Pro и M3 Max — топовые решения для видеомонтажа, 3D-графики, разработки и музыкального продакшена. Яркий Liquid Retina XDR дисплей (до 1600 нит), до 96 ГБ оперативной памяти, порты HDMI, SD-карты и три Thunderbolt 4. Стоимость б/у MacBook Pro 14" M1 Pro — от 120 000 рублей.
            </p>
          </div>
        </motion.div>

        {/* Выкуп техники */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-16"
        >
          <h3 className="text-2xl md:text-3xl font-bold mb-6">
            Выкуп MacBook в Москве — быстро и дорого
          </h3>
          <div className="prose prose-lg max-w-none text-muted-foreground">
            <p className="mb-4">
              Нужно продать MacBook срочно? Мы выкупаем технику Apple в любом состоянии: новую, б/у, с дефектами. Оценка за 30 минут, выезд специалиста на дом или встреча в нашем офисе в районе Дорогомилово. Наличный расчет сразу после осмотра.
            </p>
            <p className="mb-4">
              Принимаем: MacBook Air, MacBook Pro всех поколений (M1, M2, M3, M4, Intel), iMac 21.5" и 27", Mac Mini, Mac Studio. Также выкупаем iPhone всех моделей, iPad Pro, iPad Air, AirPods и другую технику Apple.
            </p>
            <p className="mb-4">
              Для оценки необходимо: указать модель, год выпуска, конфигурацию (процессор, RAM, SSD), состояние экрана и корпуса, наличие зарядки и коробки. Используйте наш онлайн-калькулятор для предварительной оценки стоимости выкупа MacBook.
            </p>
          </div>
        </motion.div>

        {/* Локальное SEO */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <h3 className="text-2xl md:text-3xl font-bold mb-6">
            Работаем в Москве с 2018 года
          </h3>
          <div className="prose prose-lg max-w-none text-muted-foreground">
            <p className="mb-4">
              Наш офис находится по адресу: <strong>Москва, улица Дениса Давыдова 3, район Дорогомилово</strong>. Работаем ежедневно с 10:00 до 23:00, без выходных. Удобная транспортная доступность — 5 минут пешком от метро Киевская.
            </p>
            <p className="mb-4">
              Обслуживаем все районы Москвы: ЦАО, САО, СВАО, ВАО, ЮВАО, ЮАО, ЮЗАО, ЗАО, СЗАО, а также Новую Москву. Доставка по Москве в пределах МКАД — бесплатно. Выезд специалиста для оценки техники — бесплатно.
            </p>
            <p>
              Контакты: телефон <a href="tel:+79032990029" className="text-primary hover:underline">+7 903 299-00-29</a>, Telegram <a href="https://t.me/romanmanro" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@romanmanro</a>. Работаем официально через ИП, предоставляем все документы: договор купли-продажи, чек, гарантийный талон.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SEOContent;