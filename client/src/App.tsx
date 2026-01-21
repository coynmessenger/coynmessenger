import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { ThirdwebProvider, AutoConnect } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { createWallet, walletConnect } from "thirdweb/wallets";
import { initializeGlobalWebRTC } from "@/lib/global-webrtc";
import { useEffect, lazy, Suspense } from "react";

import HomePage from "@/pages/home";
import NotFound from "@/pages/not-found";

const MessengerPage = lazy(() => import("@/pages/messenger"));
const MarketplacePage = lazy(() => import("@/pages/marketplace"));
const ProductPage = lazy(() => import("@/pages/product"));
const FavoritesPage = lazy(() => import("@/pages/favorites"));
const PurchaseHistoryPage = lazy(() => import("@/pages/purchase-history"));
const CallTestPage = lazy(() => import("@/pages/call-test"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-white/70 text-sm">Loading...</p>
      </div>
    </div>
  );
}

// Create Thirdweb client for wallet connections
const client = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID!,
});

// Configure supported wallets for auto-reconnection
const wallets = [
  walletConnect(), // WalletConnect for mobile wallet connections
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),  
  createWallet("com.bitget.web3"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
  createWallet("com.trustwallet.app"),
];

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/messenger" component={MessengerPage} />
        <Route path="/marketplace" component={MarketplacePage} />
        <Route path="/product/:asin" component={ProductPage} />
        <Route path="/favorites" component={FavoritesPage} />
        <Route path="/purchase-history" component={PurchaseHistoryPage} />
        <Route path="/call-test" component={CallTestPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  // GLOBAL WebRTC INITIALIZATION: Deferred to not block initial render
  useEffect(() => {
    let isInitializing = false;
    
    const initGlobalWebRTC = async () => {
      if (isInitializing) return;
      
      const userSignedOut = localStorage.getItem('userSignedOut') === 'true';
      if (userSignedOut) {
        return;
      }
      
      try {
        isInitializing = true;
        const storedUser = localStorage.getItem('connectedUser');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          const userId = parsedUser.id;
          
          if (userId) {
            await initializeGlobalWebRTC(userId.toString(), 1);
          }
        }
      } catch (error) {
        console.log('WebRTC initialization failed:', error);
      } finally {
        isInitializing = false;
      }
    };
    
    // Defer WebRTC initialization to allow page to render first
    const timeoutId = setTimeout(initGlobalWebRTC, 500);
    return () => clearTimeout(timeoutId);
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
          timeout={5000}
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
