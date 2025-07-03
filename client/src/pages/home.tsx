import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, MessageCircle, Shield, Coins, ArrowRight, Check, Globe, Heart, ShoppingCart, ShoppingBag } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import coynLogoPath from "@assets/COYN-symbol-square_1751239261149.png";
import coynfulLogoPath from "@assets/Coynful-logo-fin-copy_1751239116310.png";
import metamaskLogo from "@assets/MetaMask_Fox.svg_1751312780982.png";
import trustWalletLogo from "@assets/Trust-Wallet_1751312780982.jpg";
import TermsModal from "@/components/terms-modal";
import PrivacyModal from "@/components/privacy-modal";
import type { User } from "@shared/schema";

// WalletConnect Web3Provider (commented out due to compatibility issues)
// import WalletConnectProvider from "@walletconnect/web3-provider";

// Web3 Wallet type declarations
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      isMetaMask?: boolean;
      isTrust?: boolean;
      isCoinbaseWallet?: boolean;
    };
    trustWallet?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
  }
}

export default function HomePage() {
  useScrollToTop();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [walletAddress, setWalletAddress] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isConnected, setIsConnected] = useState(() => {
    return localStorage.getItem('walletConnected') === 'true';
  });
  const [connectedUser, setConnectedUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('connectedUser');
    return stored ? JSON.parse(stored) : null;
  });
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Removed automatic user data fetching to prevent conflicts with localStorage updates

  // Listen for display name updates from settings modal
  useEffect(() => {
    const handleDisplayNameUpdate = (event: CustomEvent) => {
      console.log("Homepage received displayNameUpdated event:", event.detail);
      
      // Only update if the event is for the current connected user
      if (connectedUser && event.detail?.userId === connectedUser.id) {
        const updatedStoredUser = localStorage.getItem('connectedUser');
        if (updatedStoredUser) {
          const parsedUser = JSON.parse(updatedStoredUser);
          console.log("Updating homepage connectedUser state with:", parsedUser);
          
          // Verify the user ID matches before updating state
          if (parsedUser.id === connectedUser.id) {
            setConnectedUser(parsedUser);
          } else {
            console.error("User ID mismatch in displayNameUpdated event - not updating homepage state");
          }
        }
      }
    };

    window.addEventListener('displayNameUpdated', handleDisplayNameUpdate as EventListener);
    
    return () => {
      window.removeEventListener('displayNameUpdated', handleDisplayNameUpdate as EventListener);
    };
  }, [connectedUser?.id]);

  const connectWalletMutation = useMutation({
    mutationFn: async ({ walletAddress, displayName }: { walletAddress: string; displayName?: string }) => {
      try {
        return await apiRequest("POST", "/api/users/find-or-create", {
          walletAddress,
          displayName
        });
      } catch (error: any) {
        // Re-throw the actual error from the server
        throw new Error(error.message || "Failed to connect wallet");
      }
    },
    onSuccess: (user: User) => {
      console.log("connectWalletMutation success - received user:", user);
      
      // Store connection state in localStorage
      localStorage.setItem('walletConnected', 'true');
      localStorage.setItem('connectedUser', JSON.stringify(user));
      localStorage.setItem('connectedUserId', user.id.toString());
      
      // Store display name for other components
      if (user.displayName) {
        localStorage.setItem('userDisplayName', user.displayName);
      }
      
      // Clear all cache to prevent stale data conflicts
      queryClient.clear();
      
      // Immediately update cache data for both query key patterns
      queryClient.setQueryData(["/api/user"], user);
      queryClient.setQueryData(["/api/user", user.id], user);
      queryClient.setQueryData(["/api/user", { userId: user.id }], user);
      
      // Invalidate user queries to ensure fresh data across all components
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user", user.id] });
      
      // Invalidate conversation queries to refresh user data in conversation lists
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", user.id] });
      
      // Force immediate state update
      setConnectedUser(user);
      setIsConnected(true);
      
      console.log("Updated homepage state with new user:", user);
      
      // Force a component re-render after a brief delay to ensure localStorage is updated
      setTimeout(() => {
        const freshUser = localStorage.getItem('connectedUser');
        if (freshUser) {
          const parsedUser = JSON.parse(freshUser);
          console.log("Force refreshing homepage with fresh localStorage data:", parsedUser);
          setConnectedUser(parsedUser);
        }
      }, 100);
    },
  });

  const handleConnectWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress.trim() || !isValidCoynAddress(walletAddress)) return;
    
    connectWalletMutation.mutate({
      walletAddress: walletAddress.trim(),
      displayName: displayName.trim() || undefined,
    });
  };

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const handleWeb3Connect = async (walletType: string) => {
    try {
      if (walletType === 'metamask') {
        if (typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask) {
          const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
          });
          
          if (accounts && accounts[0]) {
            connectWalletMutation.mutate({
              walletAddress: accounts[0],
              displayName: undefined // Let the backend generate a proper display name
            });
          }
        } else {
          // Mobile-specific MetaMask connection
          if (isMobile()) {
            const currentUrl = window.location.href;
            const deepLink = `https://metamask.app.link/dapp/${window.location.host}`;
            window.open(deepLink, '_blank');
          } else {
            window.open('https://metamask.io/download/', '_blank');
          }
        }
      } else if (walletType === 'trust') {
        // Trust Wallet Web3 integration with enhanced mobile support
        if (typeof window.ethereum !== 'undefined') {
          // Check if Trust Wallet is available
          if (window.ethereum.isTrust || window.trustWallet) {
            try {
              const provider = window.trustWallet || window.ethereum;
              const accounts = await provider.request({ 
                method: 'eth_requestAccounts' 
              });
              
              if (accounts && accounts[0]) {
                connectWalletMutation.mutate({
                  walletAddress: accounts[0],
                  displayName: undefined
                });
              }
            } catch (error) {
              console.error('Trust Wallet connection failed:', error);
              // On mobile, try deep link fallback
              if (isMobile()) {
                const currentUrl = window.location.href;
                const deepLink = `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(currentUrl)}`;
                window.open(deepLink, '_blank');
              } else {
                alert('Failed to connect Trust Wallet. Please try again or use manual input.');
              }
            }
          } else {
            // If Trust Wallet is not detected, try generic ethereum provider
            try {
              const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
              });
              
              if (accounts && accounts[0]) {
                connectWalletMutation.mutate({
                  walletAddress: accounts[0],
                  displayName: undefined
                });
              }
            } catch (error) {
              console.error('Web3 wallet connection failed:', error);
              // Enhanced mobile fallback for Trust Wallet
              if (isMobile()) {
                const currentUrl = window.location.href;
                const deepLink = `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(currentUrl)}`;
                window.open(deepLink, '_blank');
              } else {
                window.open('https://trustwallet.com/download', '_blank');
              }
            }
          }
        } else {
          // No Web3 provider detected - Enhanced mobile handling
          if (isMobile()) {
            // Mobile - Enhanced Trust Wallet deep link with WalletConnect fallback
            const currentUrl = window.location.href;
            const deepLink = `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(currentUrl)}`;
            
            // Try Trust Wallet first
            window.open(deepLink, '_blank');
            
            // Fallback message for user
            setTimeout(() => {
              console.log('If Trust Wallet did not open, please install it from your app store');
            }, 2000);
          } else {
            window.open('https://trustwallet.com/download', '_blank');
          }
        }
      } else if (walletType === 'walletconnect') {
        // WalletConnect integration - simplified approach
        try {
          // Check if WalletConnect is available through injected provider
          if (typeof window.ethereum !== 'undefined') {
            const accounts = await window.ethereum.request({ 
              method: 'eth_requestAccounts' 
            });
            
            if (accounts && accounts[0]) {
              connectWalletMutation.mutate({
                walletAddress: accounts[0],
                displayName: undefined
              });
            }
          } else {
            // Redirect to WalletConnect-supported wallets
            const wcUri = `wc:${Math.random().toString(36).substring(2)}@2?relay-protocol=irn&symKey=${Math.random().toString(36).substring(2)}`;
            if (isMobile()) {
              // Enhanced mobile WalletConnect support
              const currentUrl = window.location.href;
              
              // Try opening in various mobile wallets
              const walletApps = [
                `https://link.trustwallet.com/wc?uri=${encodeURIComponent(wcUri)}`,
                `https://metamask.app.link/wc?uri=${encodeURIComponent(wcUri)}`,
                `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(currentUrl)}`
              ];
              
              // Try the first available wallet
              window.open(walletApps[0], '_blank');
              
              setTimeout(() => {
                console.log('If no wallet opened, please ensure you have a compatible wallet app installed');
              }, 2000);
            } else {
              alert('For WalletConnect, please scan the QR code with your mobile wallet app, or use manual input for now.');
            }
          }
        } catch (error) {
          console.error('WalletConnect connection failed:', error);
          alert('Failed to connect WalletConnect. Please try again or use manual input.');
        }
      } else if (walletType === 'coinbase') {
        // Enhanced Coinbase Wallet integration with mobile support
        if (typeof window.ethereum !== 'undefined' && window.ethereum.isCoinbaseWallet) {
          try {
            const accounts = await window.ethereum.request({ 
              method: 'eth_requestAccounts' 
            });
            
            if (accounts && accounts[0]) {
              connectWalletMutation.mutate({
                walletAddress: accounts[0],
                displayName: undefined
              });
            }
          } catch (error) {
            console.error('Coinbase Wallet connection failed:', error);
            // Mobile fallback for Coinbase Wallet
            if (isMobile()) {
              const currentUrl = window.location.href;
              const deepLink = `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(currentUrl)}`;
              window.open(deepLink, '_blank');
            } else {
              alert('Failed to connect Coinbase Wallet. Please try again or use manual input.');
            }
          }
        } else {
          // Enhanced mobile detection for Coinbase Wallet
          if (isMobile()) {
            // Mobile - try deep link to Coinbase Wallet app
            const currentUrl = window.location.href;
            const deepLink = `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(currentUrl)}`;
            window.open(deepLink, '_blank');
            
            setTimeout(() => {
              console.log('If Coinbase Wallet did not open, please install it from your app store');
            }, 2000);
          } else {
            // Desktop - redirect to download page
            window.open('https://www.coinbase.com/wallet', '_blank');
          }
        }
      }
    } catch (error) {
      console.error(`Failed to connect ${walletType} wallet:`, error);
      alert(`Failed to connect ${walletType} wallet. Please try again or use manual input.`);
    }
  };

  const handleSignOut = () => {
    // Clear localStorage
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('connectedUser');
    
    // Reset state
    setIsConnected(false);
    setConnectedUser(null);
    setWalletAddress('');
    setDisplayName('');
  };

  const isValidCoynAddress = (address: string) => {
    // COYN addresses use standard 0x format (BSC/Ethereum-compatible)
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const features = [
    {
      icon: Coins,
      title: "Instant Crypto",
      description: "Send BTC, BNB, USDT, and COYN directly in your chats"
    },
    {
      icon: Shield,
      title: "Smart Escrow",
      description: "Safe peer-to-peer trades with automated escrow protection"
    },
    {
      icon: MessageCircle,
      title: "Secure Chat",
      description: "Encrypted conversations with wallet-verified contacts"
    },
    {
      icon: ShoppingBag,
      title: "Crypto Marketplace",
      description: "Shop online products and pay with cryptocurrency"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-orange-50/20 dark:from-slate-900 dark:via-slate-800/50 dark:to-orange-900/10 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10 dark:opacity-5"></div>
      
      <div className="max-w-4xl w-full space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            {/* Coynful Logo with Enhanced Glow */}
            <div className="relative ml-4">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-400 dark:from-orange-500 dark:to-amber-500 blur-3xl opacity-40 scale-150 animate-pulse"></div>
              <img 
                src={coynfulLogoPath} 
                alt="Coynful Logo" 
                className="h-28 w-auto relative z-10 drop-shadow-[0_0_50px_rgba(251,146,60,0.9)] hover:drop-shadow-[0_0_70px_rgba(251,146,60,1)] transition-all duration-500 hover:scale-105"
                loading="eager"
                decoding="async"
                style={{ imageRendering: 'auto' }}
                onLoad={() => console.log('Coynful logo loaded')}
              />
            </div>
          </div>
        </div>

        {/* Main CTA Card - Enhanced with Glassmorphism */}
        <Card className="bg-white/80 dark:bg-slate-900/80 border border-white/20 dark:border-slate-700/50 backdrop-blur-2xl max-w-lg mx-auto shadow-2xl hover:shadow-orange-200/20 dark:hover:shadow-orange-900/20 transition-all duration-500 hover:scale-[1.02]">
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
                {/* Web3 Wallet Options */}
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      {isMobile() ? (
                        <>
                          <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium mb-2">
                            📱 Mobile Detected
                          </span>
                          <br />
                          Tap to open in your wallet app
                        </>
                      ) : (
                        "Choose your preferred wallet to connect"
                      )}
                    </p>
                  </div>

                  {/* 2x2 Grid of Wallet Options */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* MetaMask */}
                    <Button 
                      onClick={() => handleWeb3Connect('metamask')}
                      className="h-26 bg-white/60 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-700/80 border border-white/30 dark:border-slate-600/50 text-slate-700 dark:text-slate-200 font-medium flex flex-col items-center justify-center group transition-all duration-300 space-y-3 backdrop-blur-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                      disabled={connectWalletMutation.isPending}
                      variant="outline"
                    >
                      <div className="w-10 h-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <img 
                          src={metamaskLogo} 
                          alt="MetaMask" 
                          className="w-8 h-8 object-contain"
                        />
                      </div>
                      <span className="text-sm font-semibold">MetaMask</span>
                    </Button>

                    {/* Trust Wallet */}
                    <Button 
                      onClick={() => handleWeb3Connect('trust')}
                      className="h-26 bg-white/60 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-700/80 border border-white/30 dark:border-slate-600/50 text-slate-700 dark:text-slate-200 font-medium flex flex-col items-center justify-center group transition-all duration-300 space-y-3 backdrop-blur-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                      disabled={connectWalletMutation.isPending}
                      variant="outline"
                    >
                      <div className="w-10 h-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <img 
                          src={trustWalletLogo} 
                          alt="Trust Wallet" 
                          className="w-8 h-8 object-contain"
                        />
                      </div>
                      <span className="text-sm font-semibold">Trust Wallet</span>
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or connect manually</span>
                  </div>
                </div>

                {/* Manual Input Form */}
                <form onSubmit={handleConnectWallet} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="walletAddress" className="text-foreground">
                      COYN Address
                    </Label>
                    <div className="relative">
                      <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="walletAddress"
                        type="text"
                        placeholder="0x1234...abcd"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        className="pl-10 h-12 sm:h-10 text-base sm:text-sm bg-input border-border focus:border-primary text-foreground"
                        required
                      />
                    </div>
                    {walletAddress && !isValidCoynAddress(walletAddress) && (
                      <p className="text-destructive text-xs">Please enter a valid COYN address (0x format)</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="text-foreground">
                      Display Name (Optional)
                    </Label>
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="Your Name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="h-12 sm:h-10 text-base sm:text-sm bg-input border-border focus:border-primary text-foreground"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium" 
                    disabled={!walletAddress || !isValidCoynAddress(walletAddress) || connectWalletMutation.isPending}
                  >
                    {connectWalletMutation.isPending ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                        <span>Connecting...</span>
                      </div>
                    ) : (
                      <>
                        <Wallet className="mr-2 h-4 w-4" />
                        Connect Manually
                      </>
                    )}
                  </Button>

                  {connectWalletMutation.error && (
                    <p className="text-red-500 dark:text-red-400 text-sm text-center">
                      {connectWalletMutation.error.message}
                    </p>
                  )}
                </form>
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
                      Open Messenger
                    </Button>
                    <Button
                      onClick={() => setLocation("/marketplace")}
                      variant="outline"
                      className="w-full border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white font-semibold rounded-lg h-14 sm:h-12 touch-manipulation"
                    >
                      <Globe className="mr-2 h-6 w-6 sm:h-5 sm:w-5" />
                      Explore Marketplace
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
                {['BTC', 'BNB', 'USDT', 'COYN'].map((currency) => (
                  <Badge key={currency} variant="secondary" className="text-xs">
                    {currency}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Grid - Moved below CTA */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-white dark:bg-slate-800/50 border-black dark:border-slate-700 backdrop-blur">
              <CardHeader className="pb-3">
                <feature.icon className="h-8 w-8 text-black dark:text-cyan-400 mb-2" />
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
        <div className="text-center mt-6 space-x-4">
          <button
            onClick={() => setShowTermsModal(true)}
            className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
          >
            Terms & Conditions
          </button>
          <span className="text-sm text-muted-foreground">•</span>
          <button
            onClick={() => setShowPrivacyModal(true)}
            className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
          >
            Privacy Policy
          </button>
        </div>

        {/* Powered by COYN */}
        <div className="text-center mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-center space-x-2 opacity-75 hover:opacity-100 transition-opacity">
            <span className="text-sm text-gray-600 dark:text-slate-400">Powered by</span>
            <img 
              src={coynLogoPath} 
              alt="COYN" 
              className="h-6 w-6 object-contain"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">COYN</span>
          </div>
        </div>
      </div>

      {/* Terms and Privacy Modals */}
      <TermsModal 
        isOpen={showTermsModal} 
        onClose={() => setShowTermsModal(false)} 
      />
      <PrivacyModal 
        isOpen={showPrivacyModal} 
        onClose={() => setShowPrivacyModal(false)} 
      />
    </div>
  );
}