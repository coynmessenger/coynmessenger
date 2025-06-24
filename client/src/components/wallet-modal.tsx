import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { WalletBalance } from "@shared/schema";
import { X, Send, QrCode, TrendingUp, TrendingDown } from "lucide-react";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const currencyIcons: { [key: string]: { color: string; symbol: string } } = {
  BTC: { color: "bg-orange-500", symbol: "₿" },
  ETH: { color: "bg-blue-500", symbol: "Ξ" },
  USDT: { color: "bg-green-500", symbol: "₮" },
  COYN: { color: "bg-cyan-500", symbol: "C" },
};

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { data: balances = [] } = useQuery<WalletBalance[]>({
    queryKey: ["/api/wallet/balances"],
    enabled: isOpen,
  });

  const totalBalance = balances.reduce((sum, balance) => {
    return sum + parseFloat(balance.usdValue || "0");
  }, 0);

  const formatBalance = (balance: string, currency: string) => {
    const num = parseFloat(balance);
    if (currency === "USDT") return num.toFixed(2);
    if (currency === "BTC") return num.toFixed(8);
    if (currency === "ETH") return num.toFixed(6);
    return num.toFixed(3);
  };

  const formatUSD = (value: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(value));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-50 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Wallet</DialogTitle>
        </DialogHeader>

        {/* Balance Section */}
        <div className="text-center mb-6">
          <div className="text-3xl font-bold text-cyan-400 mb-2">
            {formatUSD(totalBalance.toString())}
          </div>
          <div className="text-sm text-slate-400">Total Balance</div>
        </div>

        {/* Crypto Holdings */}
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {balances.map((balance) => {
            const icon = currencyIcons[balance.currency] || { color: "bg-gray-500", symbol: "?" };
            const changePercent = parseFloat(balance.changePercent || "0");
            const isPositive = changePercent >= 0;

            return (
              <Card key={balance.id} className="bg-slate-700 border-slate-600">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 ${icon.color} rounded-full flex items-center justify-center`}>
                        <span className="text-white text-sm font-bold">{icon.symbol}</span>
                      </div>
                      <div>
                        <div className="font-medium">
                          {formatBalance(balance.balance, balance.currency)} {balance.currency}
                        </div>
                        <div className="text-xs text-slate-400 capitalize">
                          {balance.currency === "BTC" ? "Bitcoin" : 
                           balance.currency === "ETH" ? "Ethereum" :
                           balance.currency === "USDT" ? "Tether" :
                           balance.currency === "COYN" ? "COYN Token" : balance.currency}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {formatUSD(balance.usdValue || "0")}
                      </div>
                      <div className={`text-xs flex items-center justify-end ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {isPositive ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {Math.abs(changePercent).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-6">
          <Button className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-900">
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
          <Button variant="secondary" className="flex-1">
            <QrCode className="h-4 w-4 mr-2" />
            Receive
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
