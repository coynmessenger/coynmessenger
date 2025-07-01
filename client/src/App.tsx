import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { lazy, Suspense } from "react";

// Lazy load heavy components for better initial load performance
const HomePage = lazy(() => import("@/pages/home"));
const MessengerPage = lazy(() => import("@/pages/messenger"));
const MarketplacePage = lazy(() => import("@/pages/marketplace"));
const ProductPage = lazy(() => import("@/pages/product"));
const FavoritesPage = lazy(() => import("@/pages/favorites"));
const PurchaseHistoryPage = lazy(() => import("@/pages/purchase-history"));
const NotFound = lazy(() => import("@/pages/not-found"));

function Router() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>}>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/messenger" component={MessengerPage} />
        <Route path="/marketplace" component={MarketplacePage} />
        <Route path="/product/:asin" component={ProductPage} />
        <Route path="/favorites" component={FavoritesPage} />
        <Route path="/purchase-history" component={PurchaseHistoryPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="coyn-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
