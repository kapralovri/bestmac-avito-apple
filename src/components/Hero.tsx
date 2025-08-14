import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, FileText, Truck, RefreshCw } from "lucide-react";
import heroImage from "@/assets/hero-apple-devices.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center">
      <div className="absolute inset-0 bg-gradient-hero" />
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="max-w-3xl">
          <h1 className="text-5xl md:text-7xl font-bold font-apple mb-8 leading-tight">
            Купите{" "}
            <span className="text-transparent bg-clip-text bg-gradient-primary">
              iMac и MacBook
            </span>
            <br />
            в Москве выгодно
          </h1>
          
          <p className="text-xl text-apple-gray-light mb-12 leading-relaxed">
            Продажа подержанной техники Apple с гарантией 1 месяц. 
            Проверка перед покупкой, полный комплект документов, доставка по всей России.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <Button 
              size="lg" 
              className="bg-gradient-primary hover:opacity-90 shadow-elegant px-8 py-4 text-lg"
            >
              Смотреть каталог
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-border hover:bg-secondary px-8 py-4 text-lg"
            >
              Продать технику
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Shield,
                title: "Гарантия 1 месяц",
                description: "Проверка перед покупкой"
              },
              {
                icon: FileText,
                title: "Через ИП без НДС",
                description: "Полный комплект документов"
              },
              {
                icon: Truck,
                title: "Доставка",
                description: "По городу и регионам"
              },
              {
                icon: RefreshCw,
                title: "Выкуп и обмен",
                description: "На выгодных условиях"
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 hover:bg-card/80 transition-all duration-300"
              >
                <feature.icon className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-apple-gray">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;