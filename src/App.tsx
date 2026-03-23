import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { initAnalytics } from "./components/Analytics";
import CookieBanner from "./components/CookieBanner";
import ErrorBoundary from "./components/ErrorBoundary";

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
const MoskvaIndex = lazy(() => import("./pages/geo/MoskvaIndex"));
const GeoKievskaya = lazy(() => import("./pages/geo/Kievskaya"));
const GeoDorogomilovo = lazy(() => import("./pages/geo/Dorogomilovo"));
const GeoArbat = lazy(() => import("./pages/geo/Arbat"));
const GeoHamovniki = lazy(() => import("./pages/geo/Hamovniki"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 * 5 },
  },
});

// Loading component — inline styles чтобы работало даже если Tailwind CSS ещё не загрузился
const PageLoader = () => (
  <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 48, height: 48, border: '2px solid transparent', borderBottomColor: '#0071e3', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// Обёртка для lazy-маршрутов с собственным ErrorBoundary
const SafeRoute = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      {children}
    </Suspense>
  </ErrorBoundary>
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
          <CookieBanner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<SafeRoute><Index /></SafeRoute>} />
              <Route path="/buy" element={<SafeRoute><Buy /></SafeRoute>} />
              <Route path="/sell" element={<SafeRoute><Sell /></SafeRoute>} />
              <Route path="/selection" element={<SafeRoute><Selection /></SafeRoute>} />
              <Route path="/business" element={<SafeRoute><Business /></SafeRoute>} />
              <Route path="/product/:id" element={<SafeRoute><ProductDetail /></SafeRoute>} />
              <Route path="/contact" element={<SafeRoute><Contact /></SafeRoute>} />
              <Route path="/pickup" element={<SafeRoute><Pickup /></SafeRoute>} />
              <Route path="/service" element={<SafeRoute><Service /></SafeRoute>} />
              <Route path="/sell/imac" element={<SafeRoute><SellImac /></SafeRoute>} />
              <Route path="/sell/mac-pro" element={<SafeRoute><SellMacPro /></SafeRoute>} />
              <Route path="/sell/mac-mini" element={<SafeRoute><SellMacMini /></SafeRoute>} />
              <Route path="/sell/macbook-pro" element={<SafeRoute><SellSeries series="pro" /></SafeRoute>} />
              <Route path="/sell/macbook-air" element={<SafeRoute><SellSeries series="air" /></SafeRoute>} />
              <Route path="/sell/broken" element={<SafeRoute><SellBroken /></SafeRoute>} />
              <Route path="/sell/:model_slug" element={<SafeRoute><SellModel /></SafeRoute>} />
              <Route path="/privacy" element={<SafeRoute><Privacy /></SafeRoute>} />
              <Route path="/terms" element={<SafeRoute><Terms /></SafeRoute>} />
              {/* Blog routes */}
              <Route path="/blog" element={<SafeRoute><BlogIndex /></SafeRoute>} />
              <Route path="/blog/kak-vybrat-macbook-2024" element={<SafeRoute><KakVybratMacbook2024 /></SafeRoute>} />
              <Route path="/blog/proverka-macbook-pered-pokupkoi" element={<SafeRoute><ProverkaMacbookPeredPokupkoi /></SafeRoute>} />
              <Route path="/blog/macbook-air-m2-vs-m3" element={<SafeRoute><MacbookAirM2vsM3 /></SafeRoute>} />
              <Route path="/blog/kak-prodat-macbook-vygodno" element={<SafeRoute><KakProdatMacbookVygodno /></SafeRoute>} />
              <Route path="/blog/macbook-m4-obzor" element={<SafeRoute><MacbookM4Obzor /></SafeRoute>} />
              <Route path="/blog/macbook-vs-windows" element={<SafeRoute><MacbookVsWindows /></SafeRoute>} />
              <Route path="/blog/macbook-bu-podvodnye" element={<SafeRoute><MacbookBuPodvodnye /></SafeRoute>} />
              <Route path="/blog/macbook-dlia-studenta" element={<SafeRoute><MacbookDliaStudenta /></SafeRoute>} />
              <Route path="/blog/macbook-apgreid" element={<SafeRoute><MacbookApgreid /></SafeRoute>} />
              {/* Long-tail landing pages */}
              <Route path="/buy/macbook-air-m2-16gb" element={<SafeRoute><MacbookAirM2Buy /></SafeRoute>} />
              <Route path="/sell/macbook-broken-screen" element={<SafeRoute><MacbookBrokenScreen /></SafeRoute>} />
              <Route path="/buy/macbook-pro-14-m3" element={<SafeRoute><MacbookPro14M3 /></SafeRoute>} />
              <Route path="/buy/macbook-pro-16-m3-max" element={<SafeRoute><MacbookPro16M3Max /></SafeRoute>} />
              <Route path="/buy/macbook-air-m3-students" element={<SafeRoute><MacbookAirM3Students /></SafeRoute>} />
              <Route path="/comparison" element={<SafeRoute><Comparison /></SafeRoute>} />
              {/* Geo landing pages */}
              <Route path="/moskva" element={<SafeRoute><MoskvaIndex /></SafeRoute>} />
              <Route path="/moskva/kievskaya" element={<SafeRoute><GeoKievskaya /></SafeRoute>} />
              <Route path="/moskva/dorogomilovo" element={<SafeRoute><GeoDorogomilovo /></SafeRoute>} />
              <Route path="/moskva/arbat" element={<SafeRoute><GeoArbat /></SafeRoute>} />
              <Route path="/moskva/hamovniki" element={<SafeRoute><GeoHamovniki /></SafeRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<SafeRoute><NotFound /></SafeRoute>} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
