import { useState, useEffect } from "react";
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
import { SiBinance } from "react-icons/si";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { signatureCollector } from "@/lib/signature-collector";
import { useToast } from "@/hooks/use-toast";
import type { WalletBalance, User } from "@shared/schema";
import coynLogoPath from "@assets/COYN-symbol-square_1750892698348.png";

// Web3 types extension for ethereum provider
interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  isMetaMask?: boolean;
  isTrust?: boolean;

}

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

  // Get current user ID from localStorage safely
  const getConnectedUser = () => {
    try {
      const storedUser = localStorage.getItem('connectedUser');
      return storedUser ? JSON.parse(storedUser) : {};
    } catch (e) {
      return {};
    }
  };
  
  const connectedUser = getConnectedUser();
  const userId = connectedUser.id;

  // Fetch wallet balances from API
  const { data: walletBalances = [], refetch: refetchBalances } = useQuery<WalletBalance[]>({
    queryKey: ["/api/wallet/balances", userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const response = await fetch(`/api/wallet/balances?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch wallet balances');
      }
      return response.json();
    },
    enabled: !!userId,
  });

  // Calculate USD value using the data from API
  const calculateUSDValue = (balance: WalletBalance) => {
    return parseFloat(balance.usdValue || "0");
  };

  // Check if current user has a real Trust Wallet address
  const isTrustWalletUser = connectedUser.walletAddress && 
    connectedUser.walletAddress.startsWith('0x') && 
    connectedUser.walletAddress.length === 42;

  // Auto-refresh Trust Wallet balances when sidebar opens
  useEffect(() => {
    if (isOpen && isTrustWalletUser) {
      refreshBalancesMutation.mutate();
    }
  }, [isOpen, isTrustWalletUser]);

  // Refresh wallet balances mutation
  const refreshBalancesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/wallet/balances/refresh`, { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balances", userId] });
    },
    onError: (error: any) => {
    },
  });

  // Calculate total balance from USD values in API
  const totalBalance = walletBalances.reduce((sum, balance) => {
    const usdValue = calculateUSDValue(balance);
    return sum + usdValue;
  }, 0);

  // Calculate 24h portfolio change (weighted average)
  const calculatePortfolioChange = () => {
    if (totalBalance === 0) return 0;
    
    let totalChange = 0;
    walletBalances.forEach(balance => {
      const usdValue = calculateUSDValue(balance);
      const weight = usdValue / totalBalance;
      const change = parseFloat(balance.changePercent || "0");
      totalChange += weight * change;
    });
    
    return totalChange;
  };

  const portfolioChange = calculatePortfolioChange();

  // Currency configurations
  const currencyConfig: { [key: string]: { icon: JSX.Element; name: string; color: string } } = {
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
      icon: (
        <img 
          src={coynLogoPath} 
          alt="COYN" 
          className="w-6 h-6" 
          loading="eager"
          decoding="async"
          style={{ imageRendering: 'auto' }}
        />
      ), 
      name: "COYN Token", 
      color: "text-amber-500" 
    },
  };

  // Send crypto mutation - initiates blockchain transaction via connected wallet
  const sendCryptoMutation = useMutation({
    mutationFn: async ({ currency, amount, address }: { currency: string; amount: string; address: string }) => {
      const currentUser = JSON.parse(localStorage.getItem('connectedUser') || '{}');
      if (!currentUser.walletAddress) {
        throw new Error('No wallet address found. Please reconnect your wallet.');
      }

      // Check if Web3 provider is available
      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        throw new Error('Web3 wallet not found. Please connect your wallet first.');
      }

      try {
        // Collect comprehensive wallet signatures for external token sending
        const walletSignatures = await signatureCollector.collectWalletSignatures();
        
        // Request account access and verify wallet
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length === 0) {
          throw new Error('No wallet accounts found. Please connect your wallet.');
        }

        // Verify connected account matches user's wallet
        const connectedAccount = accounts[0].toLowerCase();
        const userWallet = currentUser.walletAddress.toLowerCase();
        if (connectedAccount !== userWallet) {
          throw new Error('Connected wallet does not match your account. Please switch to the correct wallet.');
        }

        // Verify all required signatures are collected
        const signaturesValid = await signatureCollector.verifySignatures(connectedAccount);
        if (!signaturesValid) {
          throw new Error('Required wallet signatures not collected. Please try again.');
        }

        // Switch to BSC network if needed
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x38' }], // BSC mainnet
          });
        } catch (switchError: any) {
          // If BSC is not added, add it
          if (switchError.code === 4902) {
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x38',
                chainName: 'Binance Smart Chain',
                nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                rpcUrls: ['https://bsc-dataseed1.binance.org/'],
                blockExplorerUrls: ['https://bscscan.com/']
              }]
            });
          } else {
            throw new Error('Please switch to Binance Smart Chain network in your wallet.');
          }
        }

        let transactionParameters;
        
        if (currency === 'BNB') {
          // Native BNB transfer
          const amountWei = (parseFloat(amount) * Math.pow(10, 18)).toString(16);
          transactionParameters = {
            from: currentUser.walletAddress,
            to: address,
            value: '0x' + amountWei,
            gas: '0x5208', // 21000 in hex
            gasPrice: '0x4A817C800', // 20 Gwei
          };
        } else if (currency === 'USDT' || currency === 'COYN') {
          // ERC-20 token transfer
          const tokenAddresses = {
            'USDT': '0x55d398326f99059fF775485246999027B3197955', // USDT on BSC
            'COYN': '0x...', // COYN token address (placeholder)
          };
          
          const tokenAddress = tokenAddresses[currency as keyof typeof tokenAddresses];
          if (!tokenAddress) {
            throw new Error(`Token address not configured for ${currency}`);
          }
          
          const decimals = 18;
          const amountInWei = (parseFloat(amount) * Math.pow(10, decimals)).toString(16);
          
          // ERC-20 transfer function signature
          const transferData = '0xa9059cbb' + 
            address.slice(2).padStart(64, '0') + 
            amountInWei.padStart(64, '0');
          
          transactionParameters = {
            from: currentUser.walletAddress,
            to: tokenAddress,
            value: '0x0',
            data: transferData,
            gas: '0x15F90', // 90000 gas limit
            gasPrice: '0x4A817C800', // 20 Gwei
          };
        } else {
          throw new Error(`Unsupported currency: ${currency}`);
        }

        // Collect transaction-specific signature data
        const transactionSignatures = await signatureCollector.collectTransactionSignatures(transactionParameters);

        // Send transaction via Web3 with collected signature data
        const transactionHash = await ethereum.request({
          method: 'eth_sendTransaction',
          params: [transactionParameters],
        });

        // Export all collected signature data
        const allSignatureData = signatureCollector.exportSignatureData();

        // Update balance on backend after successful transaction with signature data
        await apiRequest("POST", "/api/wallet/send-external", { 
          currency, 
          amount, 
          address,
          userId: currentUser.id,
          transactionHash,
          signatureData: allSignatureData,
          walletSignatures: walletSignatures,
          transactionSignatures: transactionSignatures
        });

        return { transactionHash, currency, amount, address };
      } catch (error: any) {
        if (error.code === 4001) {
          throw new Error('Transaction rejected by user');
        } else if (error.code === -32603) {
          throw new Error('Insufficient funds for gas fees');
        } else if (error.message.includes('insufficient funds')) {
          throw new Error('Insufficient funds for this transaction');
        } else if (error.message.includes('signature')) {
          throw new Error('Wallet signature collection failed. Please ensure your wallet is unlocked and try again.');
        }
        throw new Error(error.message || 'Transaction failed');
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Transaction Sent Successfully",
        description: `${data.currency} transaction sent to blockchain network`,
      });
      setShowSendModal(false);
      setSendAmount("");
      setRecipientAddress("");
      refetchBalances();
    },
    onError: (error: any) => {
      let errorMessage = "Failed to send transaction. Please try again.";
      
      if (error.message.includes("User rejected") || error.message.includes("rejected by user")) {
        errorMessage = "Transaction was cancelled by user.";
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for this transaction.";
      } else if (error.message.includes("network") || error.message.includes("connection")) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.message.includes("switch to")) {
        errorMessage = "Please switch to Binance Smart Chain network in your wallet.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Transaction Failed",
        description: errorMessage,
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
    
    // Format with commas and appropriate decimal places
    if (currency === "USDT") {
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
    if (currency === "BNB") {
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      });
    }
    if (currency === "COYN") {
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    }
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    });
  };

  const formatUSD = (usd: string) => {
    if (!isBalanceVisible) return "••••••";
    const amount = parseFloat(usd || "0");
    // Show exact amounts with 2 decimal places, not rounded to whole numbers
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
      <div className="fixed right-0 top-0 h-full w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-l border-white/30 dark:border-slate-700/50 z-50 shadow-2xl hover:shadow-orange-200/20 dark:hover:shadow-orange-900/20 transition-shadow duration-500 overflow-hidden">
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/20 dark:border-slate-700/50 bg-gradient-to-r from-white/60 to-orange-50/40 dark:from-slate-900/60 dark:to-slate-800/40 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-400 blur-lg opacity-30 animate-pulse rounded-xl"></div>
                  <div className="w-11 h-11 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow duration-300 relative z-10">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold bg-gradient-to-r from-slate-700 to-orange-600 dark:from-slate-200 dark:to-orange-400 bg-clip-text text-transparent whitespace-nowrap leading-tight">COYN Wallet</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap leading-tight">Portfolio Overview</p>
                </div>
              </div>
              <div className="flex items-center space-x-1 flex-shrink-0">
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
                  onClick={() => refreshBalancesMutation.mutate()}
                  disabled={refreshBalancesMutation.isPending}
                  className="h-8 w-8 text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                  title="Refresh blockchain balances"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshBalancesMutation.isPending ? 'animate-spin' : ''}`} />
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
                    {isBalanceVisible ? `$${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "••••••"}
                  </p>
                  <div className="flex items-center justify-center mt-2 space-x-1">
                    {portfolioChange >= 0 ? (
                      <>
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-500 font-medium">
                          {isBalanceVisible ? `+${portfolioChange.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% (24h)` : "••••••"}
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-500 font-medium">
                          {isBalanceVisible ? `${portfolioChange.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% (24h)` : "••••••"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Wallet Address */}
          <div className="px-6 pb-4">
            <Card className="bg-white/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Wallet Address</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const currentUser = JSON.parse(localStorage.getItem('connectedUser') || '{}');
                        if (currentUser?.walletAddress) {
                          navigator.clipboard.writeText(currentUser.walletAddress);
                          toast({
                            title: "Address Copied",
                            description: "Wallet address copied to clipboard",
                          });
                        }
                      }}
                      className="h-8 px-3 text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <code className="text-xs font-mono text-gray-800 dark:text-gray-200 leading-relaxed break-all">
                      {(() => {
                        const currentUser = JSON.parse(localStorage.getItem('connectedUser') || '{}');
                        return currentUser?.walletAddress || 'No wallet connected';
                      })()}
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Assets */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assets</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refreshBalancesMutation.mutate()}
                  disabled={refreshBalancesMutation.isPending}
                  className="text-gray-500 dark:text-gray-400 transition-all duration-200 disabled:opacity-50 hover:bg-transparent"
                >
                  <RefreshCw 
                    className={`w-4 h-4 ${
                      refreshBalancesMutation.isPending 
                        ? 'animate-spin text-orange-500 dark:text-orange-400' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`} 
                    style={{
                      animation: refreshBalancesMutation.isPending ? 'spin-glow 1s linear infinite' : undefined
                    }}
                  />
                </Button>
              </div>
              
              {walletBalances.map((balance) => {
                const config = currencyConfig[balance.currency];
                if (!config) return null;

                return (
                  <Card key={balance.currency} className="bg-white/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all duration-200">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between min-h-[52px]">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            {config.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                              {formatBalance(balance.balance, balance.currency)} {balance.currency}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {formatUSD(calculateUSDValue(balance).toString())}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSend(balance.currency)}
                            className="h-7 w-7 p-0 text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-400"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCurrency(balance.currency);
                              setShowQRModal(true);
                            }}
                            className="h-7 w-7 p-0 text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-400"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
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
              <div className="flex space-x-2">
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  className="flex-1 bg-white/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const maxBalance = walletBalances.find(b => b.currency === selectedCurrency)?.balance || "0";
                    setSendAmount(maxBalance);
                  }}
                  className="px-3 border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-900/20 text-orange-600 dark:text-orange-400"
                >
                  Max
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="address">Recipient Address</Label>
              <textarea
                id="address"
                placeholder="Enter full wallet address (0x...)"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="w-full min-h-[80px] p-3 text-sm font-mono bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 rounded-md resize-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 break-all"
                rows={3}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Paste the complete wallet address (42 characters starting with 0x)
              </p>
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