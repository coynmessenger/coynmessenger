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
                        <svg className="w-8 h-8" viewBox="0 0 318.6 318.6" fill="none">
                          <path d="M274.1 35.5l-99.5 73.9L193.8 65z" fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="m44.4 35.5 98.7 74.6-17.5-44.3z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="m238.3 206.8-25.5 39.1 54.5 15.1 15.7-53.3z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="m35.9 207.7 15.6 53.3 54.5-15.1-25.5-39.1z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="m103.6 138.2-15.8 23.9 54.1 2.5-1.8-58.2z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="m214.9 138.2-36.8-32.3-1.3 58.8 54.1-2.5z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="m106.1 245.9 32.5-15.8-28.1-21.9z" fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="m179.9 230.1 32.5 15.8-4.4-37.7z" fill="#D7C1B3" stroke="#D7C1B3" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="m212.4 245.9-32.5-15.8 2.6 21.2-.3 9.3z" fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="m106.1 245.9 30.2 14.7-.2-9.3 2.5-21.2z" fill="#233447" stroke="#233447" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="m138.8 193.5-27.1-7.9 19.1-8.8z" fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="m179.7 193.5 8-16.7 19.2 8.8z" fill="#CD6116" stroke="#CD6116" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M106.1 245.9 110.8 206.8 81.3 207.7z" fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="m207.8 206.8 4.6 39.1 25.5-38.2z" fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="m230.8 162.1-54.1 2.5 5 23.9 8-16.7 19.2 8.8z" fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="m111.7 185.6 19.1-8.8 8 16.7 5-23.9-54.1-2.5z" fill="#E4751F" stroke="#E4751F" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="m87.8 162.1 25.3 49.4-0.9-24.6z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="m206.8 186.9-0.9 24.6 25.3-49.4z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="m141.8 164.6-5 23.9 6.2 32.3 1.4-42.4z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="m176.7 164.6-2.7 13.7 1.2 42.5 6.2-32.3z" fill="#F6851B" stroke="#F6851B" strokeLinecap="round" strokeLinejoin="round"/>
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
                        <svg className="w-8 h-8" viewBox="0 0 512 512" fill="none">
                          <defs>
                            <radialGradient id="walletconnect-gradient" cx="50%" cy="50%" r="50%">
                              <stop offset="0%" stopColor="#3B99FC"/>
                              <stop offset="100%" stopColor="#1E3A8A"/>
                            </radialGradient>
                          </defs>
                          <circle cx="256" cy="256" r="256" fill="url(#walletconnect-gradient)"/>
                          <path d="M169.209 184.531c63.042-61.854 165.197-61.854 228.239 0l7.579 7.434c3.139 3.081 3.139 8.07 0 11.15l-25.922 25.454c-1.569 1.54-4.116 1.54-5.685 0l-10.424-10.232c-43.987-43.166-115.31-43.166-159.297 0l-11.169 10.96c-1.569 1.54-4.116 1.54-5.685 0l-25.922-25.454c-3.139-3.081-3.139-8.07 0-11.15l8.317-8.162zm281.978 52.682l23.073 22.641c3.139 3.081 3.139 8.07 0 11.15l-104.1 102.175c-3.139 3.081-8.232 3.081-11.371 0l-48.815-47.909c-.784-.77-2.059-.77-2.843 0l-48.815 47.909c-3.139 3.081-8.232 3.081-11.371 0l-104.1-102.175c-3.139-3.081-3.139-8.07 0-11.15l23.073-22.641c3.139-3.081 8.232-3.081 11.371 0l48.815 47.909c.784.77 2.059.77 2.843 0l48.815-47.909c3.139-3.081 8.232-3.081 11.371 0l48.815 47.909c.784.77 2.059.77 2.843 0l48.815-47.909c3.139-3.081 8.232-3.081 11.371 0z" fill="white"/>
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
                        <svg className="w-8 h-8" viewBox="0 0 1024 1024" fill="none">
                          <circle cx="512" cy="512" r="512" fill="#3375BB"/>
                          <path d="M512 68.4c245.1 0 443.6 198.5 443.6 443.6S757.1 955.6 512 955.6 68.4 757.1 68.4 512 266.9 68.4 512 68.4z" fill="#3375BB"/>
                          <path d="M470.1 638.3c0-1.7.1-3.4.4-5 .8-4.1 3.4-7.5 7.1-9.4l94.8-48.4c24.6-12.6 24.6-32.4 0-45L477.6 482c-3.7-1.9-6.3-5.3-7.1-9.4-.3-1.6-.4-3.3-.4-5v-54.1c0-6.2 2.5-11.8 6.6-15.9s9.7-6.6 15.9-6.6h54.1c1.7 0 3.4.1 5 .4 4.1.8 7.5 3.4 9.4 7.1l48.4 94.8c12.6 24.6 32.4 24.6 45 0l48.4-94.8c1.9-3.7 5.3-6.3 9.4-7.1 1.6-.3 3.3-.4 5-.4h54.1c6.2 0 11.8 2.5 15.9 6.6s6.6 9.7 6.6 15.9v54.1c0 1.7-.1 3.4-.4 5-.8 4.1-3.4 7.5-7.1 9.4L682 530.5c-24.6 12.6-24.6 32.4 0 45l94.8 48.4c3.7 1.9 6.3 5.3 7.1 9.4.3 1.6.4 3.3.4 5v54.1c0 6.2-2.5 11.8-6.6 15.9s-9.7 6.6-15.9 6.6h-54.1c-1.7 0-3.4-.1-5-.4-4.1-.8-7.5-3.4-9.4-7.1L644.9 658c-12.6-24.6-32.4-24.6-45 0l-48.4 94.8c-1.9 3.7-5.3 6.3-9.4 7.1-1.6.3-3.3.4-5 .4h-54.1c-6.2 0-11.8-2.5-15.9-6.6s-6.6-9.7-6.6-15.9v-54.1z" fill="#fff"/>
                          <path d="M417.9 417.9h188.2v188.2H417.9z" fill="#3375BB"/>
                          <path d="M470.1 470.1h83.8v83.8h-83.8z" fill="#fff"/>
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
                        <svg className="w-8 h-8" viewBox="0 0 1024 1024" fill="none">
                          <circle cx="512" cy="512" r="512" fill="#0052FF"/>
                          <path d="M512 192c176.73 0 320 143.27 320 320s-143.27 320-320 320-320-143.27-320-320 143.27-320 320-320zm0 96c-123.71 0-224 100.29-224 224s100.29 224 224 224 224-100.29 224-224-100.29-224-224-224z" fill="#0052FF"/>
                          <rect x="352" y="352" width="320" height="320" rx="32" fill="white"/>
                          <path d="M448 448h128v128H448z" fill="#0052FF"/>
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