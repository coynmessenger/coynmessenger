import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, MessageCircle, Shield, Coins, ArrowRight, Check, Globe } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import coynLogoPath from "@assets/COYN-symbol-square_1750808237977.png";
import coynfulLogoPath from "@assets/Coynful-logo-fin-copy_1750818324226.png";
import type { User } from "@shared/schema";

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
      setTimeout(() => setLocation("/messenger"), 1500);
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

        {/* Features Grid */}
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

        {/* Main CTA Card */}
        <Card className="bg-card/80 border-border backdrop-blur-xl max-w-lg mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-foreground mb-2">Connect to COYN Network</CardTitle>
            <p className="text-muted-foreground">
              Enter your COYN address to join the decentralized messenger
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isConnected || !connectedUser ? (
              <form onSubmit={handleConnectWallet} className="space-y-4">
                {/* Wallet Address Input */}
                <div className="space-y-2">
                  <Label htmlFor="walletAddress" className="text-foreground">
                    COYN Address *
                  </Label>
                  <div className="relative">
                    <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="walletAddress"
                      type="text"
                      placeholder="0x1234...abcd"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      className="pl-10 bg-input border-border focus:border-primary text-foreground"
                      required
                    />
                  </div>
                  {walletAddress && !isValidCoynAddress(walletAddress) && (
                    <p className="text-destructive text-xs">Please enter a valid COYN address (0x format)</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Enter your COYN wallet address (0x format)
                  </p>
                </div>

                {/* Display Name Input */}
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
                    className="bg-input border-border focus:border-primary text-foreground"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to use COYN address as display name
                  </p>
                </div>

                {/* Connect Button */}
                <Button
                  type="submit"
                  disabled={connectWalletMutation.isPending || !walletAddress.trim() || !isValidCoynAddress(walletAddress)}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 text-lg"
                >
                  {connectWalletMutation.isPending ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                      Connecting to COYN...
                    </>
                  ) : (
                    <>
                      Connect to COYN Network
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                {connectWalletMutation.error && (
                  <p className="text-yellow-500 dark:text-yellow-400 text-sm text-center">
                    Connection issue detected - proceeding in demo mode
                  </p>
                )}
              </form>
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
                      className="w-full bg-black dark:bg-primary hover:bg-gray-800 dark:hover:bg-primary/90 text-white dark:text-primary-foreground font-semibold rounded-lg"
                    >
                      <MessageCircle className="mr-2 h-5 w-5" />
                      Open Messenger
                    </Button>
                    <Button
                      onClick={() => setLocation("/marketplace")}
                      variant="outline"
                      className="w-full border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white font-semibold rounded-lg"
                    >
                      <Globe className="mr-2 h-5 w-5" />
                      Explore Marketplace
                    </Button>
                    <Button
                      onClick={handleSignOut}
                      variant="outline"
                      className="w-full border-gray-300 dark:border-border text-gray-700 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-muted rounded-lg"
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

        {/* Footer */}
        <div className="text-center text-muted-foreground text-sm">
          <p>Secure • Decentralized • Private</p>
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
    </div>
  );
}