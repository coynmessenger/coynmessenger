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
      // Handle all transactions internally within COYN app
      // No external wallet redirects - everything happens in-app
      
      const storedUser = localStorage.getItem('connectedUser');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      
      if (!currentUser?.walletAddress) {
        throw new Error('No wallet address found. Please connect your wallet.');
      }

      // Get recipient's wallet address from conversation
      const conversationResponse = await fetch(`/api/conversations/${conversationId}`);
      const conversationData = await conversationResponse.json();
      const recipientId = conversationData.participants.find((p: any) => p.id !== connectedUserId)?.id;
      
      if (!recipientId) {
        throw new Error('Recipient not found in conversation.');
      }

      const recipientResponse = await fetch(`/api/user?userId=${recipientId}`);
      const recipientData = await recipientResponse.json();
      
      if (!recipientData.walletAddress) {
        throw new Error('Recipient wallet address not found.');
      }

      // Process transaction internally within COYN app - no external wallet redirects  
      // All transactions happen within the app interface
      try {
        // Send crypto transaction via internal app API
        const response = await apiRequest("POST", `/api/conversations/${conversationId}/messages`, {
          content: `Sent ${data.amount} ${data.currency}`,
          type: "crypto_transfer",
          senderId: connectedUserId,
          cryptoAmount: parseFloat(data.amount),
          cryptoCurrency: data.currency,
          fromWallet: currentUser.walletAddress,
          toWallet: recipientData.walletAddress
        });

        // Update sender's wallet balance internally
        const currentBalance = getMaxBalance(data.currency);
        const newBalance = currentBalance - parseFloat(data.amount);
        
        await apiRequest("PUT", "/api/wallet/balances", {
          userId: connectedUserId,
          currency: data.currency,
          balance: newBalance.toString()
        });

        return response;
      } catch (error) {
        throw new Error(`Failed to send crypto: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    onSuccess: () => {
      toast({
        title: "Crypto Sent Successfully",
        description: `${cryptoAmount} ${selectedCrypto} sent successfully through COYN app`,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balances", connectedUserId] });
      
      // Reset form
      setCryptoAmount("");
      setSelectedCrypto("");
      setShowCryptoModal(false);
      setShowCryptoMenu(false);
      setCryptoStep("amount");
    },
    onError: (error) => {
      toast({
        title: "Transaction Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendCrypto = (currency: string) => {
    if (isSelfConversation) {
      toast({
        title: "Cannot send to yourself",
        description: "Crypto transfers to yourself are not allowed.",
        variant: "destructive",
      });
      return;
    }

    setSelectedCrypto(currency);
    setShowCryptoModal(true);
    setShowCryptoMenu(false);
  };

  const handleConfirmSend = () => {
    if (!cryptoAmount || !selectedCrypto) return;
    
    const amount = parseFloat(cryptoAmount);
    const maxBalance = getMaxBalance(selectedCrypto);
    
    if (amount > maxBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You only have ${maxBalance.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${selectedCrypto}`,
        variant: "destructive",
      });
      return;
    }

    sendCryptoMutation.mutate({
      amount: cryptoAmount,
      currency: selectedCrypto
    });
  };

  const setMaxAmount = () => {
    const maxBalance = getMaxBalance(selectedCrypto);
    setCryptoAmount(maxBalance.toString());
  };

  if (isSelfConversation) return null;

  return (
    <>
      <Popover open={showCryptoMenu} onOpenChange={setShowCryptoMenu}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
            <Plus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="space-y-2">
            <Button
              onClick={() => handleSendCrypto('BTC')}
              className="w-full justify-start gap-2 bg-orange-500 hover:bg-orange-600 text-white"
              size="sm"
            >
              <FaBitcoin className="w-4 h-4" />
              Send BTC
            </Button>
            <Button
              onClick={() => handleSendCrypto('BNB')}
              className="w-full justify-start gap-2 bg-yellow-500 hover:bg-yellow-600 text-white"
              size="sm"
            >
              <SiBinance className="w-4 h-4" />
              Send BNB
            </Button>
            <Button
              onClick={() => handleSendCrypto('USDT')}
              className="w-full justify-start gap-2 bg-green-500 hover:bg-green-600 text-white"
              size="sm"
            >
              <SiTether className="w-4 h-4" />
              Send USDT
            </Button>
            <Button
              onClick={() => handleSendCrypto('COYN')}
              className="w-full justify-start gap-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white"
              size="sm"
            >
              <img src={coynLogoPath} alt="COYN" className="w-4 h-4" />
              Send COYN
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={showCryptoModal} onOpenChange={setShowCryptoModal}>
        <DialogContent className="sm:max-w-[425px] bg-white/95 backdrop-blur-lg border-orange-200">
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
                    step="any"
                    value={cryptoAmount}
                    onChange={(e) => setCryptoAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={setMaxAmount}
                    className="px-3 text-orange-600 border-orange-300 hover:bg-orange-50"
                  >
                    Max
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Available: {getMaxBalance(selectedCrypto).toLocaleString(undefined, { maximumFractionDigits: 8 })} {selectedCrypto}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCryptoModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => setCryptoStep("confirm")}
                  disabled={!cryptoAmount || parseFloat(cryptoAmount) <= 0}
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {cryptoStep === "confirm" && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">{cryptoAmount} {selectedCrypto}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction via:</span>
                  <span className="font-medium text-orange-600">COYN App</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setCryptoStep("amount")}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleConfirmSend}
                  disabled={sendCryptoMutation.isPending}
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                >
                  {sendCryptoMutation.isPending ? "Sending..." : "Confirm Send"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}