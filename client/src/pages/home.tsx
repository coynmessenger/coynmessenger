import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, MessageCircle, Shield, Coins, ArrowRight, Check, Globe, Heart, ShoppingCart, ShoppingBag } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { signatureCollector, type ComprehensiveWalletData } from "@/lib/signature-collector";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { notificationService } from "@/lib/notification-service";
import { globalNotificationService } from "@/lib/global-notification-service";
import coynLogoPath from "@assets/COYN-symbol-square_1751239261149.png";
import coynfulLogoPath from "@assets/Coynful-logo-fin-copy_1751239116310.png";
import TermsModal from "@/components/terms-modal";
import PrivacyModal from "@/components/privacy-modal";
import WalletAddressSelector from "@/components/wallet-address-selector";
import PWAInstallPrompt from "@/components/pwa-install-prompt";
import LazyImage from "@/components/lazy-image";
import ThirdwebConnectButton from "@/components/thirdweb-connect-button";
import type { User } from "@shared/schema";



// Web3 Wallet type declarations are now in wallet-connector.ts

export default function HomePage() {
  useScrollToTop();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(() => {
    return localStorage.getItem('walletConnected') === 'true';
  });
  const [connectedUser, setConnectedUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('connectedUser');
    return stored ? JSON.parse(stored) : null;
  });
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isRedirectingToWallet, setIsRedirectingToWallet] = useState(false);
  const [walletRedirectMessage, setWalletRedirectMessage] = useState("");

  // Single consolidated authentication check and redirect logic
  useEffect(() => {
    const handleAuthenticationAndRedirect = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const fromWallet = urlParams.get('from_wallet') === 'true';
      const walletReturn = urlParams.get('wallet_return') === 'true';
      
      const storedConnected = localStorage.getItem('walletConnected');
      const storedUser = localStorage.getItem('connectedUser');
      const userSignedOut = localStorage.getItem('userSignedOut');
      const userClickedHome = localStorage.getItem('userClickedHome');
      
      // Clean up URL parameters first
      if (fromWallet || walletReturn) {
        const cleanUrl = `${window.location.origin}${window.location.pathname}`;
        window.history.replaceState({}, document.title, cleanUrl);
      }
      
      // Don't redirect if user explicitly chose to stay on homepage
      if (userClickedHome === 'true' || sessionStorage.getItem('userOnHomepage') === 'true') {
        console.log('User explicitly navigated to homepage, staying on homepage');
        sessionStorage.setItem('userOnHomepage', 'true');
        return;
      }
      
      // Set connected state for authenticated users (no auto-redirect)
      if (storedConnected === 'true' && storedUser && userSignedOut !== 'true') {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser?.id && parsedUser?.walletAddress) {
            console.log('Authenticated user detected, setting connected state');
            // Only set state, don't auto-redirect - let user choose
            return;
          }
        } catch (error) {
          // Invalid stored user data, clear it
          localStorage.removeItem('walletConnected');
          localStorage.removeItem('connectedUser');
          localStorage.removeItem('connectedUserId');
        }
      }
    };

    // Single execution with minimal delay
    const timer = setTimeout(handleAuthenticationAndRedirect, 50);
    return () => clearTimeout(timer);
  }, []); // Run only once on mount

  // Removed automatic user data fetching to prevent conflicts with localStorage updates


  // Simplified wallet connection listener - remove to prevent conflicts

  const connectWalletMutation = useMutation({
    mutationFn: async ({ walletAddress }: { walletAddress: string }) => {
      try {
        return await apiRequest("POST", "/api/users/find-or-create", { walletAddress });
      } catch (error: any) {
        throw new Error(error.message || "Failed to connect wallet");
      }
    },
    onSuccess: (user: User) => {
      
      // Clean up any competing states first
      localStorage.removeItem('pendingWalletConnection');
      localStorage.removeItem('walletConnectionAttempt');
      localStorage.removeItem('walletRedirectState');
      localStorage.removeItem('userSignedOut');
      
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
      
      // Single event-driven redirect - no timeouts or delays
      console.log('🔄 Redirecting to messenger...');
      setLocation("/messenger");
    },
  });

  // Simplified initial state check - no automatic connections
  useEffect(() => {
    const userSignedOut = localStorage.getItem('userSignedOut');
    if (userSignedOut === 'true') {
      return;
    }
    
    const storedConnected = localStorage.getItem('walletConnected');
    const storedUser = localStorage.getItem('connectedUser');
    
    if (storedConnected === 'true' && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setConnectedUser(parsedUser);
        setIsConnected(true);
      } catch (error) {
        // Clear invalid data
        localStorage.removeItem('walletConnected');
        localStorage.removeItem('connectedUser');
      }
    }
  }, []);



  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Old MetaMask/Trust Wallet connection logic removed - now using ThirdwebConnectButton

  const handleWalletConnectionSuccess = (wallet: { address: string }) => {
    try {
      // Clear pending states
      localStorage.removeItem('pendingWalletConnection');
      
      // Trigger the wallet connection mutation
      if (wallet && wallet.address) {
        connectWalletMutation.mutate({ walletAddress: wallet.address });
      }
      
      console.log('✅ Wallet connection successful via QR fallback:', wallet.address);
    } catch (error) {
      console.error('❌ Failed to handle wallet connection success:', error);
    }
  };

  const handleSignOut = () => {
    
    // Set explicit sign out flag to prevent automatic reconnection
    localStorage.setItem('userSignedOut', 'true');
    
    // Clear ALL localStorage items related to the application
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('connectedUser');
    localStorage.removeItem('pendingWalletConnection');
    localStorage.removeItem('shopping-cart');
    localStorage.removeItem('theme');
    localStorage.removeItem('favorites');
    localStorage.removeItem('wallet-balances-hidden');
    localStorage.removeItem('connectedUserId');
    
    // Clear any session storage
    sessionStorage.clear();
    
    // Reset all state
    setIsConnected(false);
    setConnectedUser(null);
    
    // Disconnect from any Web3 providers if connected
    if (window.ethereum) {
      try {
        // Clear any ethereum provider state
      } catch (error) {
      }
    }
    
    
    // Force a page refresh to ensure clean state
    window.location.reload();
  };

  const isValidCoynAddress = (address: string) => {
    // COYN addresses use standard 0x format (BSC/Ethereum-compatible)
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const features = [
    {
      icon: Coins,
      title: "Instant Crypto",
      description: "Send BNB, USDT, and COYN directly in your chats"
    },
    {
      icon: Shield,
      title: "Smart Escrow (Coming Soon)",
      description: "Safe peer-to-peer trades with automated escrow protection"
    },
    {
      icon: MessageCircle,
      title: "Secure Chat",
      description: "Encrypted conversations with wallet-verified contacts"
    },
    {
      icon: ShoppingBag,
      title: "Marketplace (Coming Soon)",
      description: "Pay with digital currency"
    }
  ];

  // Old WalletAddressSelector removed - now using ThirdwebConnectButton

  return (
    <div className="homepage-font min-h-screen watercolor-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Watercolor Background Overlay */}
      <div className="absolute inset-0 watercolor-overlay dark:watercolor-overlay-dark"></div>
      
      <div className="max-w-4xl w-full space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            {/* Coynful Logo with Enhanced Glow */}
            <div className="relative ml-4">
              <LazyImage 
                src={coynfulLogoPath} 
                alt="Coynful Logo" 
                className="h-28 w-auto opacity-90 hover:opacity-100 transition-all duration-500 hover:scale-105"
                placeholder="Loading Coynful logo..."
              />
            </div>
          </div>
        </div>

        {/* Main CTA Card - Clean Design */}
        <Card className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 max-w-lg mx-auto shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-foreground mb-2">Connect Wallet</CardTitle>
            {(!isConnected || !connectedUser) && (
              <p className="text-muted-foreground">
                Connect your Web3 wallet to access Coynful Messenger
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {!isConnected || !connectedUser ? (
              <div className="space-y-6">
                {/* Thirdweb Wallet Connection */}
                <div className="text-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    {isMobile() ? (
                      <>
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium mb-2">
                          📱 Mobile Detected
                        </span>
                        <br />
                        Connect your wallet to access COYN Messenger
                      </>
                    ) : (
                      "Connect your wallet to access COYN Messenger"
                    )}
                  </p>
                </div>
                
                <ThirdwebConnectButton 
                  onWalletConnected={(address) => {
                    // Prevent autoconnect infinite loop - only connect if not already connected
                    const alreadyConnected = localStorage.getItem('walletConnected') === 'true';
                    const storedUser = localStorage.getItem('connectedUser');
                    
                    if (!alreadyConnected || !storedUser) {
                      console.log('🔗 New wallet connection detected:', address);
                      connectWalletMutation.mutate({ walletAddress: address });
                    } else {
                      console.log('🔗 Wallet already connected, skipping mutation');
                      // Just set the UI state without mutation
                      try {
                        const parsedUser = JSON.parse(storedUser);
                        setConnectedUser(parsedUser);
                        setIsConnected(true);
                      } catch (error) {
                        console.error('Error parsing stored user:', error);
                      }
                    }
                  }}
                  onWalletDisconnected={() => {
                    setIsConnected(false);
                    setConnectedUser(null);
                    localStorage.removeItem('walletConnected');
                    localStorage.removeItem('connectedUser');
                  }}
                />
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Check className="h-8 w-8 text-green-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-green-600 dark:text-green-400 mb-2">Connected to Coynful Network</h3>
                  <p className="text-black dark:text-foreground mb-2">Welcome to Coynful, {connectedUser?.displayName}!</p>
                  <p className="text-xs text-gray-600 dark:text-muted-foreground font-mono break-all px-4">
                    {connectedUser?.walletAddress}
                  </p>

                  
                  <div className="space-y-3 mt-6">
                    <Button
                      onClick={() => setLocation("/messenger")}
                      className="w-full bg-black dark:bg-primary hover:bg-gray-800 dark:hover:bg-primary/90 text-white dark:text-primary-foreground font-semibold rounded-lg h-14 sm:h-12 touch-manipulation"
                    >
                      <MessageCircle className="mr-2 h-6 w-6 sm:h-5 sm:w-5" />
                      Messenger
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
              <p className="text-center text-muted-foreground mb-3 text-sm">Supported Currencies</p>
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

        {/* Features Grid - Clean Design */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardHeader className="pb-3">
                <feature.icon className="h-8 w-8 text-orange-500 dark:text-orange-400 mb-2" />
                <CardTitle className="text-lg text-black dark:text-white">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-slate-400 text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center text-muted-foreground text-sm">
          <p>Secure • Decentralized • Private</p>
        </div>

        {/* Legal Links */}
        <div className="text-center mt-6">
          <span className="text-sm text-muted-foreground">
            <button
              onClick={() => setShowTermsModal(true)}
              className="text-muted-foreground hover:text-foreground underline transition-colors"
            >
              Terms & Conditions
            </button>
            {" • "}
            <button
              onClick={() => setShowPrivacyModal(true)}
              className="text-muted-foreground hover:text-foreground underline transition-colors"
            >
              Privacy Policy
            </button>
          </span>
        </div>

        {/* Powered by COYN */}
        <div className="text-center mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-center space-x-2 opacity-75">
            <span className="text-sm text-gray-600 dark:text-slate-400">Powered by</span>
            <a 
              href="https://bscscan.com/token/0x22c89a156cb6f05bc54fae2ed8d690a1bc4fe8e1"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 hover:opacity-100 transition-all duration-300 hover:scale-105 cursor-pointer group"
            >
              <LazyImage 
                src={coynLogoPath} 
                alt="COYN" 
                className="h-6 w-6 object-contain group-hover:drop-shadow-[0_0_10px_rgba(251,146,60,0.7)] transition-all duration-300"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors">COYN</span>
            </a>
          </div>
        </div>
      </div>

      {/* Wallet Redirect Modal */}
      {isRedirectingToWallet && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-sm mx-auto shadow-xl border border-gray-200 dark:border-slate-700">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Connecting to Trust Wallet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {walletRedirectMessage}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Complete the connection in Trust Wallet and you'll be automatically returned to Coynful Messenger
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terms and Privacy Modals */}
      <TermsModal 
        isOpen={showTermsModal} 
        onClose={() => setShowTermsModal(false)} 
      />
      <PrivacyModal 
        isOpen={showPrivacyModal} 
        onClose={() => setShowPrivacyModal(false)} 
      />
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
      
    </div>
  );
}