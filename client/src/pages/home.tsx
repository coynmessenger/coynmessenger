import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDisconnect, useActiveWallet } from "thirdweb/react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Check, Users, Lock, Globe, ArrowRight } from "lucide-react";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { apiRequest } from "@/lib/queryClient";
import coynCoinPath from "@assets/image_1759095831947.png";
import backgroundImagePath from "@assets/images(4)_1753827100393-ZmpUJssK_1759098427313.jpg";
import coynSymbolPath from "@assets/COYN symbol square_1759099649514.png";
import TermsModal from "@/components/terms-modal";
import PrivacyModal from "@/components/privacy-modal";
import PWAInstallPrompt from "@/components/pwa-install-prompt";
import ThirdwebWalletConnector, { clearAllWalletSessions } from "@/components/thirdweb-wallet-connector";
import type { User } from "@shared/schema";

export default function HomePage() {
  useScrollToTop();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { disconnect } = useDisconnect();
  const activeWallet = useActiveWallet();
  const { signIn } = useAuth();
  
  const [isConnected, setIsConnected] = useState(() => {
    return localStorage.getItem('walletConnected') === 'true';
  });
  
  const [connectedUser, setConnectedUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('connectedUser');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to parse connectedUser from localStorage:', error);
      localStorage.removeItem('connectedUser');
      return null;
    }
  });
  
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Check for existing authentication on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('connectedUser');
    const storedConnected = localStorage.getItem('walletConnected');
    const userSignedOut = localStorage.getItem('userSignedOut');
    const userClickedHome = localStorage.getItem('userClickedHome');

    if (storedConnected === 'true' && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser?.id || parsedUser?.walletAddress) {
          setIsConnected(true);
          setConnectedUser(parsedUser);

          // User intentionally navigated to homepage — stay here
          if (userClickedHome === 'true') {
            console.log('👤 User navigated to homepage intentionally, staying');
            return;
          }

          // stale userSignedOut flag but valid session — clear flag and go to messenger
          localStorage.removeItem('userSignedOut');
          console.log('✅ Authenticated user detected, navigating to messenger...');
          signIn(parsedUser);
          setLocation('/messenger');
          return;
        }
      } catch {
        // Corrupted data — fall through to clear it
      }
      localStorage.removeItem('walletConnected');
      localStorage.removeItem('connectedUser');
      localStorage.removeItem('connectedUserId');
    }

    if (userSignedOut === 'true') {
      console.log('🚫 User signed out and no session found, staying on homepage');
    }
    setIsConnected(false);
    setConnectedUser(null);
  }, [setLocation]);
  
  // Watch for Thirdweb autoConnect firing asynchronously after mount
  useEffect(() => {
    if (!activeWallet) return;

    const userSignedOut = localStorage.getItem('userSignedOut');
    const userClickedHome = localStorage.getItem('userClickedHome');
    const storedUser = localStorage.getItem('connectedUser');
    const storedConnected = localStorage.getItem('walletConnected');

    // User intentionally navigated home — don't auto-redirect
    if (userClickedHome === 'true') return;

    // If there's a connected wallet AND stored user data, go to messenger
    if (storedConnected === 'true' && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser?.id || parsedUser?.walletAddress) {
          console.log('✅ Wallet autoConnected with valid session, navigating to messenger...');
          signIn(parsedUser);
          setLocation('/messenger');
          return;
        }
      } catch { /* ignore */ }
    }

    // Wallet connected but no stored session — authenticate via API if not explicitly signed out
    if (userSignedOut !== 'true' && !connectWalletMutation.isPending) {
      const account = (activeWallet as any).getAccount?.();
      const address = account?.address;
      if (address && !storedUser) {
        console.log('🔗 Wallet autoConnected without session, authenticating...');
        connectWalletMutation.mutate({ walletAddress: address });
      }
    }
  }, [activeWallet]);

  // Listen for storage changes from other tabs only (not focus/visibility)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'walletConnected' || e.key === 'connectedUser' || e.key === 'userSignedOut') {
        console.log('📱 Storage change detected from another tab:', e.key);
        // Only update local state, don't trigger navigation
        if (e.key === 'userSignedOut' && e.newValue === 'true') {
          setIsConnected(false);
          setConnectedUser(null);
        } else if (e.key === 'connectedUser' && e.newValue) {
          try {
            const parsedUser = JSON.parse(e.newValue);
            setConnectedUser(parsedUser);
            setIsConnected(true);
          } catch {
            // Ignore parse errors
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const connectWalletMutation = useMutation({
    mutationFn: async ({ walletAddress }: { walletAddress: string }) => {
      try {
        return await apiRequest("POST", "/api/users/find-or-create", { walletAddress });
      } catch (error: any) {
        throw new Error(error.message || "Failed to connect wallet");
      }
    },
    onSuccess: (user: User) => {
      console.log('✅ COYN: User authenticated successfully!', { userId: user.id, walletAddress: user.walletAddress });
      
      // Clean up any competing states
      localStorage.removeItem('pendingWalletConnection');
      localStorage.removeItem('walletConnectionAttempt');
      localStorage.removeItem('walletRedirectState');
      localStorage.removeItem('explicitWalletConnection');
      localStorage.setItem('connectedUserId', user.id.toString());
      sessionStorage.removeItem('userOnHomepage');
      
      // Update auth context (handles localStorage + React state atomically)
      signIn(user);
      
      // Update query cache
      queryClient.setQueryData(["/api/user"], user);
      queryClient.setQueryData(["/api/user", user.id], user);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      
      // Update local component state
      setConnectedUser(user);
      setIsConnected(true);
      
      // Hard navigation so the page reloads with localStorage already populated.
      // This avoids the React state race where ProtectedRoute evaluates isConnected
      // before the signIn() state update has propagated — which causes a redirect
      // back to "/" on mobile wallets that briefly background the browser tab.
      console.log('🎯 COYN: SUCCESS! Navigating to messenger...');
      window.location.href = '/messenger';
    },
  });

  const handleSignOut = async () => {
    try {
      // First disconnect the thirdweb wallet
      console.log('🔌 Disconnecting thirdweb wallet...');
      if (activeWallet) {
        await disconnect(activeWallet);
      }
    } catch (error) {
      console.error('Error disconnecting thirdweb wallet:', error);
    }
    
    // Set explicit sign out flag
    localStorage.setItem('userSignedOut', 'true');
    
    // Clear ALL localStorage items (COYN session)
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('connectedUser');
    localStorage.removeItem('connectedUserId');
    localStorage.removeItem('connectedWalletId');
    localStorage.removeItem('pendingWalletConnection');
    localStorage.removeItem('shopping-cart');
    localStorage.removeItem('theme');
    localStorage.removeItem('favorites');
    localStorage.removeItem('wallet-balances-hidden');
    // Clear all Thirdweb + WalletConnect session data so no stale wallet is auto-reconnected
    clearAllWalletSessions();
    
    // Clear session storage
    sessionStorage.clear();
    
    // Reset state
    setIsConnected(false);
    setConnectedUser(null);
    
    // Force page refresh
    window.location.reload();
  };

  const handleThirdwebConnect = (address: string) => {
    console.log('🔗 COYN: Wallet approved! Address received:', address);
    console.log('🚀 COYN: Starting user authentication and AUTO-NAVIGATION to messenger...');
    
    // Clear ALL navigation flags that might prevent redirect since user is explicitly connecting
    localStorage.removeItem('userSignedOut');
    localStorage.removeItem('userClickedHome');
    sessionStorage.removeItem('userOnHomepage');
    
    // Mark that this is an explicit wallet connection for immediate redirect
    localStorage.setItem('explicitWalletConnection', 'true');
    
    console.log('🎯 COYN: User flags cleared, proceeding with authentication and auto-navigation...');
    connectWalletMutation.mutate({ walletAddress: address });
  };

  const handleThirdwebDisconnect = () => {
    console.log('🔌 Thirdweb wallet disconnected');
    // Clear wallet connection state
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('connectedUser');
    localStorage.removeItem('connectedUserId');
    
    // Reset component state
    setIsConnected(false);
    setConnectedUser(null);
    
    // Clear query cache
    queryClient.clear();
  };

  const features = [
    { icon: MessageCircle, title: "Real-time Messaging", description: "Instant Web3 communication" },
    { icon: Users, title: "Wallet Integration", description: "Send crypto directly in chats" },
    { icon: Lock, title: "Secure & Private", description: "Decentralized end-to-end encryption" },
    { icon: Globe, title: "Global Network", description: "Chat with friends internationally" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-orange-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800 flex flex-col">

      {/* Header with Logo */}
      <header className="w-full p-4 sm:p-6">
        <div className="flex justify-center">
          <div className="relative inline-block">
            <img 
              src="/coynful-logo.jpg" 
              alt="Coynful" 
              className="h-32 w-auto object-contain select-none"
              onContextMenu={(e) => e.preventDefault()}
              draggable={false}
            />
            {/* Black patch covers the original robin (logo bg is black) */}
            <div
              className="absolute bg-black pointer-events-none"
              style={{ top: 0, right: 0, height: '32%', width: '17%' }}
            />
            {/* Crystal bird in the same top-right accent position */}
            <img
              src="/crystal-bird.png"
              alt=""
              className="absolute pointer-events-none select-none"
              style={{ top: '-8%', right: '-1%', height: '36%', width: 'auto' }}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        </div>
      </header>

      {/* Main Content - Centered Layout */}
      <main 
        className="flex-1 flex flex-col items-center justify-start px-4 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImagePath})` }}
      >
        {/* Connection Card - Positioned directly under logo */}
        <div className="w-full max-w-md mx-auto mb-8">
            <Card className="border-0 shadow-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader className="text-center space-y-4 pb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center">
                    COYN Messenger
                  </h3>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {!isConnected || !connectedUser ? (
                  <div className="space-y-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-4">
                        Choose your preferred wallet to connect
                      </p>
                    </div>

                    {/* Thirdweb Wallet Connection - Mobile Optimized */}
                    <div className="flex justify-center mobile-wallet-connector">
                      <ThirdwebWalletConnector
                        onConnect={handleThirdwebConnect}
                        onDisconnect={handleThirdwebDisconnect}
                        className="w-full min-h-[56px] bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 active:bg-gray-100 dark:active:bg-slate-600 text-gray-900 dark:text-white font-medium py-4 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg border border-gray-200 dark:border-slate-600 touch-manipulation select-none"
                      />
                    </div>
                    
                    {connectWalletMutation.isPending && (
                      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                        ✅ Wallet connected successfully - user can now click to enter messenger
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center space-y-5">
                    <div className="w-14 h-14 bg-gradient-to-br from-green-400/20 to-green-500/30 rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <Check className="h-7 w-7 text-green-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-green-600 dark:text-green-400 mb-1">
                        Connected to COYN Network
                      </h3>
                      <p className="text-sm text-gray-700 dark:text-foreground mb-2">
                        Welcome to COYN, {connectedUser?.displayName}
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-muted-foreground font-mono truncate max-w-full px-2 overflow-hidden" title={connectedUser?.walletAddress}>
                        {connectedUser?.walletAddress}
                      </p>

                      <div className="space-y-3 mt-6">
                        <Button
                          onClick={() => setLocation("/messenger")}
                          className="w-full bg-black dark:bg-primary hover:bg-gray-800 dark:hover:bg-primary/90 text-white dark:text-primary-foreground font-semibold rounded-lg h-14 sm:h-12 touch-manipulation"
                        >
                          <MessageCircle className="mr-2 h-6 w-6 sm:h-5 sm:w-5" />
                          Open Messenger
                        </Button>
                        <Button
                          onClick={handleSignOut}
                          variant="outline"
                          className="w-full border-gray-300 dark:border-border text-gray-700 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-muted rounded-lg h-14 sm:h-12 touch-manipulation"
                        >
                          Sign Out
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Supporting BNB Smartchain Assets */}
                <div className="border-t border-border pt-4">
                  <p className="text-center text-muted-foreground text-sm">
                    Supporting BNB Smartchain Assets
                  </p>
                </div>
              </CardContent>
            </Card>
        </div>
        
        {/* Features Section - Moved to bottom */}
        <div className="w-full max-w-6xl mx-auto mt-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center space-y-3 p-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mx-auto">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                  {feature.title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-600 dark:text-gray-400 space-y-4">
          {/* Terms and Privacy Links */}
          <div className="flex items-center justify-center space-x-6">
            <button
              onClick={() => setShowTermsModal(true)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Terms
            </button>
            <button
              onClick={() => setShowPrivacyModal(true)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Privacy
            </button>
          </div>
          
          {/* Copyright */}
          <p className="flex items-center justify-center gap-1">Powered by <a href="https://bscscan.com/token/0x22c89a156cb6f05bc54fae2ed8d690a1bc4fe8e1" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-1">₡</a></p>
        </div>
      </footer>

      {/* Modals */}
      <TermsModal 
        isOpen={showTermsModal} 
        onClose={() => setShowTermsModal(false)} 
      />
      <PrivacyModal 
        isOpen={showPrivacyModal} 
        onClose={() => setShowPrivacyModal(false)} 
      />
      
      <PWAInstallPrompt />
    </div>
  );
}