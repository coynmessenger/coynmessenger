import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { initializeGlobalWebRTC } from "@/lib/global-webrtc";
import { useEffect } from "react";
import HomePage from "@/pages/home";
import MessengerPage from "@/pages/messenger";
import MarketplacePage from "@/pages/marketplace";
import ProductPage from "@/pages/product";
import FavoritesPage from "@/pages/favorites";
import PurchaseHistoryPage from "@/pages/purchase-history";

import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/messenger" component={MessengerPage} />
      <Route path="/marketplace" component={MarketplacePage} />
      <Route path="/product/:asin" component={ProductPage} />
      <Route path="/favorites" component={FavoritesPage} />
      <Route path="/purchase-history" component={PurchaseHistoryPage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // GLOBAL WebRTC INITIALIZATION: Initialize WebRTC for any authenticated user
  useEffect(() => {
    let isInitializing = false;
    
    const initGlobalWebRTC = async () => {
      if (isInitializing) return; // Prevent multiple simultaneous initializations
      
      try {
        isInitializing = true;
        const storedUser = localStorage.getItem('connectedUser');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          const userId = parsedUser.id;
          
          if (userId) {
            await initializeGlobalWebRTC(userId.toString(), 1); // Reduce retries to 1
          }
        }
      } catch (error) {
        console.log('WebRTC initialization failed:', error);
      } finally {
        isInitializing = false;
      }
    };
    
    // Initialize on app load only once
    initGlobalWebRTC();
    
    // Remove storage listener to prevent reinitializations that cause loops
    
  }, []);

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
