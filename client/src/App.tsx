import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { ThirdwebProvider, AutoConnect } from "thirdweb/react";
import { createWallet } from "thirdweb/wallets";
import { thirdwebClient } from "@/lib/thirdweb-client";
import { initializeGlobalWebRTC } from "@/lib/global-webrtc";
import { useEffect, lazy, Suspense, ComponentType } from "react";
import { logger } from "@/lib/logger";

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

// Configure supported wallets for auto-reconnection
// WalletConnect enables mobile wallet connections via deep linking
const wallets = [
  createWallet("walletConnect"), // Primary mobile wallet connector
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),  
  createWallet("com.bitget.web3"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
  createWallet("com.trustwallet.app"),
];

function ProtectedRoute({ component: Component }: { component: ComponentType }) {
  const { user, isConnected, isLoading } = useAuth();
  
  if (isLoading) {
    return <PageLoader />;
  }
  
  if (!isConnected || !user) {
    return <Redirect to="/" />;
  }
  
  return <Component />;
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/messenger">{() => <ProtectedRoute component={MessengerPage} />}</Route>
        <Route path="/marketplace">{() => <ProtectedRoute component={MarketplacePage} />}</Route>
        <Route path="/product/:asin" component={ProductPage} />
        <Route path="/favorites">{() => <ProtectedRoute component={FavoritesPage} />}</Route>
        <Route path="/purchase-history">{() => <ProtectedRoute component={PurchaseHistoryPage} />}</Route>
        <Route path="/call-test">{() => <ProtectedRoute component={CallTestPage} />}</Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function AppContent() {
  const { user, isSignedOut } = useAuth();

  useEffect(() => {
    if (isSignedOut || !user?.id) return;

    let isInitializing = false;
    
    const initGlobalWebRTC = async () => {
      if (isInitializing) return;
      
      try {
        isInitializing = true;
        await initializeGlobalWebRTC(user.id.toString(), 1);
      } catch (error) {
        logger.error("WebRTC", "Initialization failed", error);
      } finally {
        isInitializing = false;
      }
    };
    
    const timeoutId = setTimeout(initGlobalWebRTC, 500);
    return () => clearTimeout(timeoutId);
  }, [user?.id, isSignedOut]);

  return (
    <ThirdwebProvider>
      {!isSignedOut && (
        <AutoConnect
          client={thirdwebClient}
          wallets={wallets}
          timeout={15000}
          onConnect={(wallet) => {
            import.meta.env.DEV && console.log('✅ AutoConnect: Wallet reconnected');
          }}
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

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
