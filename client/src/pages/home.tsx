import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDisconnect, useActiveWallet } from "thirdweb/react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Check, Users, Lock, Globe, ArrowRight } from "lucide-react";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { apiRequest } from "@/lib/queryClient";
import coynfulLogoPath from "@assets/Coynful-logo-fin-copy_1751239116310.png";
import TermsModal from "@/components/terms-modal";
import PrivacyModal from "@/components/privacy-modal";
import PWAInstallPrompt from "@/components/pwa-install-prompt";
import ThirdwebWalletConnector from "@/components/thirdweb-wallet-connector";
import type { User } from "@shared/schema";

export default function HomePage() {
  useScrollToTop();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { disconnect } = useDisconnect();
  const activeWallet = useActiveWallet();
  
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

  // Check for existing authentication on mount and when wallet state changes
  useEffect(() => {
    const checkAuthAndRedirect = () => {
      const userSignedOut = localStorage.getItem('userSignedOut');
      if (userSignedOut === 'true') {
        console.log('🚫 User signed out, staying on homepage');
        return;
      }
      
      const storedConnected = localStorage.getItem('walletConnected');
      const storedUser = localStorage.getItem('connectedUser');
      const userClickedHome = localStorage.getItem('userClickedHome');
      
      console.log('🔍 Checking authentication state:', {
        storedConnected,
        hasStoredUser: !!storedUser,
        userClickedHome,
        userOnHomepage: sessionStorage.getItem('userOnHomepage')
      });
      
      // Don't redirect if user explicitly chose to stay on homepage
      if (userClickedHome === 'true' || sessionStorage.getItem('userOnHomepage') === 'true') {
        console.log('👤 User explicitly navigated to homepage, staying on homepage');
        sessionStorage.setItem('userOnHomepage', 'true');
        return;
      }
      
      // Redirect authenticated users to messenger
      if (storedConnected === 'true' && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          console.log('🔍 Parsed user:', { id: parsedUser?.id, hasWalletAddress: !!parsedUser?.walletAddress });
          
          if (parsedUser?.id || parsedUser?.address || parsedUser?.walletAddress) {
            console.log('✅ Authenticated user detected, redirecting to messenger...');
            setLocation("/messenger");
            return;
          } else {
            console.log('❌ User data incomplete, clearing storage');
            localStorage.removeItem('walletConnected');
            localStorage.removeItem('connectedUser');
            localStorage.removeItem('connectedUserId');
          }
        } catch (error) {
          console.log('❌ Error parsing user data:', error);
          localStorage.removeItem('walletConnected');
          localStorage.removeItem('connectedUser');
          localStorage.removeItem('connectedUserId');
        }
      }
    };

    // Initial check
    checkAuthAndRedirect();

    // Listen for wallet connection events (when user returns from wallet app)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'walletConnected' || e.key === 'connectedUser' || e.key === 'userSignedOut') {
        console.log('📱 MOBILE: Storage change detected, checking for wallet return...', e.key);
        setTimeout(checkAuthAndRedirect, 100); // Small delay to ensure all related storage updates are complete
      }
    };

    // Listen for focus events (when user returns from wallet app)
    const handleFocus = () => {
      console.log('👁️ MOBILE: Window focus detected, checking for wallet return...');
      setTimeout(checkAuthAndRedirect, 100);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [setLocation]);

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
      
      // Clean up any competing states first
      localStorage.removeItem('pendingWalletConnection');
      localStorage.removeItem('walletConnectionAttempt');
      localStorage.removeItem('walletRedirectState');
      // DON'T remove userSignedOut - only clear it when user explicitly connects, not on autoconnect
      
      // Store connection state
      localStorage.setItem('walletConnected', 'true');
      localStorage.setItem('connectedUser', JSON.stringify(user));
      localStorage.setItem('connectedUserId', user.id.toString());
      
      // Update cache and state
      queryClient.setQueryData(["/api/user"], user);
      queryClient.setQueryData(["/api/user", user.id], user);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      
      // Update component state
      setConnectedUser(user);
      setIsConnected(true);
      
      // Clean URL
      const cleanUrl = `${window.location.origin}${window.location.pathname}`;
      window.history.replaceState({}, document.title, cleanUrl);
      
      // Redirect to messenger
      console.log('🎯 COYN: SUCCESS! Redirecting to signed-in page (messenger)...');
      setLocation("/messenger");
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
    
    // Clear ALL localStorage items
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('connectedUser');
    localStorage.removeItem('connectedUserId');
    localStorage.removeItem('pendingWalletConnection');
    localStorage.removeItem('shopping-cart');
    localStorage.removeItem('theme');
    localStorage.removeItem('favorites');
    localStorage.removeItem('wallet-balances-hidden');
    
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
    console.log('🚀 COYN: Starting user authentication and page transition...');
    
    // Clear navigation flags that might prevent redirect since user is explicitly connecting
    // Note: userSignedOut is already cleared in thirdweb connector when wallet approves
    localStorage.removeItem('userClickedHome');
    sessionStorage.removeItem('userOnHomepage');
    
    console.log('🎯 COYN: User flags cleared, proceeding with authentication...');
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
    { icon: MessageCircle, title: "Real-time Messaging", description: "Instant encrypted communication" },
    { icon: Users, title: "Wallet Integration", description: "Send crypto directly in chats" },
    { icon: Lock, title: "Secure & Private", description: "End-to-end encryption" },
    { icon: Globe, title: "Global Network", description: "Connect with users worldwide" }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="w-full p-4 sm:p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <img 
              src={coynfulLogoPath} 
              alt="Coynful Logo" 
              className="h-12 w-12 object-contain"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md mx-auto w-full text-center space-y-8">
          
          {/* Main Connection Card */}
          <Card className="border shadow-lg bg-white dark:bg-slate-800">
            <CardHeader className="text-center space-y-4 pb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Connect Wallet
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Connect your Web3 wallet to access Coynful Messenger
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {!isConnected || !connectedUser ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      Choose your preferred wallet to connect
                    </p>
                  </div>

                  {/* Thirdweb Wallet Connection - EXACT SAME AS BEFORE */}
                  <div className="w-full">
                    <ThirdwebWalletConnector
                      onConnect={handleThirdwebConnect}
                      onDisconnect={handleThirdwebDisconnect}
                      className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl border border-orange-400/20"
                    />
                  </div>
                  
                  {connectWalletMutation.isPending && (
                    <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                      ✅ Wallet connected successfully - user can now click to enter messenger
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                    <Check className="h-8 w-8 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-green-600 dark:text-green-400 mb-2">
                      Connected to COYN Network
                    </h3>
                    <p className="text-black dark:text-foreground mb-2">
                      Welcome to COYN, {connectedUser?.displayName}!
                    </p>
                    <p className="text-xs text-gray-600 dark:text-muted-foreground font-mono break-all px-4">
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

              {/* Supported Currencies */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Supported Currencies
                </h3>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {['BNB', 'USDT', 'COYN'].map((currency) => (
                    <div key={currency} className="text-center">
                      <Badge variant="outline" className="w-full py-2 text-sm font-medium">
                        {currency}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features Section */}
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="p-4 text-center">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Instant Crypto
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Send BNB, USDT, and COYN directly in your chats
                </p>
              </div>
              
              <div className="p-4 text-center">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Smart Escrow <Badge variant="secondary" className="ml-2 text-xs">Coming Soon</Badge>
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Safe peer-to-peer trades with automated escrow protection
                </p>
              </div>
              
              <div className="p-4 text-center">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Secure Chat
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Encrypted conversations with wallet-verified contacts
                </p>
              </div>
              
              <div className="p-4 text-center">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Marketplace <Badge variant="secondary" className="ml-2 text-xs">Coming Soon</Badge>
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pay with digital currency
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            Secure • Decentralized • Private
          </div>
          <div className="flex items-center justify-center space-x-6 text-sm">
            <button
              onClick={() => setShowTermsModal(true)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Terms & Conditions
            </button>
            <span className="text-gray-400 dark:text-gray-600">•</span>
            <button
              onClick={() => setShowPrivacyModal(true)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Privacy Policy
            </button>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Powered by COYN
          </div>
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