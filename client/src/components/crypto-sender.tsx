import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveAccount, useActiveWallet, useSwitchActiveWalletChain } from "thirdweb/react";
import { apiRequest } from "@/lib/queryClient";
import { bsc } from "@/lib/bsc-chain";
import { Coins, Plus, X } from "lucide-react";
import { SiBinance, SiTether } from "react-icons/si";
import coynLogoPath from "@assets/COYN symbol square_1759099649514.png";
import type { WalletBalance } from "@shared/schema";


const getCryptoIcon = (crypto: string) => {
  switch (crypto) {
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
  const activeAccount = useActiveAccount();
  const activeWallet = useActiveWallet();
  const switchChain = useSwitchActiveWalletChain();

  const getMaxBalance = (currency: string) => {
    const balance = walletBalances.find(b => b.currency === currency);
    return balance ? parseFloat(balance.balance) : 0;
  };

  const sendCryptoMutation = useMutation({
    mutationFn: async (data: { amount: string; currency: string }) => {
      if (!activeAccount || !activeWallet) {
        throw new Error('No wallet connected. Please connect your wallet first.');
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

      // Switch to BSC network
      try {
        await switchChain(bsc);
      } catch (switchError) {
        throw new Error('Please switch to BSC (Binance Smart Chain) network in your wallet.');
      }

      // Get wallet's own EIP-1193 provider — bypasses Thirdweb RPC entirely
      const provider = await activeWallet.getProvider();
      if (!provider) {
        throw new Error('Could not access wallet provider. Please reconnect your wallet.');
      }

      const from = activeAccount.address as `0x${string}`;
      let txHash: string;

      if (data.currency === 'BNB') {
        const amountWei = BigInt(Math.floor(parseFloat(data.amount) * 1e18));
        txHash = await (provider as any).request({
          method: 'eth_sendTransaction',
          params: [{ from, to: recipientData.walletAddress, value: '0x' + amountWei.toString(16) }],
        });
      } else if (data.currency === 'USDT' || data.currency === 'COYN') {
        const tokenAddresses = {
          'USDT': '0x55d398326f99059fF775485246999027B3197955',
          'COYN': '0x22c89a156cb6f05bc54fae2ed8d690a1bc4fe8e1',
        };
        const tokenAddress = tokenAddresses[data.currency as keyof typeof tokenAddresses];
        const amountWei = BigInt(Math.floor(parseFloat(data.amount) * 1e18));
        const cleanAddr = recipientData.walletAddress.replace('0x', '').padStart(64, '0');
        const callData = '0xa9059cbb' + cleanAddr.toLowerCase() + amountWei.toString(16).padStart(64, '0');
        txHash = await (provider as any).request({
          method: 'eth_sendTransaction',
          params: [{ from, to: tokenAddress, data: callData, value: '0x0' }],
        });
      } else {
        throw new Error(`Unsupported currency: ${data.currency}`);
      }

      console.log('✅ Transaction successful! Hash:', txHash);

      // Send message in chat with transaction details
      const messageData = {
        conversationId,
        senderId: connectedUserId,
        content: `💸 Sent ${data.amount} ${data.currency}`,
        type: 'crypto',
        cryptoAmount: data.amount,
        cryptoCurrency: data.currency,
        cryptoRecipient: recipientData.walletAddress,
        transactionHash: txHash,
        blockchainNetwork: 'BSC',
        walletType: activeAccount.address
      };

      return await apiRequest("POST", "/api/messages", messageData);
    },
    onError: (error: Error) => {
      console.error('Transaction failed:', error);
      
      // Handle specific wallet errors with user-friendly messages
      if (error.message?.includes('user rejected') || error.message?.includes('User rejected')) {
        toast({
          title: "Transaction Cancelled",
          description: "Transaction was rejected. Please approve the transaction in your wallet.",
          variant: "destructive",
        });
      } else if (error.message?.includes('insufficient funds')) {
        toast({
          title: "Insufficient Balance",
          description: "Not enough balance for this transaction including gas fees.",
          variant: "destructive",
        });
      } else if (error.message?.includes('network')) {
        toast({
          title: "Network Error", 
          description: "Please check your connection and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Transaction Failed",
          description: error.message || "Please try again.",
          variant: "destructive",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/conversations", conversationId, "messages"] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/wallet/balances", connectedUserId] 
      });
      toast({
        title: "Transaction Sent Successfully",
        description: `${cryptoAmount} ${selectedCrypto} has been sent via blockchain`,
      });
      setShowCryptoModal(false);
      setCryptoAmount("");
      setSelectedCrypto("");
      setCryptoStep("amount");
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
              {['BNB', 'USDT', 'COYN'].map((crypto) => (
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
        <DialogContent noAnimation className="p-0 border-none bg-transparent shadow-none max-w-sm w-[90vw] overflow-visible">
          <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl animate-modal-enter">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
              <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                {getCryptoIcon(selectedCrypto)}
                Send {selectedCrypto}
              </DialogTitle>
              <button 
                onClick={() => setShowCryptoModal(false)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              {cryptoStep === "amount" && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="amount" className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Amount to send
                    </Label>
                    <div className="relative group">
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={cryptoAmount}
                        onChange={(e) => setCryptoAmount(e.target.value)}
                        className="h-14 pl-4 pr-20 text-lg font-medium border-2 border-gray-200 dark:border-gray-800 focus:border-orange-500 dark:focus:border-orange-500 transition-all bg-white/50 dark:bg-gray-950/50 rounded-xl"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <Button
                          onClick={setMaxAmount}
                          variant="ghost"
                          size="sm"
                          className="h-10 px-3 text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 font-bold text-xs uppercase"
                        >
                          Max
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Available Balance
                      </p>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">
                        {getMaxBalance(selectedCrypto)} {selectedCrypto}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Recipient
                    </Label>
                    <div className="p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50">
                      <p className="text-sm font-mono text-gray-600 dark:text-gray-300 break-all text-center">
                        Secure Transfer Active
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3 pt-2">
                    <Button
                      onClick={() => setCryptoStep("confirm")}
                      disabled={!cryptoAmount || parseFloat(cryptoAmount) <= 0}
                      className="h-12 w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]"
                    >
                      Continue
                    </Button>
                    <Button
                      onClick={() => setShowCryptoModal(false)}
                      variant="ghost"
                      className="h-12 w-full text-gray-500 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              
              {cryptoStep === "confirm" && (
                <div className="space-y-6 text-center">
                  <div className="py-8 space-y-4">
                    <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
                      {getCryptoIcon(selectedCrypto)}
                    </div>
                    <div className="space-y-1">
                      <p className="text-3xl font-black text-gray-900 dark:text-white">
                        {cryptoAmount}
                      </p>
                      <p className="text-sm font-bold text-orange-500 uppercase tracking-widest">
                        {selectedCrypto}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 px-4">
                      You are sending assets over the secure COYN network. This action cannot be undone.
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-3 pt-2">
                    <Button
                      onClick={handleConfirmSend}
                      disabled={sendCryptoMutation.isPending}
                      className="h-12 w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]"
                    >
                      {sendCryptoMutation.isPending ? "Processing..." : "Confirm & Send"}
                    </Button>
                    <Button
                      onClick={() => setCryptoStep("amount")}
                      variant="ghost"
                      className="h-12 w-full text-gray-500 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                    >
                      Back to Amount
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}