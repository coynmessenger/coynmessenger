import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import HomePage from "@/pages/home";
import MessengerPage from "@/pages/messenger";
import MarketplacePage from "@/pages/marketplace";
import ProductPage from "@/pages/product";
import FavoritesPage from "@/pages/favorites";
import EscrowDashboard from "@/pages/escrow-dashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/messenger" component={MessengerPage} />
      <Route path="/marketplace" component={MarketplacePage} />
      <Route path="/product/:asin" component={ProductPage} />
      <Route path="/favorites" component={FavoritesPage} />
      <Route path="/escrow" component={EscrowDashboard} />
      <Route component={NotFound} />
    </Switch>
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
