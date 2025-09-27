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
import { X, Send, QrCode, TrendingUp, TrendingDown, Copy, Check, ArrowLeft, Eye, EyeOff, AlertTriangle, RefreshCw } from "lucide-react";
import { SiBinance, SiBitcoin } from "react-icons/si";
import QRCode from "qrcode";
import { generateMetaMaskQRCode } from "@/lib/qr-generator";
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
  const [selectedCurrency, setSelectedCurrency] = useState(initialCurrency || "BNB");
  const [amount, setAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [showBalance, setShowBalance] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  // Get current user info safely
  const getConnectedUser = () => {
    try {
      const storedUser = localStorage.getItem('connectedUser');
      return storedUser ? JSON.parse(storedUser) : {};
    } catch (e) {
      console.error('Failed to parse stored user:', e);
      return {};
    }
  };
  
  const connectedUser = getConnectedUser();
  const userId = connectedUser.id;

  const { data: balances = [] } = useQuery<WalletBalance[]>({
    queryKey: ["/api/wallet/balances", userId],
    queryFn: async () => {
      const response = await fetch(`/api/wallet/balances?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch wallet balances');
      }
      return response.json();
    },
    enabled: !!userId,
  });

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/user", userId],
    queryFn: async () => {
      const response = await fetch(`/api/user?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      return response.json();
    },
    enabled: !!userId,
  });
  const isTrustWalletUser = connectedUser.walletAddress && 
    connectedUser.walletAddress.startsWith('0x') && 
    connectedUser.walletAddress.length === 42;

  // Trust Wallet balance refresh mutation
  const refreshBalancesMutation = useMutation({
    mutationFn: async () => {
      if (!userId) {
        throw new Error('User ID is required for balance refresh');
      }
      return apiRequest("POST", `/api/wallet/balances/refresh`, { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balances", userId] });
    },
  });

  // Auto-refresh Trust Wallet balances when modal opens
  useEffect(() => {
    if (isOpen && isTrustWalletUser) {

      refreshBalancesMutation.mutate();
    }
  }, [isOpen, isTrustWalletUser]);

  const selectedBalance = balances?.find(balance => balance.currency === selectedCurrency);
  const availableBalance = parseFloat(selectedBalance?.balance || "0");
  const sendAmount = parseFloat(amount || "0");

  const sendMutation = useMutation({
    mutationFn: async (data: { 
      currency: string; 
      amount: string; 
      recipientAddress: string;
    }) => {
      // Real Web3 transaction processing
      if (typeof window.ethereum !== 'undefined' && currentUser?.walletAddress) {
        try {
          // Request wallet permissions first
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          if (accounts.length === 0) {
            throw new Error('No wallet accounts found. Please connect your wallet.');
          }

          // For BNB transactions, ensure we're using a BNB-compatible wallet address
          let senderAddress = currentUser.walletAddress;
          if (data.currency === 'BNB') {
            // Verify the current user's wallet address is BNB-compatible (BSC address)
            if (!senderAddress || !senderAddress.startsWith('0x') || senderAddress.length !== 42) {
              throw new Error('Invalid BNB wallet address. Please connect a valid BSC-compatible wallet.');
            }
            
            // Ensure the connected wallet can send from this address
            const connectedAccount = accounts[0].toLowerCase();
            if (connectedAccount !== senderAddress.toLowerCase()) {
              // Check if the user's wallet address is among the connected accounts
              const allAccounts = await window.ethereum.request({ method: 'eth_accounts' });
              const hasCorrectAccount = allAccounts.some((addr: string) => 
                addr.toLowerCase() === senderAddress.toLowerCase()
              );
              
              if (!hasCorrectAccount) {
                throw new Error(
                  `BNB transaction requires wallet address ${senderAddress.slice(0, 6)}...${senderAddress.slice(-4)}. ` +
                  'Please switch to the correct wallet address for BNB transactions.'
                );
              }
            }
          } else {
            // For other currencies, use standard validation
            const connectedAccount = accounts[0].toLowerCase();
            const userWallet = currentUser.walletAddress.toLowerCase();
            if (connectedAccount !== userWallet) {
              throw new Error('Connected wallet does not match your account. Please switch to the correct wallet.');
            }
          }

          // Handle different networks based on currency
          let targetChainId = '0x38'; // BSC Mainnet for BNB
          

          // Switch to appropriate network
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: targetChainId }],
            });
          } catch (switchError: any) {
            if (switchError.code === 4902) {
              // Add BSC network if it doesn't exist
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0x38',
                  chainName: 'Binance Smart Chain',
                  nativeCurrency: {
                    name: 'BNB',
                    symbol: 'BNB',
                    decimals: 18
                  },
                  rpcUrls: ['https://bsc-dataseed.binance.org/'],
                  blockExplorerUrls: ['https://bscscan.com/']
                }]
              });
            } else {
              throw new Error('Please switch to Binance Smart Chain network in your wallet.');
            }
          }

          let transactionParameters;
          
          if (data.currency === 'BNB') {
            // Native BNB transfer - use validated BNB wallet address
            const amountInWei = (parseFloat(data.amount) * Math.pow(10, 18)).toString(16);
            
            // Double-check the sender address is valid for BNB
            if (!senderAddress || !senderAddress.startsWith('0x') || senderAddress.length !== 42) {
              throw new Error('Invalid sender address for BNB transaction.');
            }
            
            transactionParameters = {
              to: data.recipientAddress,
              from: senderAddress, // Use the validated BNB address
              value: '0x' + amountInWei,
              gas: '0x5208', // 21000 gas limit
              gasPrice: '0x4A817C800', // 20 Gwei
            };
          } else if (data.currency === 'USDT' || data.currency === 'COYN') {
            // ERC-20 token transfer
            const tokenAddresses = {
              'USDT': '0x55d398326f99059fF775485246999027B3197955', // USDT on BSC
              'COYN': '0x...', // COYN token address (placeholder)
            };
            
            const tokenAddress = tokenAddresses[data.currency as keyof typeof tokenAddresses];
            if (!tokenAddress) {
              throw new Error(`Token address not configured for ${data.currency}`);
            }
            
            // Create ERC-20 transfer data
            const decimals = data.currency === 'USDT' ? 18 : 18; // Both use 18 decimals on BSC
            const amountInWei = (parseFloat(data.amount) * Math.pow(10, decimals)).toString(16);
            
            // ERC-20 transfer function signature: transfer(address,uint256)
            const transferData = '0xa9059cbb' + 
              data.recipientAddress.slice(2).padStart(64, '0') + 
              amountInWei.padStart(64, '0');
            
            transactionParameters = {
              to: tokenAddress,
              from: senderAddress, // Use the validated sender address
              value: '0x0',
              data: transferData,
              gas: '0x15F90', // 90000 gas limit for token transfers
              gasPrice: '0x4A817C800', // 20 Gwei
            };
          } else {
            throw new Error(`Unsupported currency: ${data.currency}`);
          }

          // Send transaction
          const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [transactionParameters],
          });

          return { txId: txHash, ...data };
        } catch (error: any) {
          throw new Error(error.message || 'Transaction failed');
        }
      } else {
        throw new Error('Web3 wallet not detected. Please install MetaMask or Trust Wallet.');
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balances", userId] });
      setView("success");
      toast({
        title: "Transaction Sent Successfully",
        description: `Sent ${amount} ${selectedCurrency} to ${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`,
      });
    },
    onError: (error: any) => {
      let errorMessage = "Failed to send transaction. Please try again.";
      
      if (error.message.includes("User rejected")) {
        errorMessage = "Transaction was cancelled by user.";
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for this transaction.";
      } else if (error.message.includes("network")) {
        errorMessage = "Please check your network connection and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Transaction Failed",
        description: errorMessage,
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

  useEffect(() => {
    if (isOpen && selectedCurrency && currentUser?.walletAddress) {
      const generateQR = async () => {
        try {
          const qrUrl = await QRCode.toDataURL(currentUser.walletAddress);
          setQrCodeUrl(qrUrl);
        } catch (error) {
          console.error("Failed to generate QR code:", error);
        }
      };
      generateQR();
    }
  }, [isOpen, selectedCurrency, currentUser?.walletAddress]);

  // Real-time cryptocurrency market prices
  const getCurrentMarketPrices = () => {
    return {
      BNB: 600,      // $600 per BNB  
      USDT: 1.00,    // $1.00 per USDT (stable)
      COYN: 0.000000050925     // Real COYN price from CoinBrain
    };
  };

  // Calculate USD value - use fetched values for Trust Wallet users, demo prices for others
  const calculateRealTimeUSDValue = (balance: string, currency: string, fetchedUsdValue?: string | null) => {
    // For Trust Wallet users, use the real USD value fetched from blockchain
    if (isTrustWalletUser && fetchedUsdValue) {
      return parseFloat(fetchedUsdValue);
    }
    
    // For demo users, use demo market prices
    const amount = parseFloat(balance || "0");
    const prices = getCurrentMarketPrices();
    const currentPrice = prices[currency as keyof typeof prices] || 0;
    return amount * currentPrice;
  };

  const getCurrencyIcon = (currency: string) => {
    switch (currency) {
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
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      });
    }
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 8,
      maximumFractionDigits: 8
    });
  };

  const formatUSDValue = (balance: string, currency: string, showBalance: boolean, fetchedUsdValue?: string | null) => {
    if (!showBalance) return "••••••";
    
    const realTimeValue = calculateRealTimeUSDValue(balance, currency, fetchedUsdValue);
    
    return realTimeValue.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const get24hChange = (currency: string) => {
    const changes: { [key: string]: number } = {
      BNB: -1.2,
      USDT: 0.0,
      COYN: -89.77
    };
    return changes[currency] || 0;
  };

  // Function to copy wallet address to clipboard
  const copyWalletAddress = async () => {
    if (currentUser?.walletAddress) {
      try {
        await navigator.clipboard.writeText(currentUser.walletAddress);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        toast({
          title: "Address Copied",
          description: "Wallet address copied to clipboard",
        });
      } catch (err) {
        console.error('Failed to copy wallet address:', err);
        toast({
          title: "Copy Failed",
          description: "Failed to copy wallet address",
          variant: "destructive",
        });
      }
    }
  };

  // Function to truncate wallet address for display
  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
          {showBalance ? 
            `$${(balances?.reduce((sum, balance) => sum + calculateRealTimeUSDValue(balance.balance, balance.currency, balance.usdValue), 0) || 0).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}` : 
            "••••••••"
          }
        </p>
      </div>

      {/* Wallet Address */}
      {currentUser?.walletAddress && (
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Your Wallet Address</p>
              <p className="text-sm font-mono text-gray-800 dark:text-gray-200 break-all leading-relaxed">
                {currentUser.walletAddress}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyWalletAddress}
              className="flex-shrink-0 ml-3 h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-slate-700"
              title="Copy wallet address"
            >
              {isCopied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              )}
            </Button>
          </div>
        </div>
      )}

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
                        {formatUSDValue(balance.balance, balance.currency, showBalance, balance.usdValue)}
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
              className="w-full border-gray-300 dark:border-slate-600 pr-24"
              step="0.00000001"
              min="0"
              max={availableBalance.toString()}
            />
            <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAmount(selectedBalance?.balance || "0")}
                className="h-6 px-2 text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"
              >
                Max
              </Button>
            </div>
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
          onClick={handleSend}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 mt-6"
          disabled={!recipientAddress || !amount || sendAmount <= 0 || sendAmount > availableBalance || sendMutation.isPending}
        >
          {sendMutation.isPending ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Sending...</span>
            </div>
          ) : (
            "Send Transaction"
          )}
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
        <Button variant="ghost" size="sm" onClick={() => setView("main")} className="h-8 w-8 p-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold text-black dark:text-white">Receive Crypto</h2>
      </div>

      <div className="text-center space-y-6">
        {/* QR Code */}
        <div className="bg-white p-6 rounded-lg inline-block">
          {qrCodeUrl ? (
            <img src={qrCodeUrl} alt="Wallet QR Code" className="w-48 h-48" />
          ) : (
            <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-gray-500">Generating QR...</span>
            </div>
          )}
        </div>

        {/* Wallet Address */}
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">Your Wallet Address</p>
          <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
            <p className="font-mono text-sm text-black dark:text-white break-all">
              {currentUser?.walletAddress}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(currentUser?.walletAddress || "");
              toast({
                title: "Address Copied",
                description: "Wallet address copied to clipboard",
              });
            }}
            className="border-orange-500 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20"
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