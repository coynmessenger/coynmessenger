import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { WalletBalance, User, Escrow } from "@shared/schema";
import { X, Send, QrCode, TrendingUp, TrendingDown, Copy, Check, ArrowLeft, Shield, Clock, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { SiBinance, SiBitcoin } from "react-icons/si";
import QRCode from "qrcode";
import coynLogoPath from "@assets/COYN-symbol-square_1750892698348.png";
import { apiRequest } from "@/lib/queryClient";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCurrency?: string;
}

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  balances: WalletBalance[];
}

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  walletAddress: string;
}

const currencyIcons: { [key: string]: { color: string; symbol: string; isCoyn?: boolean } } = {
  BTC: { color: "bg-orange-500", symbol: "₿" },
  BNB: { color: "bg-yellow-500", symbol: "⬢" },
  USDT: { color: "bg-green-500", symbol: "₮" },
  COYN: { color: "bg-gradient-to-br from-cyan-400 to-blue-500", symbol: "C", isCoyn: true },
};

const renderCurrencyIcon = (currency: string, size: "sm" | "md" | "lg" = "md") => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5", 
    lg: "w-6 h-6"
  };
  
  const iconSize = sizeClasses[size];
  
  switch (currency) {
    case "BTC":
      return <SiBitcoin className={`${iconSize} text-orange-500`} />;
    case "BNB":
      return <SiBinance className={`${iconSize} text-yellow-500`} />;
    case "COYN":
      return <img src={coynLogoPath} alt="COYN" className={`${iconSize} rounded-full`} />;
    default:
      const icon = currencyIcons[currency] || { color: "bg-gray-500", symbol: "?" };
      return (
        <div className={`${iconSize} ${icon.color} rounded-full flex items-center justify-center`}>
          <span className="text-xs font-bold text-white">{icon.symbol}</span>
        </div>
      );
  }
};

