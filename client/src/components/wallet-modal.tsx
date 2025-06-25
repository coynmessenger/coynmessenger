import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { WalletBalance, User } from "@shared/schema";
import { X, Send, QrCode, TrendingUp, TrendingDown, Copy, Check, ArrowRight } from "lucide-react";
import QRCode from "qrcode";
import coynLogoPath from "@assets/COYN-symbol-square_1750808237977.png";
import { apiRequest } from "@/lib/queryClient";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  walletAddress: string;
}

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  balances: WalletBalance[];
  selectedCurrency: string;
  onCurrencyChange: (currency: string) => void;
}

const currencyIcons: { [key: string]: { color: string; symbol: string; isCoyn?: boolean } } = {
  BTC: { color: "bg-orange-500", symbol: "₿" },
  ETH: { color: "bg-blue-500", symbol: "Ξ" },
  USDT: { color: "bg-green-500", symbol: "₮" },
  COYN: { color: "bg-gradient-to-br from-cyan-400 to-blue-500", symbol: "C", isCoyn: true },
};

function QRCodeModal({ isOpen, onClose, currency, walletAddress }: QRModalProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && walletAddress) {
      QRCode.toDataURL(walletAddress, {
        width: 256,
        margin: 2,
        color: {
          dark: '#0f172a', // slate-900
          light: '#ffffff'
        }
      })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.error('QR Code generation error:', err));
    }
  }, [isOpen, walletAddress]);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-50 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            Receive {currency}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4">
          {qrCodeDataUrl && (
            <div className="bg-white p-4 rounded-xl">
              <img 
                src={qrCodeDataUrl} 
                alt={`${currency} wallet QR code`}
                className="w-48 h-48"
              />
            </div>
          )}
          
          <div className="text-center">
            <p className="text-sm text-slate-400 mb-2">Your {currency} Address</p>
            <div className="bg-slate-700 rounded-lg p-3 mb-3">
              <p className="text-xs font-mono break-all text-slate-200">
                {walletAddress}
              </p>
            </div>
            
            <Button
              onClick={handleCopyAddress}
              variant="secondary"
              className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-700 text-black dark:text-white"
              disabled={copied}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Address
                </>
              )}
            </Button>
          </div>
          
          <p className="text-xs text-gray-600 dark:text-slate-400 text-center">
            Scan this QR code or copy the address to receive {currency}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const [showQRCode, setShowQRCode] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("BTC");
  
  const { data: balances = [] } = useQuery<WalletBalance[]>({
    queryKey: ["/api/wallet/balances"],
    enabled: isOpen,
  });

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
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
          <div className="flex items-center justify-center space-x-3 mb-2">
            <img 
              src={coynLogoPath} 
              alt="COYN Logo" 
              className="w-8 h-8 drop-shadow-[0_0_15px_rgba(255,193,7,0.4)]"
            />
            <DialogTitle className="text-xl font-bold">COYN Wallet</DialogTitle>
          </div>
        </DialogHeader>

        {/* Balance Section */}
        <div className="text-center mb-6">
          <div className="text-3xl font-bold text-cyan-400 mb-2">
            {formatUSD(totalBalance.toString())}
          </div>
          <div className="text-sm text-slate-400">Total Balance</div>
        </div>

        {/* Crypto Holdings */}
        <div className="space-y-3 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600">
          {balances.map((balance) => {
            const icon = currencyIcons[balance.currency] || { color: "bg-gray-500", symbol: "?" };
            const changePercent = parseFloat(balance.changePercent || "0");
            const isPositive = changePercent >= 0;

            return (
              <Card key={balance.id} className="bg-slate-700 border-slate-600">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {icon.isCoyn ? (
                        <img 
                          src={coynLogoPath} 
                          alt="COYN" 
                          className="w-8 h-8 drop-shadow-[0_0_10px_rgba(255,193,7,0.4)]"
                        />
                      ) : (
                        <div className={`w-8 h-8 ${icon.color} rounded-full flex items-center justify-center`}>
                          <span className="text-sm font-bold text-white">{icon.symbol}</span>
                        </div>
                      )}
                      <div>
                        <div className="font-medium">
                          {formatBalance(balance.balance, balance.currency)} {balance.currency}
                        </div>
                        <div className="text-xs text-slate-400 capitalize">
                          {balance.currency === "BTC" ? "Bitcoin" : 
                           balance.currency === "ETH" ? "Ethereum" :
                           balance.currency === "USDT" ? "Tether" :
                           balance.currency === "COYN" ? "COYN" : balance.currency}
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

        {/* Currency Selection for Receive */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Select Currency to Receive
          </label>
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-black dark:text-white">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
              {balances.map((balance) => {
                const icon = currencyIcons[balance.currency] || { color: "bg-gray-500", symbol: "?" };
                return (
                  <SelectItem key={balance.currency} value={balance.currency} className="text-black dark:text-white">
                    <div className="flex items-center space-x-2">
                      {icon.isCoyn ? (
                        <img 
                          src={coynLogoPath} 
                          alt="COYN" 
                          className="w-4 h-4 drop-shadow-[0_0_8px_rgba(255,193,7,0.3)]"
                        />
                      ) : (
                        <div className={`w-4 h-4 ${icon.color} rounded-full flex items-center justify-center`}>
                          <span className="text-xs font-bold text-white">
                            {icon.symbol}
                          </span>
                        </div>
                      )}
                      <span>{balance.currency}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-6">
          <Button className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-900">
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
          <Button 
            variant="secondary" 
            className="flex-1"
            onClick={() => setShowQRCode(true)}
          >
            <QrCode className="h-4 w-4 mr-2" />
            Receive
          </Button>
        </div>
      </DialogContent>

      {/* Send Modal */}
      <SendModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        balances={balances}
        selectedCurrency={selectedCurrency}
        onCurrencyChange={setSelectedCurrency}
      />

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={showQRCode}
        onClose={() => setShowQRCode(false)}
        currency={selectedCurrency}
        walletAddress={user?.walletAddress || ""}
      />
    </Dialog>
  );
}
