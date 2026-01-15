import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { useEffect } from "react";
import Index from "./pages/Index";
import Buy from "./pages/Buy";
import Sell from "./pages/Sell";
import Selection from "./pages/Selection";
import Business from "./pages/Business";
import ProductDetail from "./pages/ProductDetail";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import KakVybratMacbook2024 from "./pages/blog/KakVybratMacbook2024";
import ProverkaMacbookPeredPokupkoi from "./pages/blog/ProverkaMacbookPeredPokupkoi";
import MacbookAirM2vsM3 from "./pages/blog/MacbookAirM2vsM3";
import KakProdatMacbookVygodno from "./pages/blog/KakProdatMacbookVygodno";
import MacbookM4Obzor from "./pages/blog/MacbookM4Obzor";
import MacbookVsWindows from "./pages/blog/MacbookVsWindows";
import MacbookBuPodvodnye from "./pages/blog/MacbookBuPodvodnye";
import MacbookDliaStudenta from "./pages/blog/MacbookDliaStudenta";
import MacbookApgreid from "./pages/blog/MacbookApgreid";
import MacbookAirM2Buy from "./pages/longtail/MacbookAirM2Buy";
import MacbookBrokenScreen from "./pages/longtail/MacbookBrokenScreen";
import MacbookPro14M3 from "./pages/longtail/MacbookPro14M3";
import MacbookPro16M3Max from "./pages/longtail/MacbookPro16M3Max";
import MacbookAirM3Students from "./pages/longtail/MacbookAirM3Students";
import Comparison from "./pages/Comparison";
import Pickup from "./pages/Pickup";
import Service from "./pages/Service";
import { initAnalytics } from "./components/Analytics";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/buy" element={<Buy />} />
            <Route path="/sell" element={<Sell />} />
            <Route path="/selection" element={<Selection />} />
            <Route path="/business" element={<Business />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/pickup" element={<Pickup />} />
            <Route path="/service" element={<Service />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            {/* Blog routes */}
            <Route path="/blog/kak-vybrat-macbook-2024" element={<KakVybratMacbook2024 />} />
            <Route path="/blog/proverka-macbook-pered-pokupkoi" element={<ProverkaMacbookPeredPokupkoi />} />
            <Route path="/blog/macbook-air-m2-vs-m3" element={<MacbookAirM2vsM3 />} />
            <Route path="/blog/kak-prodat-macbook-vygodno" element={<KakProdatMacbookVygodno />} />
            <Route path="/blog/macbook-m4-obzor" element={<MacbookM4Obzor />} />
            <Route path="/blog/macbook-vs-windows" element={<MacbookVsWindows />} />
            <Route path="/blog/macbook-bu-podvodnye" element={<MacbookBuPodvodnye />} />
            <Route path="/blog/macbook-dlia-studenta" element={<MacbookDliaStudenta />} />
            <Route path="/blog/macbook-apgreid" element={<MacbookApgreid />} />
            {/* Long-tail landing pages */}
            <Route path="/buy/macbook-air-m2-16gb" element={<MacbookAirM2Buy />} />
            <Route path="/sell/macbook-broken-screen" element={<MacbookBrokenScreen />} />
            <Route path="/buy/macbook-pro-14-m3" element={<MacbookPro14M3 />} />
            <Route path="/buy/macbook-pro-16-m3-max" element={<MacbookPro16M3Max />} />
            <Route path="/buy/macbook-air-m3-students" element={<MacbookAirM3Students />} />
            <Route path="/comparison" element={<Comparison />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
  );
};

export default App;