function SendModal({ isOpen, onClose, balances }: SendModalProps) {
  const [selectedCurrency, setSelectedCurrency] = useState("BTC");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [useEscrow, setUseEscrow] = useState(false);
  const [escrowDescription, setEscrowDescription] = useState("");
  const [step, setStep] = useState<"form" | "confirm" | "success">("form");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const selectedBalance = balances.find(b => b.currency === selectedCurrency);
  const availableBalance = parseFloat(selectedBalance?.balance || "0");
  const sendAmount = parseFloat(amount || "0");

  const sendMutation = useMutation({
    mutationFn: async (data: { 
      currency: string; 
      amount: string; 
      recipientAddress: string; 
      useEscrow: boolean;
      escrowDescription?: string;
    }) => {
      if (data.useEscrow) {
        // Create escrow transaction
        const response = await apiRequest("/api/escrow", {
          method: "POST",
          body: JSON.stringify({
            participant1Currency: data.currency,
            participant1Amount: data.amount,
            participant2Currency: data.currency,
            participant2Amount: data.amount,
            description: data.escrowDescription || "Wallet transfer",
            recipientAddress: data.recipientAddress,
          }),
          headers: { "Content-Type": "application/json" },
        });
        return { ...response, isEscrow: true };
      } else {
        // Regular direct transfer
        await new Promise(resolve => setTimeout(resolve, 2000));
        return { txId: `tx_${Date.now()}`, ...data, isEscrow: false };
      }
    },
    onSuccess: (data) => {
      setStep("success");
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: data.isEscrow ? "Escrow Created" : "Transaction Sent",
        description: data.isEscrow 
          ? `Created escrow for ${amount} ${selectedCurrency}` 
          : `Successfully sent ${amount} ${selectedCurrency}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Transaction Failed",
        description: "Failed to send transaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!recipientAddress || !amount || sendAmount <= 0 || sendAmount > availableBalance) {
      toast({
        title: "Invalid Input",
        description: "Please check recipient address and amount",
        variant: "destructive",
      });
      return;
    }
    setStep("confirm");
  };

  const handleConfirm = () => {
    sendMutation.mutate({
      currency: selectedCurrency,
      amount,
      recipientAddress,
      useEscrow,
      escrowDescription,
    });
  };

  const handleClose = () => {
    setStep("form");
    setRecipientAddress("");
    setAmount("");
    setUseEscrow(false);
    setEscrowDescription("");
    onClose();
  };

  const formatBalance = (balance: string, currency: string) => {
    const num = parseFloat(balance);
    if (currency === "USDT") return num.toFixed(2);
    if (currency === "BTC") return num.toFixed(8);
    if (currency === "ETH") return num.toFixed(6);
    return num.toFixed(3);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-black dark:text-slate-50 max-w-lg w-[90vw] sm:w-[85vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6 m-4 sm:m-6">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            {step !== "form" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => step === "confirm" ? setStep("form") : handleClose()}
                className="p-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle className="text-xl font-bold text-black dark:text-white">
              {step === "form" ? "Send Crypto" : step === "confirm" ? "Confirm Transaction" : "Transaction Sent"}
            </DialogTitle>
          </div>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-4">
            {/* Currency Selection */}
            <div className="space-y-2">
              <Label className="text-black dark:text-white">Currency</Label>
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                <SelectTrigger className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-black dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                  {balances.map((balance) => (
                      <SelectItem key={balance.currency} value={balance.currency} className="text-black dark:text-white">
                        <div className="flex items-center space-x-2">
                          {renderCurrencyIcon(balance.currency, "sm")}
                          <span>{balance.currency}</span>
                          <span className="text-gray-500 dark:text-slate-400 text-sm">
                            {formatBalance(balance.balance, balance.currency)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {selectedBalance && (
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Available: {formatBalance(selectedBalance.balance, selectedCurrency)} {selectedCurrency}
                </p>
              )}
            </div>

            {/* Recipient Address */}
            <div className="space-y-2">
              <Label className="text-black dark:text-white">Recipient Address</Label>
              <Input
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="Enter wallet address"
                className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-black dark:text-white"
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label className="text-black dark:text-white">Amount</Label>
              <div className="flex space-x-2">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-black dark:text-white"
                />
                <Button
                  variant="outline"
                  onClick={() => setAmount(selectedBalance?.balance || "0")}
                  className="border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200"
                >
                  Max
                </Button>
              </div>
              {sendAmount > availableBalance && (
                <p className="text-red-500 text-sm">Insufficient balance</p>
              )}
            </div>

            {/* Escrow Option */}
            <div className="space-y-3 border-t border-gray-200 dark:border-slate-600 pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="escrow"
                  checked={useEscrow}
                  onCheckedChange={(checked) => setUseEscrow(checked as boolean)}
                />
                <Label htmlFor="escrow" className="text-black dark:text-white font-medium">
                  Use Escrow (Secure Transaction)
                </Label>
              </div>
              {useEscrow && (
                <div className="space-y-2">
                  <Label className="text-black dark:text-white text-sm">Transaction Description</Label>
                  <Textarea
                    value={escrowDescription}
                    onChange={(e) => setEscrowDescription(e.target.value)}
                    placeholder="Describe what this transaction is for..."
                    className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-black dark:text-white text-sm"
                    rows={2}
                  />
                  <p className="text-xs text-gray-600 dark:text-slate-400">
                    Escrow protects both parties. Funds are held securely until both parties confirm the transaction.
                  </p>
                </div>
              )}
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={!recipientAddress || !amount || sendAmount <= 0 || sendAmount > availableBalance || (useEscrow && !escrowDescription.trim())}
                className="flex-1 bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white"
              >
                {useEscrow ? "Create Escrow" : "Continue"}
              </Button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-slate-400">Type:</span>
                <span className="font-medium text-black dark:text-white">
                  {useEscrow ? "Escrow Transaction" : "Direct Transfer"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-slate-400">Currency:</span>
                <span className="font-medium text-black dark:text-white">{selectedCurrency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-slate-400">Amount:</span>
                <span className="font-medium text-black dark:text-white">{amount} {selectedCurrency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-slate-400">To:</span>
                <span className="font-mono text-sm text-black dark:text-white break-all">
                  {recipientAddress.slice(0, 8)}...{recipientAddress.slice(-8)}
                </span>
              </div>
              {useEscrow && escrowDescription && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-slate-400">Description:</span>
                  <span className="text-sm text-black dark:text-white text-right max-w-48 break-words">
                    {escrowDescription}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-slate-400">Network Fee:</span>
                <span className="font-medium text-black dark:text-white">0.001 {selectedCurrency}</span>
              </div>
              {useEscrow && (
                <div className="mt-3 p-3 bg-orange-50 dark:bg-blue-900/20 rounded border border-orange-200 dark:border-blue-800">
                  <p className="text-xs text-orange-700 dark:text-blue-300">
                    ⚡ This transaction will be secured by escrow. Funds will be held until both parties confirm completion.
                  </p>
                </div>
              )}
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                onClick={() => setStep("form")}
                variant="outline"
                className="flex-1 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200"
              >
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={sendMutation.isPending}
                className="flex-1 bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white"
              >
                {sendMutation.isPending 
                  ? (useEscrow ? "Creating Escrow..." : "Sending...") 
                  : (useEscrow ? "Create Escrow" : "Confirm Send")}
              </Button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
                {useEscrow ? "Escrow Created!" : "Transaction Sent!"}
              </h3>
              <p className="text-gray-600 dark:text-slate-400">
                {useEscrow 
                  ? `Created secure escrow for ${amount} ${selectedCurrency}` 
                  : `Successfully sent ${amount} ${selectedCurrency}`}
              </p>
              {useEscrow && (
                <p className="text-xs text-orange-600 dark:text-blue-400 mt-2">
                  Funds are held securely until both parties confirm completion
                </p>
              )}
            </div>
            <Button
              onClick={handleClose}
              className="w-full bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EscrowListModal({ isOpen, onClose, escrows }: { isOpen: boolean; onClose: () => void; escrows: Escrow[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const releaseEscrowMutation = useMutation({
    mutationFn: async (escrowId: number) => {
      return await apiRequest(`/api/escrows/${escrowId}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/escrows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balances"] });
      toast({
        title: "Escrow Released",
        description: "Funds have been released successfully",
      });
    },
    onError: () => {
      toast({
        title: "Release Failed",
        description: "Failed to release escrow. Please try again.",
        variant: "destructive",
      });
    },
  });

  const cancelEscrowMutation = useMutation({
    mutationFn: async (escrowId: number) => {
      return await apiRequest(`/api/escrows/${escrowId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/escrows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balances"] });
      toast({
        title: "Escrow Cancelled",
        description: "Escrow has been cancelled and funds returned",
      });
    },
    onError: () => {
      toast({
        title: "Cancel Failed",
        description: "Failed to cancel escrow. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
      case "completed": return "text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800";
      case "cancelled": return "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800";
      default: return "text-gray-700 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-black dark:text-slate-50 w-[90vw] sm:w-[85vw] max-w-md max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6 m-4 sm:m-6">
        <DialogHeader className="pb-4 border-b border-gray-200 dark:border-slate-600">
          <DialogTitle className="text-xl font-bold text-black dark:text-white flex items-center">
            <Shield className="h-5 w-5 mr-2 text-orange-600 dark:text-cyan-400" />
            Escrow Management
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3">
          {escrows.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 dark:bg-slate-700 rounded-full p-4 mx-auto w-20 h-20 flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-gray-400 dark:text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-black dark:text-white mb-2">No Escrows Found</h3>
              <p className="text-gray-600 dark:text-slate-400">You don't have any escrow transactions yet.</p>
              <p className="text-sm text-gray-500 dark:text-slate-500 mt-1">Create secure transactions from the wallet send feature.</p>
            </div>
          ) : (
            escrows.map((escrow) => (
              <div key={escrow.id} className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-100 dark:bg-blue-900/30 rounded-full">
                      <Shield className="h-4 w-4 text-orange-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <span className="font-semibold text-black dark:text-white">
                        {escrow.initiatorRequiredAmount} {escrow.initiatorCurrency}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        Escrow #{escrow.id}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(escrow.status)}`}>
                    {escrow.status.charAt(0).toUpperCase() + escrow.status.slice(1)}
                  </span>
                </div>

                {escrow.description && (
                  <div className="bg-gray-50 dark:bg-slate-600 rounded-md p-2 mt-2">
                    <p className="text-sm text-gray-700 dark:text-slate-300">
                      "{escrow.description}"
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-slate-500">
                  <span>Created: {new Date(escrow.createdAt).toLocaleDateString()}</span>
                  {escrow.releasedAt && (
                    <span>Released: {new Date(escrow.releasedAt).toLocaleDateString()}</span>
                  )}
                </div>

                {escrow.status === "pending" && (
                  <div className="flex space-x-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => releaseEscrowMutation.mutate(escrow.id)}
                      disabled={releaseEscrowMutation.isPending}
                      className="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white text-xs font-medium"
                    >
                      {releaseEscrowMutation.isPending ? (
                        <>
                          <Clock className="h-3 w-3 mr-1 animate-spin" />
                          Releasing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Release Funds
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cancelEscrowMutation.mutate(escrow.id)}
                      disabled={cancelEscrowMutation.isPending}
                      className="flex-1 border-red-400 dark:border-red-300 text-red-700 dark:text-red-600 hover:bg-red-100 dark:hover:bg-red-50 text-xs font-medium"
                    >
                      {cancelEscrowMutation.isPending ? (
                        <>
                          <Clock className="h-3 w-3 mr-1 animate-spin" />
                          Cancelling...
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Cancel
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex justify-between items-center pt-4 flex-shrink-0 border-t border-gray-200 dark:border-slate-600">
          <div className="text-sm text-gray-600 dark:text-slate-400">
            {escrows.length} {escrows.length === 1 ? 'escrow' : 'escrows'} total
          </div>
          <Button onClick={onClose} variant="outline" className="border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
      <DialogContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-black dark:text-slate-50 w-[80vw] sm:w-[75vw] max-w-sm max-h-[85vh] overflow-y-auto p-6 sm:p-8 m-10 sm:m-12">
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

export default function WalletModal({ isOpen, onClose, initialCurrency }: WalletModalProps) {
  const [showQRCode, setShowQRCode] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showEscrowList, setShowEscrowList] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("BTC");
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

  // Pre-select currency when modal opens with initial currency
  useEffect(() => {
    if (initialCurrency && isOpen) {
      setSelectedCurrency(initialCurrency);
    }
  }, [initialCurrency, isOpen]);
  
  const { data: balances = [] } = useQuery<WalletBalance[]>({
    queryKey: ["/api/wallet/balances"],
    enabled: isOpen,
  });

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
    enabled: isOpen,
  });

  const { data: userEscrows = [] } = useQuery<Escrow[]>({
    queryKey: ["/api/user/escrows"],
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
      <DialogContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-black dark:text-slate-50 w-[90vw] sm:w-[85vw] max-w-md max-h-[90vh] overflow-y-auto flex flex-col p-4 sm:p-6 m-4 sm:m-6">
        <DialogHeader className="pb-2 sm:pb-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1">
              <img 
                src={coynLogoPath} 
                alt="COYN Logo" 
                className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-[0_0_15px_rgba(255,193,7,0.4)]"
              />
              <DialogTitle className="text-base sm:text-lg font-bold truncate">COYN Wallet</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsBalanceVisible(!isBalanceVisible)}
              className="h-12 w-12 sm:h-10 sm:w-10 p-0 hover:bg-gray-200 dark:hover:bg-slate-600 touch-manipulation rounded-full flex-shrink-0 ml-2"
            >
              {isBalanceVisible ? (
                <Eye className="h-6 w-6 sm:h-5 sm:w-5 text-gray-600 dark:text-muted-foreground" />
              ) : (
                <EyeOff className="h-6 w-6 sm:h-5 sm:w-5 text-gray-600 dark:text-muted-foreground" />
              )}
            </Button>
          </div>
        </DialogHeader>

        {/* Balance Section */}
        <div className="text-center mb-4 sm:mb-6 flex-shrink-0">
          <div className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-cyan-400 mb-2">
            {isBalanceVisible ? formatUSD(totalBalance.toString()) : "••••••"}
          </div>
          <div className="text-sm sm:text-base text-gray-600 dark:text-slate-400">Total Balance</div>
        </div>

        {/* Crypto Holdings */}
        <div className="space-y-3 sm:space-y-4 flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-1 sm:[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full dark:[&::-webkit-scrollbar-thumb]:bg-slate-600">
          {balances.map((balance) => {
            const changePercent = parseFloat(balance.changePercent || "0");
            const isPositive = changePercent >= 0;
            const portfolioPercent = totalBalance > 0 ? (parseFloat(balance.usdValue || "0") / totalBalance * 100) : 0;
            
            // Mock current prices for better display
            const currentPrices = {
              BTC: 43250.00,
              BNB: 312.45,
              USDT: 1.00,
              COYN: 0.125
            };
            
            const currentPrice = currentPrices[balance.currency as keyof typeof currentPrices] || 0;

            return (
              <Card key={balance.id} className="bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
                <CardContent className="p-4">
                  {/* Top Row - Asset Name & Value */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 flex items-center justify-center">
                        {renderCurrencyIcon(balance.currency, "lg")}
                      </div>
                      <div>
                        <div className="font-semibold text-black dark:text-white text-lg">
                          {balance.currency === "BTC" ? "Bitcoin" : 
                           balance.currency === "BNB" ? "Binance Coin" :
                           balance.currency === "USDT" ? "Tether USD" :
                           balance.currency === "COYN" ? "COYN Token" : balance.currency}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-slate-400 uppercase font-medium">
                          {balance.currency}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-black dark:text-white text-lg">
                        {isBalanceVisible ? formatUSD(balance.usdValue || "0") : "••••••"}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-slate-400">
                        {isBalanceVisible ? `${portfolioPercent.toFixed(1)}% of portfolio` : "••••••"}
                      </div>
                    </div>
                  </div>

                  {/* Middle Row - Balance & Price */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm text-gray-600 dark:text-slate-400">Balance</div>
                      <div className="font-medium text-black dark:text-white">
                        {isBalanceVisible ? `${formatBalance(balance.balance, balance.currency)} ${balance.currency}` : "••••••"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600 dark:text-slate-400">Current Price</div>
                      <div className="font-medium text-black dark:text-white">
                        {isBalanceVisible ? formatUSD(currentPrice.toString()) : "••••••"}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row - 24h Change & Performance */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-slate-600">
                    <div className="flex items-center space-x-2">
                      <div className="text-sm text-gray-600 dark:text-slate-400">24h Change</div>
                      <div className={`text-sm font-medium flex items-center ${isPositive ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                        {isPositive ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* Performance indicator */}
                      <div className={`w-2 h-2 rounded-full ${
                        portfolioPercent > 40 ? 'bg-green-500' :
                        portfolioPercent > 20 ? 'bg-yellow-500' :
                        portfolioPercent > 10 ? 'bg-orange-500' : 'bg-gray-400'
                      }`}></div>
                      <div className="text-sm text-gray-500 dark:text-slate-400">
                        {portfolioPercent > 40 ? 'Major holding' :
                         portfolioPercent > 20 ? 'Significant' :
                         portfolioPercent > 10 ? 'Moderate' : 'Minor holding'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Currency Selection for Receive */}
        <div className="mt-2 sm:mt-4 flex-shrink-0">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 sm:mb-2">
            Select Currency
          </label>
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-black dark:text-white h-8 sm:h-10 text-sm">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
              {balances.map((balance) => (
                  <SelectItem key={balance.currency} value={balance.currency} className="text-black dark:text-white">
                    <div className="flex items-center space-x-2">
                      {renderCurrencyIcon(balance.currency, "sm")}
                      <span>{balance.currency}</span>
                    </div>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Escrow Section */}
        {userEscrows.length > 0 && (
          <div className="mt-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-black dark:text-white">Active Escrows</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEscrowList(true)}
                className="text-orange-600 dark:text-cyan-400 hover:bg-orange-50 dark:hover:bg-cyan-900/20"
              >
                View All
              </Button>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {userEscrows.slice(0, 2).map((escrow) => (
                <div key={escrow.id} className="bg-orange-50 dark:bg-blue-900/20 border border-orange-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-orange-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-black dark:text-white">
                        {escrow.initiatorRequiredAmount} {escrow.initiatorCurrency}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {escrow.status === "pending" && <Clock className="h-3 w-3 text-yellow-500" />}
                      {escrow.status === "completed" && <CheckCircle className="h-3 w-3 text-green-500" />}
                      {escrow.status === "cancelled" && <AlertCircle className="h-3 w-3 text-red-500" />}
                      <span className="text-xs text-gray-600 dark:text-slate-400 capitalize">
                        {escrow.status}
                      </span>
                    </div>
                  </div>
                  {escrow.description && (
                    <p className="text-xs text-gray-600 dark:text-slate-400 mt-1 truncate">
                      {escrow.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-4 sm:mt-6 flex-shrink-0">
          <Button 
            className="bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white h-12 sm:h-11 text-base font-semibold touch-manipulation"
            onClick={() => setShowSendModal(true)}
          >
            <Send className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            Send
          </Button>
          <Button 
            variant="outline"
            className="border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 h-12 sm:h-11 text-base font-semibold touch-manipulation"
            onClick={() => setShowQRCode(true)}
          >
            <QrCode className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            Receive
          </Button>
          {userEscrows.length > 0 && (
            <Button 
              variant="outline"
              className="border-orange-300 dark:border-blue-600 text-orange-700 dark:text-blue-300 hover:bg-orange-50 dark:hover:bg-blue-900/20 col-span-2 h-12 sm:h-11 text-base font-semibold touch-manipulation"
              onClick={() => setShowEscrowList(true)}
            >
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Manage Escrows ({userEscrows.length})
            </Button>
          )}
        </div>
      </DialogContent>

      {/* Send Modal */}
      <SendModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        balances={balances}
      />

      {/* Escrow List Modal */}
      <EscrowListModal
        isOpen={showEscrowList}
        onClose={() => setShowEscrowList(false)}
        escrows={userEscrows}
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
