import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { ThirdwebProvider, AutoConnect } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { createWallet } from "thirdweb/wallets";
import { initializeGlobalWebRTC } from "@/lib/global-webrtc";
import { useEffect } from "react";
import HomePage from "@/pages/home";
import MessengerPage from "@/pages/messenger";
import MarketplacePage from "@/pages/marketplace";
import ProductPage from "@/pages/product";
import FavoritesPage from "@/pages/favorites";
import PurchaseHistoryPage from "@/pages/purchase-history";

import NotFound from "@/pages/not-found";

// Create Thirdweb client for wallet connections
const client = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID!,
});

// Configure supported wallets for auto-reconnection
const wallets = [
  createWallet("walletConnect"),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("com.bitget.web3"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
  createWallet("com.trustwallet.app"),
];

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
      
      // Don't initialize WebRTC if user has explicitly signed out
      const userSignedOut = localStorage.getItem('userSignedOut') === 'true';
      if (userSignedOut) {
        console.log('🚫 Skipping WebRTC initialization - user signed out');
        return;
      }
      
      try {
        isInitializing = true;
        const storedUser = localStorage.getItem('connectedUser');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          const userId = parsedUser.id;
          
          if (userId) {
            console.log('🎯 Initializing WebRTC for authenticated user:', userId);
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

  // Check if user has explicitly signed out to prevent autoconnect
  const userSignedOut = typeof window !== 'undefined' && localStorage.getItem('userSignedOut') === 'true';

  return (
    <ThirdwebProvider>
      {/* AutoConnect component maintains wallet connection across all pages */}
      {!userSignedOut && (
        <AutoConnect
          client={client}
          wallets={wallets}
          timeout={15000}
        />
      )}
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="coyn-theme">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ThirdwebProvider>
  );
}

export default App;
