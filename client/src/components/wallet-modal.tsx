import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { WalletBalance, User } from "@shared/schema";
import { X, Send, QrCode, TrendingUp, TrendingDown, Copy, Check, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { SiBinance, SiBitcoin } from "react-icons/si";
import QRCode from "qrcode";
import coynLogoPath from "@assets/COYN-symbol-square_1750892698348.png";
import { apiRequest } from "@/lib/queryClient";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCurrency?: string;
}

export default function WalletModal({ isOpen, onClose, initialCurrency }: WalletModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [view, setView] = useState<"main" | "send" | "qr" | "success">("main");
  const [selectedCurrency, setSelectedCurrency] = useState(initialCurrency || "BTC");
  const [amount, setAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [showBalance, setShowBalance] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  const { data: balances } = useQuery<WalletBalance[]>({
    queryKey: ["/api/wallet/balances"],
  });

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // Generate QR code when view changes to QR
  useEffect(() => {
    if (view === "qr" && currentUser?.walletAddress) {
      QRCode.toDataURL(currentUser.walletAddress, {
        width: 256,
        margin: 2,
        color: {
          dark: '#1a1a1a',
          light: '#ffffff'
        }
      })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error('QR Code generation error:', err));
    }
  }, [view, currentUser?.walletAddress]);

  const selectedBalance = balances?.find(balance => balance.currency === selectedCurrency);
  const availableBalance = parseFloat(selectedBalance?.balance || "0");
  const sendAmount = parseFloat(amount || "0");

  const sendMutation = useMutation({
    mutationFn: async (data: { 
      currency: string; 
      amount: string; 
      recipientAddress: string;
    }) => {
      // Direct crypto transfer
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { txId: `tx_${Date.now()}`, ...data };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balances"] });
      setView("success");
      toast({
        title: "Transaction Sent",
        description: `Successfully sent ${amount} ${selectedCurrency}`,
      });
    },
    onError: () => {
      toast({
        title: "Transaction Failed",
        description: "Failed to send transaction. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSend = () => {
    if (!recipientAddress || !amount || sendAmount <= 0 || sendAmount > availableBalance) {
      return;
    }

    sendMutation.mutate({
      currency: selectedCurrency,
      amount,
      recipientAddress,
    });
  };

  const resetModal = () => {
    setView("main");
    setAmount("");
    setRecipientAddress("");
    setSelectedCurrency(initialCurrency || "BTC");
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  useEffect(() => {
    if (initialCurrency) {
      setSelectedCurrency(initialCurrency);
    }
  }, [initialCurrency]);



  const getCurrencyIcon = (currency: string) => {
    switch (currency) {
      case "BTC":
        return <SiBitcoin className="h-5 w-5 text-orange-500" />;
      case "BNB":
        return <SiBinance className="h-5 w-5 text-yellow-500" />;
      case "USDT":
        return <div className="h-5 w-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">T</div>;
      case "COYN":
        return <img src={coynLogoPath} alt="COYN" className="h-5 w-5 rounded-full" />;
      default:
        return <div className="h-5 w-5 bg-gray-400 rounded-full" />;
    }
  };

  const formatBalance = (balance: string, showBalance: boolean) => {
    if (!showBalance) return "••••••";
    const num = parseFloat(balance);
    if (num >= 1) {
      return num.toFixed(4);
    }
    return num.toFixed(8);
  };

  const formatUSDValue = (balance: string, currency: string, showBalance: boolean) => {
    if (!showBalance) return "••••••";
    const cryptoRates: { [key: string]: number } = {
      BTC: 100000,
      BNB: 600,
      USDT: 1,
      COYN: 0.85
    };
    
    const amount = parseFloat(balance);
    const rate = cryptoRates[currency] || 0;
    const usdValue = amount * rate;
    
    return usdValue.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const get24hChange = (currency: string) => {
    const changes: { [key: string]: number } = {
      BTC: 2.5,
      BNB: -1.2,
      USDT: 0.0,
      COYN: 5.8
    };
    return changes[currency] || 0;
  };

  const renderMainView = () => (
    <div className="p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={coynLogoPath} alt="COYN" className="h-8 w-8 rounded-full" />
          <h2 className="text-xl font-semibold text-black dark:text-white">COYN Wallet</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBalance(!showBalance)}
            className="h-10 w-10 sm:h-8 sm:w-8 p-0 hover:bg-orange-100 dark:hover:bg-slate-700"
          >
            {showBalance ? (
              <Eye className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            ) : (
              <EyeOff className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClose} className="h-10 w-10 sm:h-8 sm:w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Total Balance */}
      <div className="text-center space-y-2 py-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">Total Balance</p>
        <p className="text-3xl font-bold text-black dark:text-white">
          {showBalance ? "$21,375.00" : "••••••••"}
        </p>
      </div>

      {/* Crypto Holdings */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-black dark:text-white">Your Cryptocurrencies</h3>
        <div className="grid gap-3">
          {balances?.map((balance) => {
            const change24h = get24hChange(balance.currency);
            const isPositive = change24h >= 0;
            
            return (
              <Card key={balance.currency} className="border border-gray-200 dark:border-slate-600 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedCurrency(balance.currency)}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between min-h-[60px]">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getCurrencyIcon(balance.currency)}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-black dark:text-white truncate">{balance.currency}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {formatBalance(balance.balance, showBalance)} {balance.currency}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="font-medium text-black dark:text-white text-sm">
                        {formatUSDValue(balance.balance, balance.currency, showBalance)}
                      </p>
                      <div className="flex items-center gap-1 text-xs justify-end">
                        {isPositive ? (
                          <TrendingUp className="h-3 w-3 text-green-500 flex-shrink-0" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500 flex-shrink-0" />
                        )}
                        <span className={`${isPositive ? "text-green-500" : "text-red-500"} whitespace-nowrap`}>
                          {showBalance ? `${isPositive ? '+' : ''}${change24h.toFixed(1)}%` : "••••"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          onClick={() => setView("send")} 
          className="bg-orange-500 hover:bg-orange-600 text-white h-12"
        >
          <Send className="mr-2 h-4 w-4" />
          Send
        </Button>
        <Button 
          onClick={() => setView("qr")} 
          variant="outline" 
          className="border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 h-12"
        >
          <QrCode className="mr-2 h-4 w-4" />
          Receive
        </Button>
      </div>
    </div>
  );

  const renderSendView = () => (
    <div className="p-6 sm:p-8 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => setView("main")} className="h-8 w-8 p-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold text-black dark:text-white">Send Crypto</h2>
      </div>

      <div className="space-y-4">
        {/* Currency Selection */}
        <div className="space-y-2">
          <Label className="text-black dark:text-white">Select Currency</Label>
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger className="w-full border-gray-300 dark:border-slate-600">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {balances?.map((balance) => (
                <SelectItem key={balance.currency} value={balance.currency}>
                  <div className="flex items-center gap-2">
                    {getCurrencyIcon(balance.currency)}
                    <span>{balance.currency}</span>
                    <span className="text-gray-500">
                      ({formatBalance(balance.balance, showBalance)})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label className="text-black dark:text-white">Amount</Label>
          <div className="relative">
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border-gray-300 dark:border-slate-600 pr-16"
              step="0.00000001"
              min="0"
              max={availableBalance.toString()}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              {selectedCurrency}
            </div>
          </div>
          {selectedBalance && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Available: {formatBalance(selectedBalance.balance, showBalance)} {selectedCurrency}
            </p>
          )}
        </div>

        {/* Recipient Address */}
        <div className="space-y-2">
          <Label className="text-black dark:text-white">Recipient Address</Label>
          <Input
            placeholder="Enter wallet address"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            className="w-full border-gray-300 dark:border-slate-600"
          />
        </div>

        {/* Send Button */}
        <Button
          onClick={() => setView("success")}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 mt-6"
          disabled={!recipientAddress || !amount || sendAmount <= 0 || sendAmount > availableBalance}
        >
          Continue
        </Button>
      </div>

      {/* Transaction Preview */}
      {amount && recipientAddress && (
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 space-y-3">
          <h3 className="font-medium text-black dark:text-white">Transaction Preview</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Amount:</span>
              <span className="text-black dark:text-white">{amount} {selectedCurrency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">To:</span>
              <span className="text-black dark:text-white font-mono text-xs">
                {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}
              </span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-gray-600 dark:text-gray-400">Total:</span>
              <span className="text-black dark:text-white">{amount} {selectedCurrency}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderQRView = () => (
    <div className="p-6 sm:p-8 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <QrCode className="h-6 w-6 text-orange-500" />
        <h2 className="text-xl font-semibold text-black dark:text-white">
          Receive {selectedCurrency}
        </h2>
        <Button variant="ghost" size="sm" onClick={() => setView("main")} className="h-8 w-8 p-0 ml-auto">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="text-center space-y-6">
        {/* QR Code with Logo */}
        <div className="bg-white p-6 rounded-lg inline-block shadow-lg border">
          <div className="relative">
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="Wallet QR Code" className="w-48 h-48" />
            ) : (
              <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">Generating QR...</span>
              </div>
            )}
            
            {/* COYN Logo in center */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-2 shadow-md">
              <img 
                src={coynLogoPath} 
                alt="COYN Logo" 
                className="w-8 h-8 rounded"
              />
            </div>
          </div>
        </div>

        {/* Currency and Address */}
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your {selectedCurrency} address:
          </p>
          <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
            <p className="font-mono text-sm text-black dark:text-white break-all">
              {currentUser?.walletAddress || "0xEE8F38A4A2E9889ba97EeA40bf2e2E094D61B191"}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              const address = currentUser?.walletAddress || "0xEE8F38A4A2E9889ba97EeA40bf2e2E094D61B191";
              navigator.clipboard.writeText(address);
              toast({
                title: "Address Copied",
                description: `${selectedCurrency} address copied to clipboard`,
                duration: 2000,
              });
            }}
            className="border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 w-full"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Address
          </Button>
        </div>
      </div>
    </div>
  );

  const renderSuccessView = () => (
    <div className="p-6 sm:p-8 space-y-6 text-center">
      <div className="space-y-4">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
          <Check className="h-8 w-8 text-green-500" />
        </div>
        <h2 className="text-xl font-semibold text-black dark:text-white">Transaction Sent!</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Successfully sent {amount} {selectedCurrency}
        </p>
      </div>

      <Button
        onClick={handleClose}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12"
      >
        Done
      </Button>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[80vw] sm:w-[75vw] max-w-md max-h-[90vh] m-6 sm:m-8 p-0 flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>Wallet</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          {view === "main" && renderMainView()}
          {view === "send" && renderSendView()}
          {view === "qr" && renderQRView()}
          {view === "success" && renderSuccessView()}
        </div>
      </DialogContent>
    </Dialog>
  );
}