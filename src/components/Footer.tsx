import { Link } from "react-router-dom";
import { MapPin, Phone, Mail } from "lucide-react";
import { trackContactClick } from "@/components/Analytics";
import { POPULAR_MODELS, modelShortName } from "@/lib/model-slugs";

const Footer = () => {
  return (
    <footer className="bg-background border-t border-border/50">
      <div className="apple-container-wide py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <p className="text-base font-semibold text-foreground mb-3">BestMac</p>
            <p className="text-sm text-muted-foreground mb-4 max-w-md leading-relaxed">
              Надежный партнер в мире техники Apple. Продаем качественные устройства с гарантией и полным сервисом поддержки.
            </p>

            <div itemScope itemType="https://schema.org/Organization" className="space-y-2 text-sm text-muted-foreground">
              <p><span itemProp="name">BestMac</span> | ИП Капралов Р.И. | ИНН: 774385099608</p>
              <div itemProp="address" itemScope itemType="https://schema.org/PostalAddress" className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <p>
                  <span itemProp="streetAddress">ул. Дениса Давыдова 3</span>,
                  <span itemProp="addressLocality"> Москва</span>, Дорогомилово, ЦАО, м. Киевская
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" />
                <a href="tel:+79032990029" itemProp="telephone" className="text-primary hover:underline" onClick={() => trackContactClick('phone')}>
                  +7 (903) 299-00-29
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" />
                <a href="mailto:info@bestmac.ru" itemProp="email" className="text-primary hover:underline" onClick={() => trackContactClick('email')}>
                  info@bestmac.ru
                </a>
              </div>
              <p>
                <a href="https://t.me/romanmanro" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={() => trackContactClick('telegram')}>
                  Telegram: @romanmanro
                </a>
              </p>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Услуги</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/buy" className="hover:text-foreground transition-colors">Купить технику</Link></li>
              <li><Link to="/sell" className="hover:text-foreground transition-colors">Продать технику</Link></li>
              <li><Link to="/selection" className="hover:text-foreground transition-colors">Подбор техники</Link></li>
              <li><Link to="/pickup" className="hover:text-foreground transition-colors">Самовывоз</Link></li>
              <li><Link to="/business" className="hover:text-foreground transition-colors">Для бизнеса</Link></li>
            </ul>
          </div>

          {/* Popular models */}
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Популярные модели</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {POPULAR_MODELS.slice(0, 7).map(m => (
                <li key={m.slug}>
                  <Link to={`/sell/${m.slug}`} className="hover:text-foreground transition-colors">
                    {modelShortName(m.name)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border/50 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} BestMac. Все права защищены.
          </p>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Конфиденциальность</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Условия</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
