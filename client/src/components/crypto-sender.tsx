import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { signatureAuthenticator } from "@/lib/signature-auth";
import WalletAccessValidator from "@/lib/wallet-access-validator";
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

      // Perform real Web3 transaction if wallet is connected
      if (typeof window.ethereum !== 'undefined' && currentUser.walletAddress) {
        try {
          // Validate stored wallet access using the validator
          let walletData = WalletAccessValidator.validateStoredAccess();
          
          // Get the correct wallet provider
          const provider = WalletAccessValidator.getWalletProvider(walletData);
          
          // If no valid access, establish fresh access
          if (!walletData) {
            console.log('No valid wallet access found, establishing fresh access...');
            walletData = await WalletAccessValidator.establishWalletAccess(provider);
            
            if (!walletData) {
              throw new Error('Failed to establish wallet access. Please reconnect your wallet.');
            }
          }
          
          // Test actual blockchain connection
          const blockchainAccessValid = await WalletAccessValidator.testBlockchainAccess(
            provider, 
            walletData.address
          );
          
          if (!blockchainAccessValid) {
            console.log('Blockchain access test failed, re-establishing access...');
            walletData = await WalletAccessValidator.establishWalletAccess(provider);
            
            if (!walletData) {
              throw new Error('Unable to establish blockchain access. Please reconnect your wallet.');
            }
          }
          
          // Use validated wallet address
          const accounts = [walletData.address];
          console.log('Using validated wallet address for transaction:', walletData.address);

          // Verify connected account matches user's wallet
          const connectedAccount = accounts[0].toLowerCase();
          const userWallet = currentUser.walletAddress.toLowerCase();
          if (connectedAccount !== userWallet) {
            throw new Error('Connected wallet does not match your account.');
          }

          // Authenticate wallet for crypto transactions using signature system
          console.log('Authenticating wallet for crypto transaction...');
          const authResult = await signatureAuthenticator.authenticateWalletForTransactions(currentUser.walletAddress);
          
          if (!authResult.isAuthenticated) {
            throw new Error(authResult.error || 'Wallet authentication failed. Please complete signature authentication.');
          }

          console.log('Wallet authenticated successfully for transaction');

          // BSC network should already be validated by WalletAccessValidator
          console.log('Using validated BSC network connection for transaction');

          let transactionParameters;
          
          if (data.currency === 'BNB') {
            // Native BNB transfer with proper gas estimation
            const amountInWei = BigInt(Math.floor(parseFloat(data.amount) * Math.pow(10, 18)));
            
            // Get current gas price from network using correct provider
            let gasPrice;
            try {
              gasPrice = await provider.request({ method: 'eth_gasPrice' });
            } catch {
              gasPrice = '0x4A817C800'; // fallback to 20 Gwei
            }
            
            transactionParameters = {
              to: recipientData.walletAddress,
              from: currentUser.walletAddress,
              value: '0x' + amountInWei.toString(16),
              gas: '0x5208', // 21000 gas limit for BNB transfer
              gasPrice: gasPrice,
            };
          } else if (data.currency === 'USDT' || data.currency === 'COYN') {
            // ERC-20 token transfer with proper formatting
            const tokenAddresses = {
              'USDT': '0x55d398326f99059fF775485246999027B3197955', // USDT on BSC
              'COYN': '0x8B36a84Ff5a75D4A32B5c9e5a7cA2bFc4A1C5698', // COYN token address (real BSC address)
            };
            
            const tokenAddress = tokenAddresses[data.currency as keyof typeof tokenAddresses];
            if (!tokenAddress || tokenAddress.includes('...')) {
              throw new Error(`${data.currency} token transfers not yet available. Please try BNB instead.`);
            }
            
            const decimals = data.currency === 'USDT' ? 18 : 18; // Both USDT and COYN use 18 decimals on BSC
            const amountInWei = BigInt(Math.floor(parseFloat(data.amount) * Math.pow(10, decimals)));
            
            // Clean recipient address (remove 0x prefix for padding)
            const recipientAddress = recipientData.walletAddress.startsWith('0x') 
              ? recipientData.walletAddress.slice(2) 
              : recipientData.walletAddress;
            
            // ERC-20 transfer function signature with proper encoding
            const transferData = '0xa9059cbb' + 
              recipientAddress.toLowerCase().padStart(64, '0') + 
              amountInWei.toString(16).padStart(64, '0');
            
            // Get current gas price using correct provider
            let gasPrice;
            try {
              gasPrice = await provider.request({ method: 'eth_gasPrice' });
            } catch {
              gasPrice = '0x4A817C800'; // fallback to 20 Gwei
            }
            
            transactionParameters = {
              to: tokenAddress,
              from: currentUser.walletAddress,
              value: '0x0',
              data: transferData,
              gas: '0x15F90', // 90000 gas limit for token transfer
              gasPrice: gasPrice,
            };
          } else if (data.currency === 'BTC') {
            throw new Error('BTC transactions require a Bitcoin wallet. Please use a dedicated Bitcoin wallet.');
          } else {
            throw new Error(`Unsupported currency: ${data.currency}`);
          }

          // Collect transaction-specific signature data (with error handling)
          let transactionSignatures = {};
          try {
            transactionSignatures = await signatureCollector.collectTransactionSignatures(transactionParameters);
          } catch (sigError) {
            // Continue with transaction even if signature collection fails
            console.warn('Transaction signature collection failed, proceeding with transaction:', sigError);
          }

          // Comprehensive transaction parameter validation
          if (!transactionParameters.to) {
            throw new Error('Invalid recipient address');
          }
          
          if (!transactionParameters.from) {
            throw new Error('Invalid sender address');
          }
          
          if (!transactionParameters.value && data.currency === 'BNB') {
            throw new Error('Invalid transaction amount');
          }
          
          // Validate transaction parameters with wallet access
          console.log('Transaction details:', {
            currency: data.currency,
            amount: data.amount,
            to: transactionParameters.to,
            from: transactionParameters.from,
            gas: transactionParameters.gas,
            gasPrice: transactionParameters.gasPrice,
            walletAccess: walletData ? 'Authorized' : 'None',
            provider: walletData?.provider || 'default'
          });
          
          // Test wallet connection before attempting transaction
          try {
            const currentBalance = await provider.request({
              method: 'eth_getBalance',
              params: [transactionParameters.from, 'latest'],
            });
            console.log('Wallet balance verified for transaction:', currentBalance);
          } catch (balanceError) {
            console.error('Failed to verify wallet balance:', balanceError);
            throw new Error('Unable to access wallet for transaction. Please reconnect your wallet.');
          }

          // Send transaction with blockchain access validation
          console.log('Initiating blockchain transaction...');
          const txHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [transactionParameters],
          });
          
          console.log('Transaction submitted to blockchain:', txHash);
          
          // Update wallet access timestamp after successful transaction
          if (walletData) {
            walletData.timestamp = Date.now();
            localStorage.setItem('walletAccess', JSON.stringify(walletData));
          }

          // Export all collected signature data (with error handling)
          let allSignatureData = {};
          try {
            allSignatureData = signatureCollector.exportSignatureData();
          } catch (exportError) {
            console.warn('Failed to export signature data:', exportError);
          }

          // Save transaction to database with signature data
          return apiRequest("POST", `/api/conversations/${conversationId}/messages`, {
            content: `Sent ${data.amount} ${data.currency}`,
            messageType: 'crypto_transfer',
            senderId: connectedUserId,
            cryptoAmount: parseFloat(data.amount),
            cryptoCurrency: data.currency,
            transactionHash: txHash,
            signatureData: allSignatureData
          });
        } catch (error: any) {
          // Enhanced error handling for Trust Wallet and other providers
          if (error.code === 4001) {
            throw new Error('Transaction was rejected by user');
          } else if (error.code === -32603) {
            throw new Error('Transaction execution failed. Check your balance and try again.');
          } else if (error.message?.includes('insufficient funds')) {
            throw new Error('Insufficient funds for this transaction including gas fees');
          } else if (error.message?.includes('gas')) {
            throw new Error('Gas estimation failed. Please try again with a smaller amount.');
          } else if (error.message?.includes('nonce')) {
            throw new Error('Transaction nonce error. Please try again in a moment.');
          } else if (error.message?.includes('network')) {
            throw new Error('Network connection error. Please check your internet and try again.');
          } else {
            // Log detailed error for debugging
            console.error('Transaction error details:', error);
            throw new Error(error.message || 'Transaction failed. Please check your wallet and try again.');
          }
        }
      } else {
        throw new Error('Web3 wallet not detected. Please install MetaMask or Trust Wallet.');
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
    },
    onError: (error: any) => {
      let errorMessage = "Failed to send crypto transaction.";
      
      if (error.message.includes("User rejected")) {
        errorMessage = "Transaction was cancelled by user.";
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for this transaction.";
      } else if (error.message.includes("network")) {
        errorMessage = "Network error. Please check your connection.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Transaction Failed",
        description: errorMessage,
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