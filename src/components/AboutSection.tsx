import { ShieldCheck, Award, Handshake, HeartHandshake } from "lucide-react";

const AboutSection = () => {
  return (
    <section className="py-20 bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6">Обо мне</h2>
            <div className="space-y-4 text-lg text-muted-foreground">
              <p>
                Меня зовут <span className="font-semibold text-foreground">Роман</span>, я уже более 
                <span className="font-semibold text-primary"> 6 лет</span> занимаюсь подбором и продажей 
                подержанной техники Apple.
              </p>
              <p>
                Я продаю технику с минимальным пробегом в отличном состоянии. 
                Все аппараты тщательно тестируются перед продажей.
              </p>
              <p>
                Помогу подобрать для вас подходящее устройство под ваши задачи и бюджет.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center p-6 bg-background rounded-lg border border-border">
              <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Безупречный внешний вид</h3>
              <p className="text-sm text-muted-foreground">Без следов эксплуатации</p>
            </div>
            
            <div className="text-center p-6 bg-background rounded-lg border border-border">
              <Award className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Идеальное состояние</h3>
              <p className="text-sm text-muted-foreground">Техническая исправность</p>
            </div>
            
            <div className="text-center p-6 bg-background rounded-lg border border-border">
              <Handshake className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Гарантия</h3>
              <p className="text-sm text-muted-foreground">1 месяц на все устройства</p>
            </div>
            
            <div className="text-center p-6 bg-background rounded-lg border border-border">
              <HeartHandshake className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Личный подход</h3>
              <p className="text-sm text-muted-foreground">Индивидуальная консультация</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;