import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  X, 
  Send, 
  QrCode, 
  Eye, 
  EyeOff, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownLeft,
  Copy,
  Wallet,
  RefreshCw
} from "lucide-react";
import { SiBinance, SiBitcoin } from "react-icons/si";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WalletBalance, User } from "@shared/schema";
import coynLogoPath from "@assets/COYN-symbol-square_1750892698348.png";

interface WalletSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User;
}

export default function WalletSidebar({ isOpen, onClose, user }: WalletSidebarProps) {
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [showSendModal, setShowSendModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch wallet balances
  const { data: walletBalances = [], refetch: refetchBalances } = useQuery<WalletBalance[]>({
    queryKey: ["/api/wallet/balances"],
  });

  // Calculate total balance
  const totalBalance = walletBalances.reduce((sum, balance) => {
    return sum + parseFloat(balance.usdValue || "0");
  }, 0);

  // Currency configurations
  const currencyConfig: { [key: string]: { icon: JSX.Element; name: string; color: string } } = {
    BTC: { 
      icon: <SiBitcoin className="w-6 h-6 text-orange-500" />, 
      name: "Bitcoin", 
      color: "text-orange-500" 
    },
    BNB: { 
      icon: <SiBinance className="w-6 h-6 text-yellow-500" />, 
      name: "Binance Coin", 
      color: "text-yellow-500" 
    },
    USDT: { 
      icon: <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">₮</div>, 
      name: "Tether USD", 
      color: "text-green-500" 
    },
    COYN: { 
      icon: <img src={coynLogoPath} alt="COYN" className="w-6 h-6" />, 
      name: "COYN Token", 
      color: "text-amber-500" 
    },
  };

  // Send crypto mutation
  const sendCryptoMutation = useMutation({
    mutationFn: async ({ currency, amount, address }: { currency: string; amount: string; address: string }) => {
      return apiRequest("POST", "/api/wallet/send", { currency, amount, address });
    },
    onSuccess: () => {
      toast({
        title: "Transaction Sent",
        description: `Successfully sent ${sendAmount} ${selectedCurrency}`,
      });
      setShowSendModal(false);
      setSendAmount("");
      setRecipientAddress("");
      refetchBalances();
    },
    onError: () => {
      toast({
        title: "Transaction Failed",
        description: "Failed to send transaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSend = (currency: string) => {
    setSelectedCurrency(currency);
    setShowSendModal(true);
  };

  const handleConfirmSend = () => {
    if (!sendAmount || !recipientAddress) {
      toast({
        title: "Invalid Input",
        description: "Please enter amount and recipient address.",
        variant: "destructive",
      });
      return;
    }
    sendCryptoMutation.mutate({ 
      currency: selectedCurrency, 
      amount: sendAmount, 
      address: recipientAddress 
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Address copied to clipboard",
    });
  };

  const formatBalance = (balance: string, currency: string) => {
    if (!isBalanceVisible) return "••••••";
    const num = parseFloat(balance);
    if (currency === "BTC") return num.toFixed(6);
    if (currency === "USDT") return num.toFixed(2);
    return num.toFixed(4);
  };

  const formatUSD = (usd: string) => {
    if (!isBalanceVisible) return "••••••";
    return `$${parseFloat(usd).toLocaleString()}`;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-80 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-l border-gray-200/50 dark:border-gray-700/50 z-50 shadow-2xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">COYN Wallet</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Portfolio Overview</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                  className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {isBalanceVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Total Balance */}
          <div className="p-6">
            <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-700 border-orange-200/50 dark:border-gray-600/50 shadow-lg">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Total Portfolio Value</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatUSD(totalBalance.toString())}
                  </p>
                  <div className="flex items-center justify-center mt-2 space-x-1">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-500 font-medium">+2.4% (24h)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Assets */}
          <div className="flex-1 overflow-y-auto px-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assets</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchBalances()}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              
              {walletBalances.map((balance) => {
                const config = currencyConfig[balance.currency];
                if (!config) return null;

                return (
                  <Card key={balance.currency} className="bg-white/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {config.icon}
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {formatBalance(balance.balance, balance.currency)} {balance.currency}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {formatUSD(balance.usdValue || "0")}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSend(balance.currency)}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-400"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCurrency(balance.currency);
                              setShowQRModal(true);
                            }}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-400"
                          >
                            <QrCode className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="p-6 border-t border-gray-200/50 dark:border-gray-700/50">
            <div className="grid grid-cols-2 gap-3">
              <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg">
                <ArrowDownLeft className="w-4 h-4 mr-2" />
                Receive
              </Button>
              <Button variant="outline" className="border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-900/20">
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Send All
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Send Modal */}
      <Dialog open={showSendModal} onOpenChange={setShowSendModal}>
        <DialogContent className="sm:max-w-md bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {selectedCurrency && currencyConfig[selectedCurrency]?.icon}
              <span>Send {selectedCurrency}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                className="bg-white/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50"
              />
            </div>
            <div>
              <Label htmlFor="address">Recipient Address</Label>
              <Input
                id="address"
                placeholder="Enter wallet address"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="bg-white/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50"
              />
            </div>
            <div className="flex space-x-3 pt-4">
              <Button
                onClick={handleConfirmSend}
                disabled={sendCryptoMutation.isPending}
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
              >
                {sendCryptoMutation.isPending ? "Sending..." : "Send"}
              </Button>
              <Button variant="outline" onClick={() => setShowSendModal(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Modal */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="sm:max-w-md bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <QrCode className="w-5 h-5" />
              <span>Receive {selectedCurrency}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-center">
            <div className="w-48 h-48 bg-white border-2 border-gray-200 rounded-lg mx-auto flex items-center justify-center">
              <div className="text-gray-400">QR Code</div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Your {selectedCurrency} address:</p>
              <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <code className="flex-1 text-xs font-mono text-gray-800 dark:text-gray-200 break-all">
                  {user?.walletAddress || "0x742d35Cc6673C38C6438b5a5b7d4f73dB1d4C8ab"}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(user?.walletAddress || "0x742d35Cc6673C38C6438b5a5b7d4f73dB1d4C8ab")}
                  className="h-8 w-8 p-0"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}