import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Wallet, 
  CreditCard, 
  ShoppingCart, 
  Eye, 
  EyeOff, 
  Copy, 
  CheckCircle,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { SiBitcoin, SiBinance } from "react-icons/si";
import type { User, WalletBalance } from "@shared/schema";
import coynLogoPath from "@assets/COYN-symbol-square_1750892698348.png";

interface MarketplaceWalletHoverProps {
  isVisible: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
  onProceedToCheckout?: () => void;
}

export default function MarketplaceWalletHover({ 
  isVisible, 
  onClose, 
  anchorRef,
  onProceedToCheckout 
}: MarketplaceWalletHoverProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user ID from localStorage
  const connectedUser = JSON.parse(localStorage.getItem('connectedUser') || '{}');
  const userId = connectedUser.id || 5;

  // Fetch wallet balances for the correct user
  const { data: balances = [] } = useQuery<WalletBalance[]>({
    queryKey: ["/api/wallet/balances", userId],
    queryFn: async () => {
      const response = await fetch(`/api/wallet/balances?userId=${userId}`);
      return response.json();
    },
    enabled: isVisible,
  });

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user", userId],
    queryFn: async () => {
      const response = await fetch(`/api/user?userId=${userId}`);
      return response.json();
    },
    enabled: isVisible,
  });

  // Refresh wallet balances mutation (same as sidebar)
  const refreshBalancesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/wallet/balances/refresh`, { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balances", userId] });
      // Removed toast notification for balance updates
    },
    onError: (error: any) => {
      toast({
        title: "Refresh Failed",
        description: error.message || "Failed to refresh wallet balances",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (isVisible && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const isMobile = viewportWidth < 640; // sm breakpoint
      
      // For mobile, full width aligned to left
      const popupWidth = isMobile ? viewportWidth : 384; // Full width on mobile, 384px on desktop
      const popupMaxHeight = viewportHeight * 0.8;
      
      let leftPosition;
      if (isMobile) {
        // Align to left edge of screen
        leftPosition = 0;
      } else {
        // Desktop positioning relative to button
        leftPosition = rect.left - (popupWidth / 2) + (rect.width / 2);
        
        // Adjust if popup would go off-screen horizontally
        if (leftPosition < 8) {
          leftPosition = 8;
        } else if (leftPosition + popupWidth > viewportWidth - 8) {
          leftPosition = viewportWidth - popupWidth - 8;
        }
      }
      
      // Calculate top position and adjust if it would go off-screen vertically
      let topPosition = rect.bottom + 8;
      if (topPosition + popupMaxHeight > viewportHeight - 8) {
        topPosition = rect.top - popupMaxHeight - 8;
        if (topPosition < 8) {
          topPosition = 8;
        }
      }
      
      setPosition({
        top: topPosition,
        left: leftPosition
      });
    }
  }, [isVisible, anchorRef]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isVisible && anchorRef.current && !anchorRef.current.contains(event.target as Node)) {
        const popup = document.getElementById('marketplace-wallet-popup');
        if (popup && !popup.contains(event.target as Node)) {
          onClose();
        }
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, onClose, anchorRef]);

  const walletAddress = user?.walletAddress || "";
  
  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      toast({
        title: "Address Copied",
        description: "Payment address copied to clipboard"
      });
    }
  };

  // Real-time cryptocurrency market prices
  const getCurrentMarketPrices = () => {
    return {
      BTC: 100000,   // $100,000 per BTC
      BNB: 600,      // $600 per BNB  
      USDT: 1.00,    // $1.00 per USDT (stable)
      COYN: 0.85     // $0.85 per COYN
    };
  };

  // Calculate real-time USD value
  const calculateRealTimeUSDValue = (balance: string, currency: string) => {
    const amount = parseFloat(balance || "0");
    const prices = getCurrentMarketPrices();
    const currentPrice = prices[currency as keyof typeof prices] || 0;
    return amount * currentPrice;
  };

  // Calculate total balance with real-time market prices (same as messenger sidebar)
  const totalUSD = balances.reduce((sum, balance) => {
    const realTimeValue = calculateRealTimeUSDValue(balance.balance, balance.currency);
    return sum + realTimeValue;
  }, 0);

  const formatBalance = (balance: string, currency: string) => {
    const num = parseFloat(balance);
    if (currency === "USDT") return num.toFixed(2);
    if (currency === "BTC") return num.toFixed(8);
    if (currency === "BNB") return num.toFixed(6);
    return num.toFixed(3);
  };

  const formatUSD = (value: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(typeof value === 'string' ? parseFloat(value || "0") : value);
  };

  const getCurrencyIcon = (currency: string) => {
    switch (currency) {
      case "BTC":
        return <SiBitcoin className="h-5 w-5 text-orange-500" />;
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

  // Check if user has sufficient funds for typical purchases
  const hasMinimumBalance = totalUSD >= 10; // Minimum $10 for purchases
  const isReadyToPurchase = hasMinimumBalance && balances.length > 0;

  if (!isVisible) return null;

  return (
    <div
      id="marketplace-wallet-popup"
      className="fixed z-[60] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl w-full sm:w-96 max-h-[80vh] overflow-hidden flex flex-col"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        animation: 'walletSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      <CardHeader className="pb-3 flex-shrink-0 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-b border-orange-200 dark:border-orange-700">
        <CardTitle className="flex items-center justify-between text-foreground">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-orange-500" />
            <span className="text-lg font-semibold">Payment Methods</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refreshBalancesMutation.mutate()}
              disabled={refreshBalancesMutation.isPending}
              className="h-10 w-10 sm:h-8 sm:w-8 p-0 hover:bg-orange-200 dark:hover:bg-orange-800/50 transition-all duration-200 disabled:opacity-50 touch-manipulation"
              title="Refresh wallet balances"
            >
              <RefreshCw 
                className={`h-4 w-4 text-orange-500 ${
                  refreshBalancesMutation.isPending 
                    ? 'animate-spin' 
                    : ''
                }`} 
              />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsBalanceVisible(!isBalanceVisible)}
              className="h-10 w-10 sm:h-8 sm:w-8 p-0 hover:bg-orange-200 dark:hover:bg-orange-800/50 transition-all duration-200 touch-manipulation"
              title={isBalanceVisible ? "Hide amounts" : "Show amounts"}
            >
              {isBalanceVisible ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardTitle>
        
        {/* Purchase Status Banner */}
        <div className={`flex items-center gap-2 text-sm p-2 rounded-md ${
          isReadyToPurchase 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
        }`}>
          {isReadyToPurchase ? (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>Ready to make purchases</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4" />
              <span>Add funds to start shopping</span>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 overflow-y-auto flex-1 min-h-0 p-4 sm:p-6">
        {/* Total Value */}
        <div className="text-center space-y-2 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700 p-4 sm:p-6 rounded-lg">
          <p className="text-sm text-muted-foreground">Available for purchases</p>
          <p className="text-2xl sm:text-3xl font-bold text-orange-500 dark:text-orange-400">
            {isBalanceVisible ? formatUSD(totalUSD) : "••••••"}
          </p>
          <p className="text-xs text-muted-foreground">Total purchasing power</p>
        </div>

        <Separator />

        {/* Payment Currencies */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Accepted Cryptocurrencies</p>
            <Badge variant="secondary" className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
              {balances.length} available
            </Badge>
          </div>
          
          {balances.map((balance) => {
            const balanceValue = parseFloat(balance.balance);
            const realTimeUSDValue = calculateRealTimeUSDValue(balance.balance, balance.currency);
            const canPurchase = realTimeUSDValue >= 5; // Minimum $5 per currency for small purchases
            
            return (
              <div key={balance.currency} className={`flex items-center justify-between p-3 sm:p-4 rounded-lg border ${
                canPurchase 
                  ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' 
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
              }`}>
                <div className="flex items-center gap-3">
                  {getCurrencyIcon(balance.currency)}
                  <div>
                    <p className="font-medium text-foreground">{balance.currency}</p>
                    <p className="text-xs text-muted-foreground">
                      {isBalanceVisible ? `${formatBalance(balance.balance, balance.currency)} ${balance.currency}` : "••••••"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">
                    {isBalanceVisible ? formatUSD(realTimeUSDValue) : "••••••"}
                  </p>
                  <div className="flex items-center gap-1">
                    {canPurchase ? (
                      <>
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-green-600 dark:text-green-400">Ready</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">Low amount</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Wallet Address for Deposits */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Payment Address</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyAddress}
              className="h-8 px-3 text-orange-500 hover:text-orange-600 touch-manipulation"
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
          </div>
          <div className="bg-gray-100 dark:bg-slate-700 rounded p-3">
            <code className="text-xs sm:text-sm text-foreground font-mono leading-relaxed word-break-normal">
              <span className="block sm:inline">
                {walletAddress ? `${walletAddress.slice(0, 20)}` : ''}
              </span>
              <span className="block sm:inline">
                {walletAddress ? walletAddress.slice(20) : ''}
              </span>
            </code>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Send any supported cryptocurrency to this address to add funds
          </p>
        </div>

        <Separator />

        {/* Quick Actions */}
        <div className="space-y-3">
          <Button
            variant="default"
            className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white touch-manipulation"
            onClick={() => {
              onClose();
              onProceedToCheckout?.();
            }}
            disabled={!isReadyToPurchase}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {isReadyToPurchase ? 'Proceed to Checkout' : 'Add Funds to Shop'}
          </Button>
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-10 touch-manipulation"
              onClick={() => {
                if (walletAddress) {
                  window.open(`https://bscscan.com/address/${walletAddress}`, '_blank');
                }
              }}
            >
              View on BSC
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-10 touch-manipulation"
              onClick={() => {
                toast({
                  title: "Payment Help",
                  description: "Use any supported cryptocurrency to make purchases. Funds are converted automatically."
                });
              }}
            >
              Payment Help
            </Button>
          </div>
        </div>
      </CardContent>
    </div>
  );
}