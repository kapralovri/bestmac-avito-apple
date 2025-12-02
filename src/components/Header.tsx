import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import logo from "@/assets/logo.png";

const Header = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { path: "/buy", label: "В продаже" },
    { path: "/sell", label: "Выкуп" },
    { path: "/selection", label: "Подбор" },
    { path: "/business", label: "Для юр.лиц" }
  ];

  return (
    <motion.header 
      className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-50"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <motion.div 
            className="flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <Link to="/">
              <img src={logo} alt="BestMac logo" className="w-8 h-8" />
            </Link>
            <Link to="/">
              <div>
                <h1 className="text-xl font-bold font-apple">BestMac</h1>
                <p className="text-xs text-apple-gray">THE</p>
              </div>
            </Link>
          </motion.div>
          
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <motion.div
                key={item.path}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link 
                  to={item.path}
                  className={`transition-colors duration-300 ${
                    location.pathname === item.path 
                      ? 'text-primary font-semibold' 
                      : 'text-foreground hover:text-primary'
                  }`}
                >
                  {item.label}
                </Link>
              </motion.div>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            <motion.a 
              href="tel:+79032990029" 
              className="hidden sm:flex items-center space-x-2 text-foreground hover:text-primary transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Phone className="w-4 h-4" />
              <span>+7 903 299 00 29</span>
            </motion.a>
            <motion.div
              className="hidden md:block"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button variant="default" className="bg-gradient-primary hover:opacity-90">
                <Link to="/contact" className="text-inherit no-underline">
                  Оставить заявку
                </Link>
              </Button>
            </motion.div>
            
            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border"
            >
              <nav className="flex flex-col space-y-4 p-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`transition-colors duration-300 py-2 ${
                      location.pathname === item.path
                        ? 'text-primary font-semibold'
                        : 'text-foreground hover:text-primary'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                <Button variant="default" className="bg-gradient-primary hover:opacity-90 w-full">
                  <Link to="/contact" className="text-inherit no-underline" onClick={() => setIsMobileMenuOpen(false)}>
                    Оставить заявку
                  </Link>
                </Button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
};

export default Header;