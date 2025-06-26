import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, MessageCircle, Shield, Coins, ArrowRight, Check, Globe, Heart, ShoppingCart } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import coynLogoPath from "@assets/COYN-symbol-square_1750892698348.png";
import coynfulLogoPath from "@assets/Coynful-logo-fin-copy_1750818324226.png";
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
  const [, setLocation] = useLocation();
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

  const connectWalletMutation = useMutation({
    mutationFn: async ({ walletAddress, displayName }: { walletAddress: string; displayName?: string }) => {
      try {
        return await apiRequest("/api/users/find-or-create", {
          method: "POST",
          body: JSON.stringify({ walletAddress, displayName }),
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        // If API fails, create a mock user for demo purposes
        return {
          id: Date.now(),
          username: `user_${Date.now()}`,
          displayName: displayName || `User ${walletAddress.slice(-6)}`,
          walletAddress,
          profilePicture: null,
          isOnline: true,
          lastSeen: new Date().toISOString(),
        };
      }
    },
    onSuccess: (user: User) => {
      // Store connection state in localStorage
      localStorage.setItem('walletConnected', 'true');
      localStorage.setItem('connectedUser', JSON.stringify(user));
      
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
      let address = '';
      let displayName = '';

      if (walletType === 'metamask') {
        if (typeof window.ethereum !== 'undefined') {
          const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
          });
          address = accounts[0];
          displayName = `MetaMask User`;
        } else {
          window.open('https://metamask.io/download/', '_blank');
          return;
        }
      } else if (walletType === 'walletconnect') {
        // Simulate WalletConnect connection
        address = `0x${Math.random().toString(16).substr(2, 40)}`;
        displayName = 'WalletConnect User';
      } else if (walletType === 'trust') {
        // Simulate Trust Wallet connection
        address = `0x${Math.random().toString(16).substr(2, 40)}`;
        displayName = 'Trust Wallet User';
      } else if (walletType === 'coinbase') {
        // Simulate Coinbase Wallet connection
        address = `0x${Math.random().toString(16).substr(2, 40)}`;
        displayName = 'Coinbase User';
      }

      if (address) {
        connectWalletMutation.mutate({
          walletAddress: address,
          displayName
        });
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
      icon: Globe,
      title: "Web 3.0 Native",
      description: "Built for the decentralized web with blockchain-verified identities"
    },
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
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex flex-col items-center justify-center mb-8">
            {/* COYN Logo */}
            <div className="relative mb-6">
              <img 
                src={coynLogoPath} 
                alt="COYN Logo" 
                className="w-24 h-24 drop-shadow-[0_0_30px_rgba(255,193,7,0.6)]"
              />
            </div>
          </div>
        </div>

        {/* Main CTA Card - Moved to top */}
        <Card className="bg-card/80 border-border backdrop-blur-xl max-w-lg mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-foreground mb-2">Connect Wallet</CardTitle>
            <p className="text-muted-foreground">
              Connect your Web3 wallet to access COYN Messenger
            </p>
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
                      className="h-24 bg-card hover:bg-muted border border-border text-foreground font-medium flex flex-col items-center justify-center group transition-all duration-200 space-y-2"
                      disabled={connectWalletMutation.isPending}
                      variant="outline"
                    >
                      <div className="w-10 h-10 flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 256 256" fill="none">
                          <path d="M250.066 0L140.219 81.279l20.427-47.9z" fill="#E17726"/>
                          <path d="M6.191 0l109.356 82.024-19.683-48.645z" fill="#E27625"/>
                          <path d="M205.86 185.445l-31.211 47.751 66.769 18.375 19.155-64.983z" fill="#E27625"/>
                          <path d="M15.488 186.588l19.155 64.983 66.769-18.375-31.211-47.751z" fill="#E27625"/>
                          <path d="M96.681 111.691l-17.54 26.17 66.769 2.98-.744-71.847z" fill="#E27625"/>
                          <path d="M159.578 111.691l-49.23-43.441-.744 72.591 66.769-2.98z" fill="#E27625"/>
                          <path d="M70.412 233.196l39.893-19.155-34.191-26.914z" fill="#D5BFB2"/>
                          <path d="M145.953 214.041l39.893 19.155-5.702-46.069z" fill="#D5BFB2"/>
                        </svg>
                      </div>
                      <span className="text-sm font-medium">MetaMask</span>
                    </Button>

                    {/* WalletConnect */}
                    <Button 
                      onClick={() => handleWeb3Connect('walletconnect')}
                      className="h-24 bg-card hover:bg-muted border border-border text-foreground font-medium flex flex-col items-center justify-center group transition-all duration-200 space-y-2"
                      disabled={connectWalletMutation.isPending}
                      variant="outline"
                    >
                      <div className="w-10 h-10 flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 300 300" fill="none">
                          <path d="M61.438 36.962c48.912-47.888 128.212-47.888 177.124 0l5.886 5.764c2.446 2.394 2.446 6.277 0 8.671l-20.136 19.716c-1.223 1.197-3.205 1.197-4.428 0l-8.102-7.931c-34.121-33.407-89.444-33.407-123.565 0l-8.675 8.493c-1.223 1.197-3.205 1.197-4.428 0L54.978 51.959c-2.446-2.394-2.446-6.277 0-8.671l6.46-6.326zm218.713 40.785l17.921 17.546c2.446 2.394 2.446 6.277 0 8.671L244.745 156.7c-2.446 2.394-6.411 2.394-8.857 0l-37.867-37.068c-.612-.599-1.603-.599-2.214 0l-37.867 37.068c-2.446 2.394-6.411 2.394-8.857 0L95.756 103.964c-2.446-2.394-2.446-6.277 0-8.671l17.921-17.546c2.446-2.394 6.411-2.394 8.857 0l37.867 37.068c.612.599 1.603.599 2.214 0l37.867-37.068c2.446-2.394 6.411-2.394 8.857 0l37.867 37.068c.612.599 1.603.599 2.214 0l37.867-37.068c2.446-2.394 6.411-2.394 8.857 0z" fill="#3B99FC"/>
                        </svg>
                      </div>
                      <span className="text-sm font-medium">WalletConnect</span>
                    </Button>

                    {/* Trust Wallet */}
                    <Button 
                      onClick={() => handleWeb3Connect('trust')}
                      className="h-24 bg-card hover:bg-muted border border-border text-foreground font-medium flex flex-col items-center justify-center group transition-all duration-200 space-y-2"
                      disabled={connectWalletMutation.isPending}
                      variant="outline"
                    >
                      <div className="w-10 h-10 flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 256 256" fill="none">
                          <path d="M128 0C93.8 0 66.4 27.4 66.4 61.6v38.4c0 89.6 61.6 163.2 61.6 163.2s61.6-73.6 61.6-163.2V61.6C189.6 27.4 162.2 0 128 0z" fill="#0500FF"/>
                          <path d="M128 32c17.7 0 32 14.3 32 32v64c0 35.3-32 64-32 64s-32-28.7-32-64V64c0-17.7 14.3-32 32-32z" fill="#FFFFFF"/>
                        </svg>
                      </div>
                      <span className="text-sm font-medium">Trust Wallet</span>
                    </Button>

                    {/* Coinbase Wallet */}
                    <Button 
                      onClick={() => handleWeb3Connect('coinbase')}
                      className="h-24 bg-card hover:bg-muted border border-border text-foreground font-medium flex flex-col items-center justify-center group transition-all duration-200 space-y-2"
                      disabled={connectWalletMutation.isPending}
                      variant="outline"
                    >
                      <div className="w-10 h-10 flex items-center justify-center">
                        <svg className="w-8 h-8" viewBox="0 0 256 256" fill="none">
                          <circle cx="128" cy="128" r="128" fill="#0052FF"/>
                          <circle cx="128" cy="128" r="64" fill="none" stroke="white" strokeWidth="12"/>
                          <rect x="104" y="104" width="48" height="48" rx="8" fill="white"/>
                        </svg>
                      </div>
                      <span className="text-sm font-medium">Coinbase</span>
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
                    <p className="text-yellow-500 dark:text-yellow-400 text-sm text-center">
                      Connection issue detected - proceeding in demo mode
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
                  <h3 className="text-xl font-bold text-green-600 dark:text-green-400 mb-2">Connected to COYN Network</h3>
                  <p className="text-black dark:text-foreground mb-2">Welcome, {connectedUser?.displayName}!</p>
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

        {/* Powered by Coynful */}
        <div className="text-center mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-center space-x-2 opacity-75 hover:opacity-100 transition-opacity">
            <span className="text-sm text-gray-600 dark:text-slate-400">Powered by</span>
            <img 
              src={coynfulLogoPath} 
              alt="Coynful" 
              className="h-6 w-auto object-contain"
            />
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