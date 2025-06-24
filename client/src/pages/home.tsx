import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, MessageCircle, Shield, Coins, ArrowRight, Check } from "lucide-react";

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    
    // Simulate wallet connection process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsConnecting(false);
    setIsConnected(true);
    
    // Redirect to messenger after successful connection
    setTimeout(() => {
      setLocation("/messenger");
    }, 1000);
  };

  const features = [
    {
      icon: MessageCircle,
      title: "Secure Messaging",
      description: "End-to-end encrypted conversations with your crypto contacts"
    },
    {
      icon: Coins,
      title: "Crypto Transfers",
      description: "Send BTC, ETH, USDT, and COYN directly in your chats"
    },
    {
      icon: Shield,
      title: "Escrow Trading",
      description: "Safe peer-to-peer trades with dual-currency escrow protection"
    },
    {
      icon: Wallet,
      title: "Wallet Integration",
      description: "Connect your wallet to manage balances and transactions"
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
              <div className="w-24 h-24 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-2xl font-bold text-slate-900 drop-shadow-[0_0_30px_rgba(34,211,238,0.6)]">
                C
              </div>
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
        <Card className="bg-slate-800/70 border-slate-700 backdrop-blur-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white mb-2">Ready to Get Started?</CardTitle>
            <p className="text-slate-400">
              Connect your crypto wallet to access secure messaging and trading features
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Wallet Connection Status */}
            <div className="flex items-center justify-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-slate-500'}`} />
              <span className="text-slate-300">
                {isConnected ? 'Wallet Connected' : 'Wallet Disconnected'}
              </span>
            </div>

            {/* Connect Button */}
            <div className="flex justify-center">
              <Button
                onClick={handleConnectWallet}
                disabled={isConnecting || isConnected}
                className={`
                  px-8 py-3 text-lg font-semibold transition-all duration-300
                  ${isConnected 
                    ? 'bg-green-600 hover:bg-green-500 text-white' 
                    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-900'
                  }
                `}
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full mr-2" />
                    Connecting...
                  </>
                ) : isConnected ? (
                  <>
                    <Check className="h-5 w-5 mr-2" />
                    Wallet Connected
                  </>
                ) : (
                  <>
                    <Wallet className="h-5 w-5 mr-2" />
                    Connect Wallet
                  </>
                )}
              </Button>
            </div>

            {isConnected && (
              <div className="text-center">
                <p className="text-green-400 mb-2">✅ Connection successful!</p>
                <p className="text-slate-400 text-sm">Redirecting to messenger...</p>
              </div>
            )}

            {/* Supported Currencies */}
            <div className="border-t border-slate-700 pt-6">
              <p className="text-center text-slate-400 mb-3">Supported Currencies</p>
              <div className="flex justify-center space-x-3 flex-wrap gap-2">
                {['BTC', 'ETH', 'USDT', 'COYN'].map((currency) => (
                  <Badge key={currency} variant="secondary" className="bg-slate-700 text-slate-300">
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