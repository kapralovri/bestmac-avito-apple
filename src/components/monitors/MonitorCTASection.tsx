import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, MapPin, Ban } from "lucide-react";

interface MonitorCTASectionProps {
  title: string;
  subtitle?: string;
}

const MonitorCTASection = ({ title, subtitle }: MonitorCTASectionProps) => {
  return (
    <section className="bg-gradient-primary rounded-lg p-8 text-white mb-12">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold mb-3">{title}</h2>
        {subtitle && <p className="mb-6 opacity-90">{subtitle}</p>}

        <div className="flex flex-wrap gap-4 mb-6">
          <Button asChild size="lg" variant="secondary">
            <a href="tel:+79032990029">
              <Phone className="mr-2 h-4 w-4" />
              +7 (903) 299-00-29
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="bg-white text-primary hover:bg-white/90">
            <a href="https://t.me/romanmanro" target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" />
              Написать в Telegram
            </a>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm opacity-90">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span>Самовывоз: Москва, м. Киевская, ул. Дениса Давыдова 3</span>
          </div>
          <div className="flex items-center gap-2">
            <Ban className="h-4 w-4 flex-shrink-0" />
            <span>Доставки нет — оплата и проверка при получении</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MonitorCTASection;
