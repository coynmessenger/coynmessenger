import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Wallet, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SiBitcoin, SiBinance } from "react-icons/si";
import coynLogo from "@assets/COYN-symbol-square_1750892698348.png";
import type { WalletBalance, User } from "@shared/schema";

interface WalletHoverProps {
  isVisible: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
}

const getCurrencyIcon = (currency: string) => {
  switch (currency) {
    case "BTC": 
      return <SiBitcoin className="w-6 h-6 text-orange-500" />;
    case "BNB": 
      return <SiBinance className="w-6 h-6 text-yellow-500" />;
    case "USDT": 
      return <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
        <span className="text-white text-xs font-bold">₮</span>
      </div>;
    case "COYN": 
      return <img src={coynLogo} alt="COYN" className="w-6 h-6 rounded-full" />;
    default: 
      return <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
        <span className="text-white text-xs">?</span>
      </div>;
  }
};

export default function WalletHover({ isVisible, onClose, anchorRef }: WalletHoverProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const { toast } = useToast();

  // Fetch real wallet data
  const { data: balances = [] } = useQuery<WalletBalance[]>({
    queryKey: ["/api/wallet/balances"],
    enabled: isVisible,
  });

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
    enabled: isVisible,
  });

  useEffect(() => {
    if (isVisible && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const popupWidth = 320; // w-80 = 320px
      const viewportWidth = window.innerWidth;
      
      // Calculate left position to keep popup in viewport
      let leftPosition = rect.left - (popupWidth / 2) + (rect.width / 2);
      
      // Adjust if popup would go off-screen
      if (leftPosition < 8) {
        leftPosition = 8;
      } else if (leftPosition + popupWidth > viewportWidth - 8) {
        leftPosition = viewportWidth - popupWidth - 8;
      }
      
      setPosition({
        top: rect.bottom + 8,
        left: leftPosition
      });
    }
  }, [isVisible, anchorRef]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isVisible && anchorRef.current && !anchorRef.current.contains(event.target as Node)) {
        const popup = document.getElementById('wallet-hover-popup');
        if (popup && !popup.contains(event.target as Node)) {
          onClose();
        }
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, onClose, anchorRef]);

  const walletAddress = user?.walletAddress || "";
  
  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard"
      });
    }
  };

  const totalUSD = balances.reduce((total, balance) => {
    return total + parseFloat(balance.usdValue || "0");
  }, 0);

  const formatBalance = (balance: string, currency: string) => {
    const num = parseFloat(balance);
    if (currency === "USDT") return num.toFixed(2);
    if (currency === "BTC") return num.toFixed(8);
    if (currency === "BNB") return num.toFixed(6);
    return num.toFixed(3);
  };

  const formatUSD = (value: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(value || "0"));
  };

  if (!isVisible) return null;

  return (
    <div
      id="wallet-hover-popup"
      className="fixed z-[60] bg-background border border-border rounded-lg shadow-xl p-0 w-80"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Wallet className="h-5 w-5" />
          Wallet Overview
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Wallet Address */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Address</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyAddress}
              className="h-6 px-2"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <div className="bg-accent/50 rounded p-2">
            <code className="text-xs text-foreground break-all">
              {walletAddress}
            </code>
          </div>
        </div>

        <Separator />

        {/* Total Balance */}
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">Total Balance</p>
          <p className="text-2xl font-bold text-orange-500 dark:text-cyan-400">
            {formatUSD(totalUSD.toString())}
          </p>
        </div>

        <Separator />

        {/* Individual Balances */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Assets</p>
          {balances.map((balance) => (
            <div key={balance.currency} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center">
                  {getCurrencyIcon(balance.currency)}
                </div>
                <div>
                  <p className="font-medium text-foreground">{balance.currency}</p>
                  <p className="text-xs text-muted-foreground">{formatBalance(balance.balance, balance.currency)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-foreground">{formatUSD(balance.usdValue || "0")}</p>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              onClose();
              // Add send functionality here
            }}
          >
            Send
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              onClose();
              // Add receive functionality here
            }}
          >
            Receive
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (walletAddress) {
                window.open(`https://bscscan.com/address/${walletAddress}`, '_blank');
              }
            }}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </div>
  );
}