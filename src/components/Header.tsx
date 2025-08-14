import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";

const Header = () => {
  return (
    <header className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div>
              <h1 className="text-xl font-bold font-apple">BestMac</h1>
              <p className="text-xs text-apple-gray">THE</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#buy" className="text-foreground hover:text-primary transition-colors">
              Хочу купить
            </a>
            <a href="#sell" className="text-foreground hover:text-primary transition-colors">
              Хочу продать
            </a>
            <a href="#catalog" className="text-foreground hover:text-primary transition-colors">
              Подбор
            </a>
            <a href="#business" className="text-foreground hover:text-primary transition-colors">
              Для юр.лиц
            </a>
          </nav>

          <div className="flex items-center space-x-4">
            <a 
              href="tel:+79032990029" 
              className="hidden sm:flex items-center space-x-2 text-foreground hover:text-primary transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>+7 903 299 00 29</span>
            </a>
            <Button variant="default" className="bg-gradient-primary hover:opacity-90">
              Оставить заявку
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;