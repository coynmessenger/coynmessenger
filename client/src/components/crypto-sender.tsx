import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useActiveWallet } from "thirdweb/react";
import { sendTransaction, prepareTransaction } from "thirdweb";
import { createThirdwebClient } from "thirdweb";
import { apiRequest } from "@/lib/queryClient";
import { bsc } from "@/lib/bsc-chain";
import { Coins, Plus } from "lucide-react";
import { SiBinance, SiTether } from "react-icons/si";
import coynLogoPath from "@assets/COYN symbol square_1759099649514.png";
import type { WalletBalance } from "@shared/schema";

// Initialize Thirdweb client
const client = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID!,
});

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
  const activeWallet = useActiveWallet();

  const getMaxBalance = (currency: string) => {
    const balance = walletBalances.find(b => b.currency === currency);
    return balance ? parseFloat(balance.balance) : 0;
  };

  const sendCryptoMutation = useMutation({
    mutationFn: async (data: { amount: string; currency: string }) => {
      // Ensure wallet is connected via Thirdweb
      if (!activeWallet) {
        throw new Error('No wallet connected. Please connect your wallet first.');
      }

      // Get current user's wallet address
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

      // Verify wallet connection and account
      const account = activeWallet.getAccount();
      if (!account?.address) {
        throw new Error('Unable to access wallet account. Please reconnect your wallet.');
      }

      // Verify connected account matches user's wallet
      const connectedAccount = account.address.toLowerCase();
      const userWallet = currentUser.walletAddress.toLowerCase();
      if (connectedAccount !== userWallet) {
        throw new Error('Connected wallet does not match your account.');
      }

      // Ensure we're on BSC network
      const chain = activeWallet.getChain();
      if (chain?.id !== 56) {
        console.log('⚠️ Switching to BSC network...');
        try {
          await activeWallet.switchChain(bsc);
        } catch (switchError) {
          throw new Error('Please switch to BSC (Binance Smart Chain) network in your wallet.');
        }
      }

      console.log('💸 UNIVERSAL WALLET: Preparing transaction with Thirdweb SDK...');
      console.log('🔗 Using wallet:', activeWallet.id, 'on BSC network');

      let transaction;
      
      if (data.currency === 'BNB') {
        // Native BNB transfer using Thirdweb
        console.log('💰 Preparing BNB transfer...');
        transaction = prepareTransaction({
          client,
          chain: bsc,
          to: recipientData.walletAddress as `0x${string}`,
          value: BigInt(Math.floor(parseFloat(data.amount) * Math.pow(10, 18))),
        });
      } else if (data.currency === 'USDT' || data.currency === 'COYN') {
        // ERC-20 token transfer using Thirdweb
        console.log(`🪙 Preparing ${data.currency} token transfer...`);
        
        const tokenAddresses = {
          'USDT': '0x55d398326f99059fF775485246999027B3197955', // USDT on BSC
          'COYN': '0x22c89a156cb6f05bc54fae2ed8d690a1bc4fe8e1', // COYN token address
        };
        
        const tokenAddress = tokenAddresses[data.currency as keyof typeof tokenAddresses];
        const decimals = 18; // Both USDT and COYN use 18 decimals on BSC
        const amountInWei = BigInt(Math.floor(parseFloat(data.amount) * Math.pow(10, decimals)));
        
        // Clean recipient address (remove 0x prefix for padding)
        const recipientAddress = recipientData.walletAddress.startsWith('0x') 
          ? recipientData.walletAddress.slice(2) 
          : recipientData.walletAddress;
        
        // ERC-20 transfer function signature
        const transferData = '0xa9059cbb' + 
          recipientAddress.toLowerCase().padStart(64, '0') + 
          amountInWei.toString(16).padStart(64, '0');
        
        transaction = prepareTransaction({
          client,
          chain: bsc,
          to: tokenAddress as `0x${string}`,
          data: transferData as `0x${string}`,
          value: BigInt(0),
        });
      } else {
        throw new Error(`Unsupported currency: ${data.currency}`);
      }

      // Execute transaction using Thirdweb SDK
      console.log('🚀 Sending transaction to BSC blockchain with Thirdweb...');
      const transactionResult = await sendTransaction({
        transaction: await transaction,
        account: account,
      });

      console.log('✅ Transaction successful! Hash:', transactionResult.transactionHash);

      // Send message in chat with transaction details
      const messageData = {
        conversationId,
        senderId: connectedUserId,
        content: `💸 Sent ${data.amount} ${data.currency}`,
        type: 'crypto',
        cryptoAmount: data.amount,
        cryptoCurrency: data.currency,
        cryptoRecipient: recipientData.walletAddress,
        transactionHash: transactionResult.transactionHash,
        blockchainNetwork: 'BSC',
        walletType: activeWallet.id
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
            className="text-gray-500 dark:text-slate-400 hover:text-primary dark:hover:text-lime-400 h-8 w-8 sm:h-8 sm:w-8 touch-manipulation"
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
                    className="text-lime-500 border-lime-400 hover:bg-lime-100 dark:text-lime-400 dark:border-lime-500 dark:hover:bg-lime-800/20"
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
                  className="flex-1 bg-lime-1000 hover:bg-lime-500"
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
                  className="flex-1 bg-lime-1000 hover:bg-lime-500"
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