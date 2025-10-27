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
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            {/* Blog routes */}
            <Route path="/blog/kak-vybrat-macbook-2024" element={<KakVybratMacbook2024 />} />
            <Route path="/blog/proverka-macbook-pered-pokupkoi" element={<ProverkaMacbookPeredPokupkoi />} />
            <Route path="/blog/macbook-air-m2-vs-m3" element={<MacbookAirM2vsM3 />} />
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
