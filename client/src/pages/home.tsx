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
import coynfulLogoPath from "@assets/Coynful logo fin copy_1759096913804.png";
import coynCoinPath from "@assets/image_1759095831947.png";
import backgroundImagePath from "@assets/images(4)_1753827100393-ZmpUJssK_1759098427313.jpg";
import coynSymbolPath from "@assets/COYN symbol square_1759099649514.png";
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
    let authCheckTimeout: NodeJS.Timeout;
    
    const checkAuthAndRedirect = () => {
      const userSignedOut = localStorage.getItem('userSignedOut');
      if (userSignedOut === 'true') {
        console.log('🚫 User signed out, staying on homepage');
        setIsConnected(false);
        setConnectedUser(null);
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
      
      // Update component state based on localStorage
      if (storedConnected === 'true' && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          console.log('🔍 Parsed user:', { id: parsedUser?.id, hasWalletAddress: !!parsedUser?.walletAddress });
          
          if (parsedUser?.id || parsedUser?.address || parsedUser?.walletAddress) {
            // Update component state immediately
            setIsConnected(true);
            setConnectedUser(parsedUser);
            
            // Don't redirect if user explicitly chose to stay on homepage  
            if (userClickedHome === 'true' || sessionStorage.getItem('userOnHomepage') === 'true') {
              console.log('👤 User explicitly navigated to homepage, staying on homepage');
              sessionStorage.setItem('userOnHomepage', 'true');
              return;
            }
            
            console.log('✅ Authenticated user detected, redirecting to messenger...');
            setLocation("/messenger");
            return;
          } else {
            console.log('❌ User data incomplete, clearing storage');
            localStorage.removeItem('walletConnected');
            localStorage.removeItem('connectedUser');
            localStorage.removeItem('connectedUserId');
            setIsConnected(false);
            setConnectedUser(null);
          }
        } catch (error) {
          console.log('❌ Error parsing user data:', error);
          localStorage.removeItem('walletConnected');
          localStorage.removeItem('connectedUser');
          localStorage.removeItem('connectedUserId');
          setIsConnected(false);
          setConnectedUser(null);
        }
      } else {
        // No valid connection found
        setIsConnected(false);
        setConnectedUser(null);
      }
    };

    // Initial check immediately
    checkAuthAndRedirect();

    // Listen for wallet connection events (when user returns from wallet app)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'walletConnected' || e.key === 'connectedUser' || e.key === 'userSignedOut') {
        console.log('📱 MOBILE: Storage change detected, checking for wallet return...', e.key);
        // Clear any pending timeout and schedule new check
        clearTimeout(authCheckTimeout);
        authCheckTimeout = setTimeout(checkAuthAndRedirect, 150);
      }
    };

    // Listen for focus events (when user returns from wallet app)
    const handleFocus = () => {
      console.log('👁️ MOBILE: Window focus detected, checking for wallet return...');
      // Clear any pending timeout and schedule new check
      clearTimeout(authCheckTimeout);
      authCheckTimeout = setTimeout(checkAuthAndRedirect, 150);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearTimeout(authCheckTimeout);
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
      localStorage.removeItem('explicitWalletConnection'); // Clean up the connection flag
      localStorage.removeItem('userSignedOut'); // Clear sign out flag on successful connection
      localStorage.removeItem('userClickedHome'); // Clear any homepage preference
      sessionStorage.removeItem('userOnHomepage'); // Clear any homepage session flag
      
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
      
      // IMMEDIATE REDIRECT to messenger - this is the primary path for auto-navigation
      console.log('🎯 COYN: SUCCESS! Auto-navigating to messenger...');
      setTimeout(() => {
        setLocation("/messenger");
      }, 100); // Small delay to ensure state updates complete
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
    { icon: MessageCircle, title: "Real-time Messaging", description: "Instant encrypted communication" },
    { icon: Users, title: "Wallet Integration", description: "Send crypto directly in chats" },
    { icon: Lock, title: "Secure & Private", description: "End-to-end encryption" },
    { icon: Globe, title: "Global Network", description: "Connect with users worldwide" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-orange-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800 flex flex-col">

      {/* Header with Logo */}
      <header className="w-full p-4 sm:p-6">
        <div className="flex justify-center">
          <img 
            src={coynfulLogoPath} 
            alt="Coynful" 
            className="h-32 w-auto object-contain"
          />
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
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-3">
                    <img 
                      src={coynSymbolPath} 
                      alt="COYN" 
                      className="w-[35px] h-[35px]"
                    />
                    COYN Messenger
                  </h3>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Debug info */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    Debug: isConnected={String(isConnected)}, hasUser={String(!!connectedUser)}, userAddress={connectedUser?.walletAddress?.slice(0,6)}...
                  </div>
                )}
                
                {!isConnected || !connectedUser ? (
                  <div className="space-y-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-4">
                        Choose your preferred wallet to connect
                      </p>
                    </div>

                    {/* Thirdweb Wallet Connection */}
                    <div className="flex justify-center">
                      <ThirdwebWalletConnector
                        onConnect={handleThirdwebConnect}
                        onDisconnect={handleThirdwebDisconnect}
                        className="w-[640px] h-[370px] bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-900 dark:text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg border border-gray-200 dark:border-slate-600"
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
                <div className="border-t border-border pt-4">
                  <p className="text-center text-muted-foreground mb-3 text-sm">
                    Supported Currencies
                  </p>
                  <div className="flex justify-center space-x-3 flex-wrap gap-2">
                    {['BNB', 'USDT', 'COYN'].map((currency) => (
                      <Badge key={currency} variant="secondary" className="text-xs">
                        {currency}
                      </Badge>
                    ))}
                  </div>
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
          <p className="flex items-center justify-center gap-1">© 2025 Powered by <a href="https://bscscan.com/token/0x22c89a156cb6f05bc54fae2ed8d690a1bc4fe8e1" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-1"><img src={coynCoinPath} alt="COYN" className="w-4 h-4" />COYN</a></p>
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