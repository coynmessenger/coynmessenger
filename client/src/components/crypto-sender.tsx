import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Coins, Plus } from "lucide-react";
import { FaBitcoin } from "react-icons/fa";
import { SiBinance, SiTether } from "react-icons/si";
import coynLogoPath from "@assets/COYN-symbol-square_1750891892214.png";
import type { WalletBalance } from "@shared/schema";

const getCryptoIcon = (crypto: string) => {
  switch (crypto) {
    case 'BTC':
      return <FaBitcoin className="w-5 h-5 text-orange-500" />;
    case 'BNB':
      return <SiBinance className="w-5 h-5 text-yellow-500" />;
    case 'USDT':
      return <SiTether className="w-5 h-5 text-green-500" />;
    case 'COYN':
      return <img src={coynLogoPath} alt="COYN" className="w-5 h-5" />;
    default:
      return <Coins className="w-5 h-5" />;
  }
};

interface CryptoSenderProps {
  conversationId: number;
  connectedUserId: number;
  walletBalances: WalletBalance[];
  isSelfConversation: boolean;
}

export function CryptoSender({ conversationId, connectedUserId, walletBalances, isSelfConversation }: CryptoSenderProps) {
  const [showCryptoMenu, setShowCryptoMenu] = useState(false);
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const [cryptoAmount, setCryptoAmount] = useState("");
  const [selectedCrypto, setSelectedCrypto] = useState<string>("");
  const [cryptoStep, setCryptoStep] = useState<"amount" | "confirm">("amount");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const getMaxBalance = (currency: string) => {
    const balance = walletBalances.find(b => b.currency === currency);
    return balance ? parseFloat(balance.balance) : 0;
  };

  const sendCryptoMutation = useMutation({
    mutationFn: async (data: { amount: string; currency: string }) => {
      return apiRequest("POST", `/api/conversations/${conversationId}/messages`, {
        content: `Sent ${data.amount} ${data.currency}`,
        messageType: 'crypto_transfer',
        senderId: connectedUserId,
        cryptoAmount: parseFloat(data.amount),
        cryptoCurrency: data.currency
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/conversations", conversationId, "messages"] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/wallet/balances", connectedUserId] 
      });
      toast({
        title: "Crypto sent!",
        description: `${cryptoAmount} ${selectedCrypto} has been sent successfully`,
      });
      setShowCryptoModal(false);
      setCryptoAmount("");
      setSelectedCrypto("");
      setCryptoStep("amount");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send crypto. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleCryptoSend = (crypto: string) => {
    if (isSelfConversation) {
      toast({
        title: "Cannot send crypto",
        description: "You cannot send cryptocurrency to yourself",
        variant: "destructive"
      });
      return;
    }
    setSelectedCrypto(crypto);
    setShowCryptoModal(true);
    setShowCryptoMenu(false);
  };

  const handleConfirmSend = () => {
    if (!cryptoAmount || !selectedCrypto) return;
    
    const amount = parseFloat(cryptoAmount);
    const maxBalance = getMaxBalance(selectedCrypto);
    
    if (amount > maxBalance) {
      toast({
        title: "Insufficient balance",
        description: `You only have ${maxBalance} ${selectedCrypto} available`,
        variant: "destructive"
      });
      return;
    }
    
    sendCryptoMutation.mutate({ amount: cryptoAmount, currency: selectedCrypto });
  };

  const setMaxAmount = () => {
    const maxBalance = getMaxBalance(selectedCrypto);
    setCryptoAmount(maxBalance.toString());
  };

  if (isSelfConversation) {
    return null;
  }

  return (
    <>
      <Popover open={showCryptoMenu} onOpenChange={setShowCryptoMenu}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-gray-500 dark:text-slate-400 hover:text-primary dark:hover:text-orange-400 h-8 w-8 sm:h-8 sm:w-8 touch-manipulation"
          >
            <Plus className="h-4 w-4 sm:h-4 sm:w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-xl" align="start">
          <div className="space-y-2">
            <h3 className="font-medium text-gray-900 dark:text-slate-200 text-sm mb-3">Send Crypto</h3>
            <div className="grid grid-cols-2 gap-2">
              {['BTC', 'BNB', 'USDT', 'COYN'].map((crypto) => (
                <Button
                  key={crypto}
                  onClick={() => handleCryptoSend(crypto)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 h-10 transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  {getCryptoIcon(crypto)}
                  <span className="text-xs font-medium">{crypto}</span>
                </Button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={showCryptoModal} onOpenChange={setShowCryptoModal}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getCryptoIcon(selectedCrypto)}
              Send {selectedCrypto}
            </DialogTitle>
          </DialogHeader>
          
          {cryptoStep === "amount" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <div className="flex gap-2">
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={cryptoAmount}
                    onChange={(e) => setCryptoAmount(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={setMaxAmount}
                    variant="outline"
                    size="sm"
                    className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-600 dark:hover:bg-orange-900/20"
                  >
                    Max
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Available: {getMaxBalance(selectedCrypto)} {selectedCrypto}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowCryptoModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setCryptoStep("confirm")}
                  disabled={!cryptoAmount || parseFloat(cryptoAmount) <= 0}
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
          
          {cryptoStep === "confirm" && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold">{cryptoAmount} {selectedCrypto}</p>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Confirm this transaction
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => setCryptoStep("amount")}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirmSend}
                  disabled={sendCryptoMutation.isPending}
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                >
                  {sendCryptoMutation.isPending ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}