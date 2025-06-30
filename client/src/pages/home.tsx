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
    <div className="min-h-screen scan-lines grid-pattern relative overflow-hidden">
      {/* 90s Retro Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-retro-darker via-retro-dark to-purple-900/80"></div>
      
      <div className="max-w-4xl w-full space-y-8 relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
        {/* Header */}
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center mb-4">
            {/* COYN Logo with Neon Effects */}
            <div className="relative retro-float">
              <div className="absolute inset-0 neon-glow-cyan scale-150 opacity-60"></div>
              <img 
                src={coynfulLogoPath} 
                alt="COYN Logo" 
                className="h-32 w-auto relative z-10 neon-glow-pink retro-pulse"
                loading="eager"
                decoding="async"
                onLoad={() => console.log('Coynful logo loaded')}
              />
            </div>
          </div>
          
          {/* 90s Style Heading */}
          <div className="space-y-2">
            <h1 className="retro-heading text-4xl md:text-6xl font-black neon-flicker">
              COYN MESSENGER
            </h1>
            <p className="retro-text text-lg md:text-xl text-neon-cyan">
              The Future of Crypto Communication
            </p>
          </div>
        </div>

        {/* 90s Retro Wallet Connection Interface */}
        <div className="retro-card max-w-2xl mx-auto p-6 rounded-none">
          <div className="text-center space-y-6">
            <div className="retro-heading text-2xl md:text-3xl">
              {!isConnected || !connectedUser ? "CONNECT WALLET" : "SYSTEM CONNECTED"}
            </div>
            
            {(!isConnected || !connectedUser) && (
              <p className="retro-text text-neon-purple">
                &gt;&gt; INITIALIZE CRYPTO INTERFACE &lt;&lt;
              </p>
            )}
          </div>
          
          <div className="mt-8 space-y-6">
            {!isConnected || !connectedUser ? (
              <div className="space-y-6">
                {/* Retro Wallet Grid */}
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="retro-text text-neon-green">
                      SELECT WALLET PROTOCOL
                    </p>
                  </div>

                  {/* 2x2 Retro Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* MetaMask */}
                    <button 
                      onClick={() => handleWeb3Connect('metamask')}
                      className="retro-button h-24 flex flex-col items-center justify-center space-y-2 group disabled:opacity-50"
                      disabled={connectWalletMutation.isPending}
                    >
                      <div className="w-10 h-10 flex items-center justify-center">
                        <img src={metamaskLogo} alt="MetaMask" className="w-8 h-8 object-contain" />
                      </div>
                      <span className="text-xs font-black">METAMASK</span>
                    </button>

                    {/* WalletConnect */}
                    <button 
                      onClick={() => handleWeb3Connect('walletconnect')}
                      className="retro-button h-24 flex flex-col items-center justify-center space-y-2 group disabled:opacity-50"
                      disabled={connectWalletMutation.isPending}
                    >
                      <div className="w-10 h-10 flex items-center justify-center">
                        <img src={walletConnectLogo} alt="WalletConnect" className="w-8 h-8 object-contain" />
                      </div>
                      <span className="text-xs font-black">WALLET.CO</span>
                    </button>

                    {/* Trust Wallet */}
                    <button 
                      onClick={() => handleWeb3Connect('trust')}
                      className="retro-button h-24 flex flex-col items-center justify-center space-y-2 group disabled:opacity-50"
                      disabled={connectWalletMutation.isPending}
                    >
                      <div className="w-10 h-10 flex items-center justify-center">
                        <img src={trustWalletLogo} alt="Trust Wallet" className="w-8 h-8 object-contain" />
                      </div>
                      <span className="text-xs font-black">TRUST</span>
                    </button>

                    {/* Coinbase Wallet */}
                    <button 
                      onClick={() => handleWeb3Connect('coinbase')}
                      className="retro-button h-24 flex flex-col items-center justify-center space-y-2 group disabled:opacity-50"
                      disabled={connectWalletMutation.isPending}
                    >
                      <div className="w-10 h-10 flex items-center justify-center">
                        <img src={coinbaseLogo} alt="Coinbase" className="w-8 h-8 object-contain" />
                      </div>
                      <span className="text-xs font-black">COINBASE</span>
                    </button>
                  </div>
                </div>

                {/* 90s Retro Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t-2 border-neon-cyan" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="retro-text bg-retro-dark px-4 text-neon-yellow">
                      MANUAL PROTOCOL
                    </span>
                  </div>
                </div>

                {/* Retro Manual Input Form */}
                <form onSubmit={handleConnectWallet} className="space-y-6">
                  <div className="space-y-4">
                    <label className="retro-text block text-neon-green text-sm">
                      WALLET ADDRESS
                    </label>
                    <div className="relative">
                      <input
                        id="walletAddress"
                        type="text"
                        placeholder="0x1234...abcd"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        className="w-full h-12 px-4 bg-retro-darker border-2 border-neon-cyan rounded-none text-neon-cyan font-mono text-sm focus:border-neon-pink focus:outline-none"
                        required
                      />
                    </div>
                    {walletAddress && !isValidCoynAddress(walletAddress) && (
                      <p className="retro-text text-neon-pink text-xs">INVALID ADDRESS FORMAT</p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <label className="retro-text block text-neon-green text-sm">
                      DISPLAY NAME (OPTIONAL)
                    </label>
                    <input
                      id="displayName"
                      type="text"
                      placeholder="ENTER_NAME"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full h-12 px-4 bg-retro-darker border-2 border-neon-purple rounded-none text-neon-purple font-mono text-sm focus:border-neon-yellow focus:outline-none"
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="retro-button w-full h-12 disabled:opacity-50" 
                    disabled={!walletAddress || !isValidCoynAddress(walletAddress) || connectWalletMutation.isPending}
                  >
                    {connectWalletMutation.isPending ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        <span className="font-black">CONNECTING...</span>
                      </div>
                    ) : (
                      <span className="font-black">MANUAL CONNECT</span>
                    )}
                  </button>

                  {connectWalletMutation.error && (
                    <p className="retro-text text-neon-pink text-sm text-center">
                      ERROR: {connectWalletMutation.error.message}
                    </p>
                  )}
                </form>
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 neon-glow-green border-2 border-neon-green rounded-none flex items-center justify-center mx-auto retro-pulse">
                  <Check className="h-10 w-10 text-neon-green" />
                </div>
                <div>
                  <h3 className="retro-heading text-xl text-neon-green mb-2">SYSTEM ONLINE</h3>
                  <p className="retro-text text-neon-cyan mb-2">WELCOME TO COYN, {connectedUser?.displayName?.toUpperCase()}!</p>
                  <p className="retro-text text-neon-purple text-xs font-mono break-all px-4">
                    {connectedUser?.walletAddress}
                  </p>
                  <div className="space-y-4 mt-6">
                    <button
                      onClick={() => setLocation("/messenger")}
                      className="retro-button w-full h-14"
                    >
                      <MessageCircle className="mr-2 h-6 w-6" />
                      OPEN MESSENGER
                    </button>
                    <button
                      onClick={() => setLocation("/marketplace")}
                      className="retro-button w-full h-14"
                      style={{
                        background: "linear-gradient(145deg, var(--neon-purple), var(--neon-pink))",
                        border: "2px solid var(--neon-yellow)"
                      }}
                    >
                      <Globe className="mr-2 h-6 w-6" />
                      EXPLORE MARKETPLACE
                    </button>

                    <button
                      onClick={handleSignOut}
                      className="w-full h-14 bg-retro-darker border-2 border-neon-pink text-neon-pink hover:bg-retro-dark transition-all duration-300 font-black text-sm uppercase rounded-none"
                    >
                      SIGN OUT
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Retro Supported Currencies */}
            <div className="border-t-2 border-neon-cyan pt-6">
              <p className="text-center retro-text text-neon-yellow mb-4 text-sm">SUPPORTED PROTOCOLS</p>
              <div className="flex justify-center space-x-4 flex-wrap gap-2">
                {['BTC', 'BNB', 'USDT', 'COYN'].map((currency) => (
                  <span key={currency} className="px-3 py-1 bg-retro-darker border border-neon-green text-neon-green font-mono text-xs font-bold">
                    {currency}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 90s Retro Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {features.map((feature, index) => (
            <div key={index} className="retro-card p-4 rounded-none neon-flicker">
              <div className="text-center space-y-3">
                <feature.icon className="h-10 w-10 text-neon-cyan mx-auto neon-glow-cyan" />
                <h3 className="retro-heading text-sm text-neon-pink">{feature.title.toUpperCase()}</h3>
                <p className="retro-text text-neon-purple text-xs leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 90s Retro Footer */}
        <div className="text-center space-y-6">
          <div className="retro-text text-neon-green text-sm">
            <span className="animate-pulse">SECURE</span> • <span className="animate-pulse">DECENTRALIZED</span> • <span className="animate-pulse">PRIVATE</span>
          </div>
          
          {/* Legal Links */}
          <div className="flex justify-center space-x-6">
            <button
              onClick={() => setShowTermsModal(true)}
              className="retro-text text-neon-yellow hover:text-neon-cyan text-xs underline transition-colors"
            >
              TERMS & CONDITIONS
            </button>
            <button
              onClick={() => setShowPrivacyModal(true)}
              className="retro-text text-neon-yellow hover:text-neon-cyan text-xs underline transition-colors"
            >
              PRIVACY POLICY
            </button>
          </div>

          {/* Powered by COYN */}
          <div className="border-t-2 border-neon-cyan pt-6">
            <div className="flex items-center justify-center space-x-3 retro-pulse">
              <span className="retro-text text-neon-purple text-sm">POWERED BY</span>
              <img 
                src={coynLogoPath} 
                alt="COYN" 
                className="h-8 w-8 object-contain neon-glow-pink"
              />
              <span className="retro-heading text-sm text-neon-pink">COYN</span>
            </div>
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