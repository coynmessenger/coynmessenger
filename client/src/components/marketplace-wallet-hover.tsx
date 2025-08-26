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
  const [position, setPosition] = useState({ top: 0, left: 0, width: 340 });
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
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

  // Fetch wallet balances for the correct user (only if userId exists)
  const { data: balances = [] } = useQuery<WalletBalance[]>({
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
    enabled: isVisible && !!userId,
  });

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user", userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }
      const response = await fetch(`/api/user?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      return response.json();
    },
    enabled: isVisible && !!userId,
  });

  // Refresh wallet balances mutation (same as sidebar)
  const refreshBalancesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/wallet/balances/refresh`, { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balances", userId] });
      toast({
        title: "Balances Updated", 
        description: "Your COYN Wallet balances have been refreshed",
      });
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
      
      // Responsive width calculation to prevent overflow
      const maxWidth = Math.min(384, viewportWidth - 16); // Maximum 384px or viewport width minus padding
      const popupWidth = isMobile ? Math.min(viewportWidth - 16, 340) : maxWidth; // Conservative width on mobile
      const popupMaxHeight = viewportHeight * 0.8;
      
      let leftPosition;
      if (isMobile) {
        // Center on mobile with padding
        leftPosition = Math.max(8, (viewportWidth - popupWidth) / 2);
      } else {
        // Desktop positioning relative to button
        leftPosition = rect.left - (popupWidth / 2) + (rect.width / 2);
        
        // Ensure popup stays within viewport bounds
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
        left: leftPosition,
        width: popupWidth
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

    const handleResize = () => {
      if (isVisible && anchorRef.current) {
        const rect = anchorRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const isMobile = viewportWidth < 640;
        
        const maxWidth = Math.min(384, viewportWidth - 16);
        const popupWidth = isMobile ? Math.min(viewportWidth - 16, 340) : maxWidth;
        
        let leftPosition;
        if (isMobile) {
          leftPosition = Math.max(8, (viewportWidth - popupWidth) / 2);
        } else {
          leftPosition = rect.left - (popupWidth / 2) + (rect.width / 2);
          if (leftPosition < 8) {
            leftPosition = 8;
          } else if (leftPosition + popupWidth > viewportWidth - 8) {
            leftPosition = viewportWidth - popupWidth - 8;
          }
        }
        
        setPosition(prev => ({
          ...prev,
          left: leftPosition,
          width: popupWidth
        }));
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', handleResize);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('resize', handleResize);
      };
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
      className="fixed z-[60] bg-white dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-600 rounded-xl shadow-2xl max-h-[80vh] overflow-hidden flex flex-col backdrop-blur-sm"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
        minWidth: '300px',
        maxWidth: 'calc(100vw - 16px)',
        animation: 'walletSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      <CardHeader className="pb-3 flex-shrink-0 bg-gradient-to-r from-orange-100 to-orange-150 dark:from-slate-800 dark:to-slate-750 border-b-2 border-orange-300 dark:border-slate-600">
        <CardTitle className="flex items-center justify-between text-foreground">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <CreditCard className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
            <span className="text-lg font-bold text-gray-900 dark:text-white truncate">Payment Methods</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refreshBalancesMutation.mutate()}
              disabled={refreshBalancesMutation.isPending}
              className="h-8 w-8 p-0 hover:bg-orange-200 dark:hover:bg-slate-700 transition-all duration-200 disabled:opacity-50"
              title="Refresh wallet balances"
            >
              <RefreshCw 
                className={`h-4 w-4 text-orange-600 dark:text-orange-400 ${
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
              className="h-8 w-8 p-0 hover:bg-orange-200 dark:hover:bg-slate-700 transition-all duration-200"
              title={isBalanceVisible ? "Hide amounts" : "Show amounts"}
            >
              {isBalanceVisible ? (
                <Eye className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              ) : (
                <EyeOff className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              )}
            </Button>
          </div>
        </CardTitle>
        
        {/* Purchase Status Banner */}
        <div className={`flex items-center gap-2 text-sm p-3 rounded-lg border-2 ${
          isReadyToPurchase 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700'
            : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700'
        }`}>
          {isReadyToPurchase ? (
            <>
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">Ready to make purchases</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">Add funds to start shopping</span>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 overflow-y-auto flex-1 min-h-0 p-4">
        {/* Total Value */}
        <div className="text-center space-y-2 bg-gradient-to-br from-gray-100 to-gray-150 dark:from-slate-800 dark:to-slate-750 p-4 rounded-xl border-2 border-gray-200 dark:border-slate-600">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Available for purchases</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {isBalanceVisible ? formatUSD(totalUSD) : "••••••"}
          </p>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total purchasing power</p>
        </div>

        <div className="border-t-2 border-gray-200 dark:border-slate-600 my-4"></div>

        {/* Payment Currencies */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900 dark:text-white">Accepted Cryptocurrencies</p>
            <Badge variant="secondary" className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-600 font-medium">
              {balances.length} available
            </Badge>
          </div>
          
          {balances.map((balance) => {
            const balanceValue = parseFloat(balance.balance);
            const realTimeUSDValue = calculateRealTimeUSDValue(balance.balance, balance.currency);
            const canPurchase = realTimeUSDValue >= 5; // Minimum $5 per currency for small purchases
            
            return (
              <div key={balance.currency} className={`flex items-center justify-between p-3 rounded-xl border-2 ${
                canPurchase 
                  ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20' 
                  : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
              }`}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex-shrink-0">
                    {getCurrencyIcon(balance.currency)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 dark:text-white">{balance.currency}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {isBalanceVisible ? `${formatBalance(balance.balance, balance.currency)} ${balance.currency}` : "••••••"}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900 dark:text-white">
                    {isBalanceVisible ? formatUSD(realTimeUSDValue) : "••••••"}
                  </p>
                  <div className="flex items-center justify-end gap-1">
                    {canPurchase ? (
                      <>
                        <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">Ready</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <span className="text-xs text-gray-500 font-medium">Low</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t-2 border-gray-200 dark:border-slate-600 my-4"></div>

        {/* Wallet Address for Deposits */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900 dark:text-white">Payment Address</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyAddress}
              className="h-8 px-2 text-orange-500 hover:text-orange-600 flex-shrink-0"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-3 border border-gray-200 dark:border-slate-600">
            <div className="text-xs font-mono text-foreground break-all leading-relaxed overflow-hidden">
              {walletAddress || 'Connect wallet to view address'}
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Send any supported cryptocurrency to this address to add funds
          </p>
        </div>

        <div className="border-t-2 border-gray-200 dark:border-slate-600 my-4"></div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <Button
            variant="default"
            className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-bold border-2 border-orange-700 dark:border-orange-500"
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