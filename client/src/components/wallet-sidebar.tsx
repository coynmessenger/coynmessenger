import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  X, 
  QrCode, 
  Eye, 
  EyeOff, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownLeft,
  Copy,
  Wallet,
  RefreshCw,
  Camera
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { SiBinance } from "react-icons/si";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WalletBalance, User } from "@shared/schema";
import coynLogoPath from "@assets/COYN symbol square_1759099649514.png";
import sendIconPath from "@assets/SENDICON_1769058532502.png";
import QRCode from "qrcode";
import { useActiveWallet } from "thirdweb/react";
import { sendTransaction, prepareTransaction, createThirdwebClient } from "thirdweb";
import { bsc } from "@/lib/bsc-chain";

const thirdwebClient = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID || "placeholder",
});

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
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  
  const { toast } = useToast();
  const activeWallet = useActiveWallet();
  
  useEffect(() => {
    if (showQRModal && user?.walletAddress) {
      const generateQR = async () => {
        try {
          const qrUrl = await QRCode.toDataURL(user.walletAddress, {
            width: 200,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          setQrCodeUrl(qrUrl);
        } catch (error) {
          console.error("Failed to generate QR code:", error);
        }
      };
      generateQR();
    }
  }, [showQRModal, user?.walletAddress]);

  const startQRScanner = async () => {
    const element = document.getElementById("qr-reader");
    if (!element) {
      console.error("QR reader element not found");
      return;
    }
    
    if (scannerRef.current || isScanning) {
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({
        title: "Camera Not Available",
        description: "Your browser doesn't support camera access. Please use HTTPS or a modern browser.",
        variant: "destructive",
      });
      setShowQRScanner(false);
      return;
    }

    setIsScanning(true);
    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          const address = decodedText.trim();
          if (address.startsWith("0x") && address.length === 42) {
            setRecipientAddress(address);
          } else {
            setRecipientAddress(decodedText);
          }
          stopQRScanner();
          setShowQRScanner(false);
        },
        () => {}
      );
    } catch (err: any) {
      console.error("QR Scanner error:", err);
      let errorMessage = "Could not access camera. Please check permissions.";
      
      if (err?.name === "NotFoundError" || err?.message?.includes("no camera")) {
        errorMessage = "No camera found on this device.";
      } else if (err?.name === "NotAllowedError") {
        errorMessage = "Camera access denied. Please allow camera permissions.";
      } else if (err?.name === "InsecureContextError") {
        errorMessage = "Camera requires HTTPS connection.";
      }
      
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
      });
      setIsScanning(false);
      setShowQRScanner(false);
      scannerRef.current = null;
    }
  };

  const stopQRScanner = async () => {
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        if (isScanning) {
          await scanner.stop();
        }
        scanner.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      } finally {
        scannerRef.current = null;
        setIsScanning(false);
      }
    } else {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let rafId: number | null = null;
    
    if (showQRScanner) {
      const initScanner = () => {
        if (cancelled) return;
        rafId = requestAnimationFrame(() => {
          if (cancelled) return;
          const element = document.getElementById("qr-reader");
          if (element) {
            startQRScanner();
          } else {
            initScanner();
          }
        });
      };
      initScanner();
    }
    
    return () => {
      cancelled = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      stopQRScanner();
    };
  }, [showQRScanner]);

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

  // Send crypto mutation - initiates blockchain transaction via Thirdweb SDK
  const sendCryptoMutation = useMutation({
    mutationFn: async ({ currency, amount, address }: { currency: string; amount: string; address: string }) => {
      if (!activeWallet) {
        throw new Error('No wallet connected. Please connect your wallet first.');
      }

      const account = activeWallet.getAccount();
      if (!account) {
        throw new Error('Could not get wallet account. Please reconnect your wallet.');
      }

      // Switch to BSC network
      try {
        await activeWallet.switchChain(bsc);
      } catch (switchError: any) {
        throw new Error('Please switch to Binance Smart Chain (BSC) network in your wallet.');
      }

      let transaction;

      if (currency === 'BNB') {
        const amountWei = BigInt(Math.round(parseFloat(amount) * 1e18));
        transaction = prepareTransaction({
          client: thirdwebClient,
          chain: bsc,
          to: address as `0x${string}`,
          value: amountWei,
        });
      } else if (currency === 'USDT' || currency === 'COYN') {
        const tokenAddresses: Record<string, string> = {
          USDT: '0x55d398326f99059fF775485246999027B3197955',
          COYN: '0x22c89a156cb6f05bc54fae2ed8d690a1bc4fe8e1',
        };
        const tokenAddress = tokenAddresses[currency];
        const amountWei = BigInt(Math.round(parseFloat(amount) * 1e18));
        const paddedAddress = address.slice(2).padStart(64, '0');
        const paddedAmount = amountWei.toString(16).padStart(64, '0');
        const data = ('0xa9059cbb' + paddedAddress + paddedAmount) as `0x${string}`;

        transaction = prepareTransaction({
          client: thirdwebClient,
          chain: bsc,
          to: tokenAddress as `0x${string}`,
          data,
          value: BigInt(0),
        });
      } else {
        throw new Error(`Unsupported currency: ${currency}`);
      }

      const result = await sendTransaction({
        transaction: await transaction,
        account,
      });

      const transactionHash = result.transactionHash;

      // Record transaction on backend
      const currentUser = JSON.parse(localStorage.getItem('connectedUser') || '{}');
      await apiRequest("POST", "/api/wallet/send", {
        currency,
        amount,
        address,
        userId: currentUser.id,
        transactionHash,
      });

      return { transactionHash, currency, amount, address };
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

          {/* Scrollable Content: Wallet Address + Assets */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4 space-y-4">
            {/* Wallet Address */}
            <div>
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
                      <code className="block text-xs font-mono text-gray-800 dark:text-gray-200 truncate">
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
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">BSC Assets</h3>
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
                  <Card key={balance.id} className="bg-white/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm hover:bg-white/70 dark:hover:bg-gray-800/70 transition-all duration-200">
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
                            <img src={sendIconPath} alt="Send" className="w-3.5 h-3.5" />
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
        <DialogContent hideCloseButton noAnimation className="p-0 border-none bg-transparent shadow-none max-w-sm w-[92vw] overflow-visible">
          <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl animate-modal-enter">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
              <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                {selectedCurrency && currencyConfig[selectedCurrency]?.icon}
                Send {selectedCurrency}
              </DialogTitle>
              <button onClick={() => setShowSendModal(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Amount */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Amount
                </Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00000"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    className="h-14 pl-4 pr-24 text-lg font-medium border-2 border-gray-200 dark:border-gray-800 focus:border-orange-500 dark:focus:border-orange-500 transition-all bg-white/50 dark:bg-gray-950/50 rounded-xl"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const maxBalance = walletBalances.find(b => b.currency === selectedCurrency)?.balance || "0";
                        setSendAmount(maxBalance);
                      }}
                      className="h-9 px-3 text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 font-bold text-xs uppercase"
                    >
                      Max
                    </Button>
                    <span className="text-xs font-bold text-gray-400 pr-1">{selectedCurrency}</span>
                  </div>
                </div>
              </div>

              {/* Recipient Address */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Recipient Address
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowQRScanner(true)}
                    className="flex items-center gap-1 text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Scan QR
                  </button>
                </div>
                <Input
                  id="address"
                  type="text"
                  placeholder="Enter full wallet address (0x...)"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="h-12 px-3 text-sm font-mono border-2 border-gray-200 dark:border-gray-800 focus:border-orange-500 dark:focus:border-orange-500 transition-all bg-gray-50 dark:bg-gray-950/50 rounded-xl"
                />
                <p className="text-xs text-gray-400">
                  Paste the complete wallet address or scan a QR code
                </p>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-3 pt-1">
                <Button
                  onClick={handleConfirmSend}
                  disabled={sendCryptoMutation.isPending}
                  className="h-12 w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]"
                >
                  {sendCryptoMutation.isPending ? "Sending..." : "Send"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowSendModal(false)}
                  className="h-12 w-full text-gray-500 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Modal */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent hideCloseButton noAnimation className="p-0 border-none bg-transparent shadow-none max-w-sm w-[92vw] overflow-visible">
          <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl animate-modal-enter">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
              <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <QrCode className="w-4 h-4 text-orange-500" />
                Receive {selectedCurrency}
              </DialogTitle>
              <button onClick={() => setShowQRModal(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-center">
              <div className="bg-white dark:bg-white p-4 rounded-2xl inline-block mx-auto shadow-inner">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="Wallet QR Code" className="w-48 h-48" />
                ) : (
                  <div className="w-48 h-48 bg-gray-100 rounded-xl flex items-center justify-center">
                    <span className="text-gray-400 text-sm">Generating...</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Your {selectedCurrency} address
                </p>
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800">
                  <code className="flex-1 text-xs font-mono text-gray-700 dark:text-gray-300 break-all text-left">
                    {user?.walletAddress}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => user?.walletAddress && copyToClipboard(user.walletAddress)}
                    className="h-8 w-8 p-0 flex-shrink-0 text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                    disabled={!user?.walletAddress}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Scanner Modal */}
      <Dialog open={showQRScanner} onOpenChange={(open) => {
        if (!open) {
          stopQRScanner();
        }
        setShowQRScanner(open);
      }}>
        <DialogContent hideCloseButton noAnimation className="p-0 border-none bg-transparent shadow-none max-w-sm w-[92vw] overflow-visible">
          <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl animate-modal-enter">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
              <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <Camera className="w-4 h-4 text-orange-500" />
                Scan Wallet QR Code
              </DialogTitle>
              <button onClick={() => { stopQRScanner(); setShowQRScanner(false); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="relative bg-gray-950 rounded-xl overflow-hidden" style={{ minHeight: '280px' }}>
                <div id="qr-reader" className="w-full" />
                {!isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white/80">
                      <Camera className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Initializing camera...</p>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                Point your camera at a wallet QR code to scan
              </p>
              <Button
                variant="ghost"
                onClick={() => {
                  stopQRScanner();
                  setShowQRScanner(false);
                }}
                className="h-12 w-full text-gray-500 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}