import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { initAnalytics } from "./components/Analytics";

// Lazy-loaded pages
const Index = lazy(() => import("./pages/Index"));
const Buy = lazy(() => import("./pages/Buy"));
const Sell = lazy(() => import("./pages/Sell"));
const Selection = lazy(() => import("./pages/Selection"));
const Business = lazy(() => import("./pages/Business"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Contact = lazy(() => import("./pages/Contact"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BlogIndex = lazy(() => import("./pages/blog/BlogIndex"));
const SellImac = lazy(() => import("./pages/sell/SellImac"));
const SellMacPro = lazy(() => import("./pages/sell/SellMacPro"));
const SellMacMini = lazy(() => import("./pages/sell/SellMacMini"));
const SellSeries = lazy(() => import("./pages/sell/SellSeries"));
const SellBroken = lazy(() => import("./pages/sell/SellBroken"));
const KakVybratMacbook2024 = lazy(() => import("./pages/blog/KakVybratMacbook2024"));
const ProverkaMacbookPeredPokupkoi = lazy(() => import("./pages/blog/ProverkaMacbookPeredPokupkoi"));
const MacbookAirM2vsM3 = lazy(() => import("./pages/blog/MacbookAirM2vsM3"));
const KakProdatMacbookVygodno = lazy(() => import("./pages/blog/KakProdatMacbookVygodno"));
const MacbookM4Obzor = lazy(() => import("./pages/blog/MacbookM4Obzor"));
const MacbookVsWindows = lazy(() => import("./pages/blog/MacbookVsWindows"));
const MacbookBuPodvodnye = lazy(() => import("./pages/blog/MacbookBuPodvodnye"));
const MacbookDliaStudenta = lazy(() => import("./pages/blog/MacbookDliaStudenta"));
const MacbookApgreid = lazy(() => import("./pages/blog/MacbookApgreid"));
const MacbookAirM2Buy = lazy(() => import("./pages/longtail/MacbookAirM2Buy"));
const MacbookBrokenScreen = lazy(() => import("./pages/longtail/MacbookBrokenScreen"));
const MacbookPro14M3 = lazy(() => import("./pages/longtail/MacbookPro14M3"));
const MacbookPro16M3Max = lazy(() => import("./pages/longtail/MacbookPro16M3Max"));
const MacbookAirM3Students = lazy(() => import("./pages/longtail/MacbookAirM3Students"));
const Comparison = lazy(() => import("./pages/Comparison"));
const Pickup = lazy(() => import("./pages/Pickup"));
const Service = lazy(() => import("./pages/Service"));
const SellModel = lazy(() => import("./pages/SellModel"));

const queryClient = new QueryClient();

// Loading component
const PageLoader = () => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

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
            <Suspense fallback={<PageLoader />}>
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
                <Route path="/sell/imac" element={<SellImac />} />
                <Route path="/sell/mac-pro" element={<SellMacPro />} />
                <Route path="/sell/mac-mini" element={<SellMacMini />} />
                <Route path="/sell/macbook-pro" element={<SellSeries series="pro" />} />
                <Route path="/sell/macbook-air" element={<SellSeries series="air" />} />
                <Route path="/sell/broken" element={<SellBroken />} />
                <Route path="/sell/:model_slug" element={<SellModel />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                {/* Blog routes */}
                <Route path="/blog" element={<BlogIndex />} />
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
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
