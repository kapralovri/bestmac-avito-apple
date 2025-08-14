import { Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Логотип и описание */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <div>
                <h1 className="text-xl font-bold font-apple">BestMac</h1>
                <p className="text-xs text-apple-gray">THE</p>
              </div>
            </div>
            <p className="text-apple-gray mb-4 max-w-md">
              Надежный партнер в мире техники Apple. Продаем качественные устройства 
              с гарантией и полным сервисом поддержки.
            </p>
            <p className="text-sm text-apple-gray">
              ИП Иванов И.И. | ИНН: 123456789012
            </p>
          </div>
          
          {/* Услуги */}
          <div>
            <h3 className="font-semibold mb-4">Услуги</h3>
            <ul className="space-y-2 text-apple-gray">
              <li><a href="#" className="hover:text-primary transition-colors">Покупка техники</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Продажа техники</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Обмен устройств</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Доставка</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Гарантийное обслуживание</a></li>
            </ul>
          </div>
          
          {/* Категории */}
          <div>
            <h3 className="font-semibold mb-4">Категории</h3>
            <ul className="space-y-2 text-apple-gray">
              <li><a href="#" className="hover:text-primary transition-colors">MacBook</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">iMac</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">iPhone</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">iPad</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Аксессуары</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-apple-gray text-sm">
            © 2024 BestMac. Все права защищены.
          </p>
          <div className="flex items-center space-x-4 text-sm text-apple-gray mt-4 md:mt-0">
            <a href="#" className="hover:text-primary transition-colors">Политика конфиденциальности</a>
            <a href="#" className="hover:text-primary transition-colors">Условия использования</a>
          </div>
        </div>
        
        <div className="text-center mt-4">
          <p className="text-xs text-apple-gray flex items-center justify-center">
            Сделано с <Heart className="w-4 h-4 mx-1 text-red-500" fill="currentColor" /> для любителей Apple
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;