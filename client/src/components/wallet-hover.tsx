import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Wallet, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WalletHoverProps {
  isVisible: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
}

const mockWalletData = {
  address: "0x742d35Cc6234Aa5732B3C5D7C8F2e58b9",
  balances: [
    { currency: "BTC", amount: "0.08542137", usdValue: "8,274.23", icon: "₿" },
    { currency: "BNB", amount: "12.347", usdValue: "8,437.82", icon: "🔸" },
    { currency: "USDT", amount: "15,420.50", usdValue: "15,420.50", icon: "₮" },
    { currency: "COYN", amount: "25,892.18", usdValue: "63,436.84", icon: "🪙" }
  ]
};

export default function WalletHover({ isVisible, onClose, anchorRef }: WalletHoverProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const { toast } = useToast();

  useEffect(() => {
    if (isVisible && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.left - 150 // Center the popup relative to button
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

  const copyAddress = () => {
    navigator.clipboard.writeText(mockWalletData.address);
    toast({
      title: "Address Copied",
      description: "Wallet address copied to clipboard"
    });
  };

  const totalUSD = mockWalletData.balances.reduce((total, balance) => {
    return total + parseFloat(balance.usdValue.replace(/[,$]/g, ''));
  }, 0);

  if (!isVisible) return null;

  return (
    <div
      id="wallet-hover-popup"
      className="fixed z-50 bg-background border border-border rounded-lg shadow-xl p-0 w-80"
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
              {mockWalletData.address}
            </code>
          </div>
        </div>

        <Separator />

        {/* Total Balance */}
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">Total Balance</p>
          <p className="text-2xl font-bold text-orange-500 dark:text-cyan-400">
            ${totalUSD.toLocaleString()}
          </p>
        </div>

        <Separator />

        {/* Individual Balances */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Assets</p>
          {mockWalletData.balances.map((balance) => (
            <div key={balance.currency} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{balance.icon}</span>
                <div>
                  <p className="font-medium text-foreground">{balance.currency}</p>
                  <p className="text-xs text-muted-foreground">{balance.amount}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-foreground">${balance.usdValue}</p>
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
              window.open(`https://bscscan.com/address/${mockWalletData.address}`, '_blank');
            }}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </div>
  );
}