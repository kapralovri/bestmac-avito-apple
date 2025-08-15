import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 mt-16">
        <h1 className="text-3xl font-bold mb-8">Условия использования</h1>
        
        <div className="prose prose-lg max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Общие условия</h2>
            <p className="text-muted-foreground">
              Используя наш сайт и услуги, вы соглашаетесь с настоящими Условиями использования. 
              Если вы не согласны с какими-либо условиями, пожалуйста, не используйте наш сайт.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Описание услуг</h2>
            <p className="text-muted-foreground mb-4">
              BestMac предоставляет следующие услуги:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Продажа подержанной техники Apple</li>
              <li>Выкуп техники Apple</li>
              <li>Подбор устройств под ваши потребности</li>
              <li>Trade-in (обмен старого устройства на новое)</li>
              <li>Консультации по технике Apple</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Гарантийные обязательства</h2>
            <p className="text-muted-foreground mb-4">
              На всю продаваемую технику предоставляется гарантия сроком 1 месяц, которая покрывает:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Неисправности, не связанные с механическими повреждениями</li>
              <li>Скрытые дефекты, не выявленные при покупке</li>
              <li>Проблемы с программным обеспечением</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Условия покупки</h2>
            <p className="text-muted-foreground mb-4">
              При покупке техники:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Цены могут изменяться без предварительного уведомления</li>
              <li>Оплата производится наличными или переводом</li>
              <li>Доставка по Москве осуществляется в течение 1-2 дней</li>
              <li>Самовывоз возможен по предварительной договоренности</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Условия продажи</h2>
            <p className="text-muted-foreground mb-4">
              При продаже вашей техники:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Оценка производится после осмотра устройства</li>
              <li>Цена может отличаться от предварительной оценки</li>
              <li>Устройство должно быть разблокировано и отвязано от Apple ID</li>
              <li>При себе необходимо иметь документ, удостоверяющий личность</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Ответственность</h2>
            <p className="text-muted-foreground">
              Мы не несем ответственности за ущерб, возникший в результате неправильного 
              использования приобретенной техники. Наша ответственность ограничивается 
              стоимостью приобретенного устройства.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Возврат и обмен</h2>
            <p className="text-muted-foreground">
              Возврат техники возможен в течение 7 дней с момента покупки при обнаружении 
              скрытых дефектов или несоответствия заявленным характеристикам.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Интеллектуальная собственность</h2>
            <p className="text-muted-foreground">
              Все материалы на сайте защищены авторским правом. Использование материалов 
              без письменного разрешения запрещено.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Изменения условий</h2>
            <p className="text-muted-foreground">
              Мы оставляем за собой право изменять настоящие Условия использования. 
              Актуальная версия всегда доступна на нашем сайте.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Контактная информация</h2>
            <p className="text-muted-foreground">
              ИП Иванов И.И.<br />
              ИНН: 123456789012<br />
              Телефон: +7 903 299 00 29<br />
              По всем вопросам обращайтесь по указанному телефону.
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

export default Terms;