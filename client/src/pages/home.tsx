import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, MessageCircle, Shield, Coins, ArrowRight, Check, Globe, Heart, ShoppingCart, ShoppingBag } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import coynLogoPath from "@assets/COYN-symbol-square_1751239261149.png";
import coynfulLogoPath from "@assets/Coynful-logo-fin-copy_1751239116310.png";
import metamaskLogo from "@assets/images(1)_1750925157265.png";
import walletConnectLogo from "@assets/walletconnect-logo-png_seeklogo-430923_1750925157245.png";
import trustWalletLogo from "@assets/Trust-Wallet-Shield-Logo-Vector-Logo-Vector.svg-_1750925157209.png";
import coinbaseLogo from "@assets/coinbase-logo_1750925157167.png";
import TermsModal from "@/components/terms-modal";
import PrivacyModal from "@/components/privacy-modal";
import type { User } from "@shared/schema";

// MetaMask type declarations
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      isMetaMask?: boolean;
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

  // Optimized user data fetching with React Query
  const { data: currentUserData } = useQuery({
    queryKey: ["/api/user", { userId: connectedUser?.id }],
    queryFn: () => connectedUser ? apiRequest("GET", `/api/user?userId=${connectedUser.id}`) : null,
    enabled: !!(isConnected && connectedUser?.id),
    staleTime: 2 * 60 * 1000, // Fresh for 2 minutes
    gcTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  // Update connected user when data changes
  useEffect(() => {
    if (currentUserData && currentUserData.displayName !== connectedUser?.displayName) {
      localStorage.setItem('connectedUser', JSON.stringify(currentUserData));
      setConnectedUser(currentUserData);
    }
  }, [currentUserData, connectedUser]);

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
      // Store connection state in localStorage
      localStorage.setItem('walletConnected', 'true');
      localStorage.setItem('connectedUser', JSON.stringify(user));
      localStorage.setItem('connectedUserId', user.id.toString());
      
      // Store display name for other components
      if (user.displayName) {
        localStorage.setItem('userDisplayName', user.displayName);
      }
      
      // Immediately update cache data for both query key patterns
      queryClient.setQueryData(["/api/user"], user);
      queryClient.setQueryData(["/api/user", user.id], user);
      
      // Invalidate user queries to ensure fresh data across all components
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user", user.id] });
      
      setConnectedUser(user);
      setIsConnected(true);
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

  const handleWeb3Connect = async (walletType: string) => {
    try {
      if (walletType === 'metamask') {
        if (typeof window.ethereum !== 'undefined') {
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
          window.open('https://metamask.io/download/', '_blank');
        }
      } else if (walletType === 'trust') {
        // Trust Wallet integration coming soon
        alert('Trust Wallet integration coming soon. Please use manual wallet address input for now.');
      } else {
        // For WalletConnect and Coinbase, show message that they need to use manual input
        alert(`${walletType === 'walletconnect' ? 'WalletConnect' : 'Coinbase Wallet'} integration coming soon. Please use manual wallet address input for now.`);
      }
    } catch (error) {
      console.error(`Failed to connect ${walletType} wallet:`, error);
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
                      Choose your preferred wallet to connect
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
                        {/* Enhanced MetaMask Logo */}
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center shadow-lg">
                          <svg viewBox="0 0 318.6 318.6" className="w-6 h-6 text-white fill-current">
                            <path d="M274.1,35.5L174.6,109.4l18.4-43.7L274.1,35.5z" fill="#E2761B"/>
                            <path d="M44.4,35.5l98.7,74.6l-17.5-44.3L44.4,35.5z" fill="#E4761B"/>
                            <path d="M238.3,206.8l-26.5,40.6l56.7,15.6l16.3-55.3L238.3,206.8z" fill="#E4761B"/>
                            <path d="M33.9,207.7l16.2,55.3l56.7-15.6l-26.5-40.6L33.9,207.7z" fill="#E4761B"/>
                            <path d="M103.6,138.2l-15.8,23.9l56.3,2.5l-2-60.5L103.6,138.2z" fill="#E4761B"/>
                            <path d="M214.9,138.2l-38.2-36.3l-1.3,61.2l56.3-2.5L214.9,138.2z" fill="#E4761B"/>
                          </svg>
                        </div>
                      </div>
                      <span className="text-sm font-semibold">MetaMask</span>
                    </Button>

                    {/* WalletConnect */}
                    <Button 
                      onClick={() => handleWeb3Connect('walletconnect')}
                      className="h-26 bg-white/60 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-700/80 border border-white/30 dark:border-slate-600/50 text-slate-700 dark:text-slate-200 font-medium flex flex-col items-center justify-center group transition-all duration-300 space-y-3 backdrop-blur-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                      disabled={connectWalletMutation.isPending}
                      variant="outline"
                    >
                      <div className="w-10 h-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        {/* Enhanced WalletConnect Logo */}
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
                          <svg viewBox="0 0 300 185" className="w-6 h-4 text-white fill-current">
                            <path d="M61.438 36.438c48.938-47.888 128.188-47.888 177.125 0l5.875 5.75c2.438 2.4 2.438 6.275 0 8.688l-20.125 19.688c-1.225 1.2-3.2 1.2-4.425 0l-8.1-7.925c-34.125-33.425-89.438-33.425-123.563 0l-8.675 8.488c-1.225 1.2-3.2 1.2-4.425 0L54.938 50.876c-2.438-2.413-2.438-6.288 0-8.688l6.5-5.75zm218.5 40.713l17.9 17.525c2.438 2.4 2.438 6.275 0 8.688L223.763 175.9c-2.437 2.4-6.387 2.4-8.825 0l-73.1-71.525c-.612-.6-1.6-.6-2.212 0l-73.1 71.525c-2.438 2.4-6.388 2.4-8.825 0L-15.375 102.364c-2.438-2.413-2.438-6.288 0-8.688l17.9-17.525c2.437-2.4 6.387-2.4 8.825 0l73.1 71.513c.612.6 1.6.6 2.212 0l73.1-71.513c2.438-2.4 6.388-2.4 8.825 0l73.1 71.513c.613.6 1.6.6 2.213 0l73.1-71.513c2.437-2.4 6.387-2.4 8.825 0z"/>
                          </svg>
                        </div>
                      </div>
                      <span className="text-sm font-semibold">WalletConnect</span>
                    </Button>

                    {/* Trust Wallet */}
                    <Button 
                      onClick={() => handleWeb3Connect('trust')}
                      className="h-26 bg-white/60 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-700/80 border border-white/30 dark:border-slate-600/50 text-slate-700 dark:text-slate-200 font-medium flex flex-col items-center justify-center group transition-all duration-300 space-y-3 backdrop-blur-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                      disabled={connectWalletMutation.isPending}
                      variant="outline"
                    >
                      <div className="w-10 h-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        {/* Enhanced Trust Wallet Logo */}
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center shadow-lg">
                          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                            <path d="M12 2L2 7v3c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                            <path d="M10 17l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" fill="white"/>
                          </svg>
                        </div>
                      </div>
                      <span className="text-sm font-semibold">Trust Wallet</span>
                    </Button>

                    {/* Coinbase Wallet */}
                    <Button 
                      onClick={() => handleWeb3Connect('coinbase')}
                      className="h-26 bg-white/60 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-700/80 border border-white/30 dark:border-slate-600/50 text-slate-700 dark:text-slate-200 font-medium flex flex-col items-center justify-center group transition-all duration-300 space-y-3 backdrop-blur-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                      disabled={connectWalletMutation.isPending}
                      variant="outline"
                    >
                      <div className="w-10 h-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        {/* Enhanced Coinbase Logo */}
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
                          <div className="w-4 h-4 bg-white rounded flex items-center justify-center">
                            <span className="text-blue-600 font-bold text-xs">C</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-sm font-semibold">Coinbase</span>
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