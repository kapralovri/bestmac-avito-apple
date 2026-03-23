import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

const Header = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { path: "/buy", label: "В продаже" },
    { path: "/sell", label: "Выкуп" },
    { path: "/selection", label: "Подбор" },
    { path: "/service", label: "Сервис" },
    { path: "/blog", label: "Блог" },
    { path: "/business", label: "Для юр.лиц" },
  ];

  return (
    <header className="bg-background/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50">
      <div className="apple-container-wide">
        <div className="flex items-center justify-between h-12">
          <Link to="/" className="text-xl font-semibold tracking-tight text-foreground hover:opacity-80 transition-opacity">
            BestMac
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-xs transition-opacity ${
                  location.pathname === item.path
                    ? "text-foreground opacity-100"
                    : "text-muted-foreground hover:text-foreground opacity-80 hover:opacity-100"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <a
              href="tel:+79032990029"
              className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Phone className="w-3 h-3" />
              <span>+7 903 299 00 29</span>
            </a>
            <Link to="/contact" className="hidden md:block">
              <Button size="sm" className="h-7 text-xs rounded-full px-4 bg-primary hover:bg-primary/90">
                Связаться
              </Button>
            </Link>

            <button
              className="md:hidden p-1.5"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border/50"
            >
              <nav className="flex flex-col gap-1 py-3">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`py-2 px-2 rounded-lg text-sm transition-colors ${
                      location.pathname === item.path
                        ? "text-primary bg-primary/5"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link to="/contact" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button size="sm" className="w-full mt-2 rounded-full bg-primary hover:bg-primary/90">
                    Связаться
                  </Button>
                </Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default Header;
