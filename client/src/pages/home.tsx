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
import type { User } from "@shared/schema";

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [walletAddress, setWalletAddress] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUser, setConnectedUser] = useState<User | null>(null);

  const connectWalletMutation = useMutation({
    mutationFn: async ({ walletAddress, displayName }: { walletAddress: string; displayName?: string }) => {
      return apiRequest("/api/users/find-or-create", {
        method: "POST",
        body: JSON.stringify({ walletAddress, displayName }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: (user: User) => {
      setConnectedUser(user);
      setIsConnected(true);
      setTimeout(() => setLocation("/messenger"), 1500);
    },
  });

  const handleConnectWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress.trim() || !isValidEthereumAddress(walletAddress)) return;
    
    connectWalletMutation.mutate({
      walletAddress: walletAddress.trim(),
      displayName: displayName.trim() || undefined,
    });
  };

  const isValidEthereumAddress = (address: string) => {
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
      description: "Send BTC, ETH, USDT, and COYN directly in your chats"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
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
            <div className="relative mb-4">
              {/* Glowing effect background */}
              <div className="absolute inset-0 text-6xl font-bold tracking-[0.2em] text-cyan-400/30 blur-sm">
                COYN
              </div>
              {/* Main neon text */}
              <h1 className="relative text-6xl font-bold tracking-[0.2em] text-cyan-400 drop-shadow-[0_0_30px_rgba(34,211,238,0.8)]">
                COYN
              </h1>
            </div>
            <div className="relative">
              {/* Glowing effect background for Messenger */}
              <div className="absolute inset-0 text-2xl font-light text-cyan-300/30 blur-sm">
                Messenger
              </div>
              {/* Main Messenger text */}
              <h2 className="relative text-2xl font-light text-cyan-300 drop-shadow-[0_0_20px_rgba(103,232,249,0.6)]">
                Messenger
              </h2>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader className="pb-3">
                <feature.icon className="h-8 w-8 text-cyan-400 mb-2" />
                <CardTitle className="text-lg text-white">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main CTA Card */}
        <Card className="bg-slate-800/70 border-slate-700 backdrop-blur-xl max-w-lg mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white mb-2">Connect to Web 3.0</CardTitle>
            <p className="text-slate-400">
              Enter your wallet address to join the decentralized messenger
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isConnected ? (
              <form onSubmit={handleConnectWallet} className="space-y-4">
                {/* Wallet Address Input */}
                <div className="space-y-2">
                  <Label htmlFor="walletAddress" className="text-slate-300">
                    Wallet Address *
                  </Label>
                  <div className="relative">
                    <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      id="walletAddress"
                      type="text"
                      placeholder="0x1234...abcd"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      className="pl-10 bg-slate-700 border-slate-600 focus:border-cyan-500 text-white"
                      required
                    />
                  </div>
                  {walletAddress && !isValidEthereumAddress(walletAddress) && (
                    <p className="text-red-400 text-xs">Please enter a valid Ethereum address</p>
                  )}
                </div>

                {/* Display Name Input */}
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-slate-300">
                    Display Name (Optional)
                  </Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Your Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-slate-700 border-slate-600 focus:border-cyan-500 text-white"
                  />
                  <p className="text-xs text-slate-400">
                    Leave empty to use wallet address as display name
                  </p>
                </div>

                {/* Connect Button */}
                <Button
                  type="submit"
                  disabled={connectWalletMutation.isPending || !walletAddress.trim() || !isValidEthereumAddress(walletAddress)}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold py-3 text-lg"
                >
                  {connectWalletMutation.isPending ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full mr-2" />
                      Connecting to Web 3.0...
                    </>
                  ) : (
                    <>
                      Connect to Web 3.0
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                {connectWalletMutation.error && (
                  <p className="text-red-400 text-sm text-center">
                    Failed to connect. Please try again.
                  </p>
                )}
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Check className="h-8 w-8 text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-green-400 mb-2">Connected to Web 3.0</h3>
                  <p className="text-slate-300 mb-2">Welcome, {connectedUser?.displayName}!</p>
                  <p className="text-xs text-slate-500 font-mono break-all px-4">
                    {connectedUser?.walletAddress}
                  </p>
                </div>
                <p className="text-slate-400 text-sm">Launching messenger...</p>
              </div>
            )}

            {/* Supported Currencies */}
            <div className="border-t border-slate-700 pt-4">
              <p className="text-center text-slate-400 mb-3 text-sm">Supported Currencies</p>
              <div className="flex justify-center space-x-3 flex-wrap gap-2">
                {['BTC', 'ETH', 'USDT', 'COYN'].map((currency) => (
                  <Badge key={currency} variant="secondary" className="bg-slate-700 text-slate-300 text-xs">
                    {currency}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-slate-500 text-sm">
          <p>Secure • Decentralized • Private</p>
        </div>
      </div>
    </div>
  );
}