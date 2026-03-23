import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import SEOHead from "@/components/SEOHead";

const Privacy = () => {
  const breadcrumbItems = [
    { name: "Главная", url: "/" },
    { name: "Политика конфиденциальности", url: "/privacy" }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead 
        title="Политика конфиденциальности | BestMac"
        description="Политика конфиденциальности BestMac. Информация о сборе и обработке персональных данных пользователей."
        canonical="/privacy"
      />
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 mt-16">
        <Breadcrumbs items={breadcrumbItems} />
        <h1 className="text-3xl font-bold mb-8">Политика конфиденциальности</h1>
        
        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Общие положения</h2>
            <p className="text-muted-foreground">
              Настоящая Политика конфиденциальности регулирует порядок обработки и использования 
              персональных данных пользователей сайта BestMac.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Сбор персональных данных</h2>
            <p className="text-muted-foreground mb-4">
              Мы собираем следующие персональные данные:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Имя и фамилия</li>
              <li>Номер телефона</li>
              <li>Адрес электронной почты</li>
              <li>Информация об устройстве для продажи/покупки</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Цели обработки данных</h2>
            <p className="text-muted-foreground mb-4">
              Ваши персональные данные используются для:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Обработки заявок на покупку/продажу техники</li>
              <li>Связи с вами по поводу сделок</li>
              <li>Улучшения качества моих услуг</li>
              <li>Информирования о новых предложениях</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Передача данных третьим лицам</h2>
            <p className="text-muted-foreground">
              Мы не передаем ваши персональные данные третьим лицам без вашего согласия, 
              за исключением случаев, предусмотренных законодательством РФ.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Защита данных</h2>
            <p className="text-muted-foreground">
              Мы принимаем необходимые технические и организационные меры для защиты 
              ваших персональных данных от неправомерного доступа, изменения, раскрытия или уничтожения.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Ваши права</h2>
            <p className="text-muted-foreground mb-4">
              Вы имеете право:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Получать информацию о обработке ваших данных</li>
              <li>Требовать уточнения, блокирования или уничтожения данных</li>
              <li>Отзывать согласие на обработку данных</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Контактная информация</h2>
            <p className="text-muted-foreground">
              По всем вопросам, связанным с обработкой персональных данных, 
              вы можете обратиться к нам по телефону: +7 903 299 00 29
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Изменения в политике</h2>
            <p className="text-muted-foreground">
              Мы оставляем за собой право вносить изменения в настоящую Политику конфиденциальности. 
              Актуальная версия всегда доступна на нашем сайте.
            </p>
          </section>

          <p className="text-sm text-muted-foreground mt-8 pt-8 border-t border-border">
            Последнее обновление: {new Date().toLocaleDateString('ru-RU')}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;