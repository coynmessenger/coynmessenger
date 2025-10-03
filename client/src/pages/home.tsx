import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useDisconnect, useActiveWallet } from "thirdweb/react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Check, Users, Lock, Globe, ArrowRight, Send, Wallet } from "lucide-react";
import { SiBinance } from "react-icons/si";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import coynfulLogoPath from "@assets/Coynful logo fin copy_1759096913804.png";
import coynCoinPath from "@assets/image_1759095831947.png";
import backgroundImagePath from "@assets/images(4)_1753827100393-ZmpUJssK_1759098427313.jpg";
import coynSymbolPath from "@assets/COYN symbol square_1759099649514.png";
import TermsModal from "@/components/terms-modal";
import PrivacyModal from "@/components/privacy-modal";
import PWAInstallPrompt from "@/components/pwa-install-prompt";
import ThirdwebWalletConnector from "@/components/thirdweb-wallet-connector";
import type { User, WalletBalance } from "@shared/schema";
import { sendTransaction, prepareTransaction, toWei } from "thirdweb";
import { createThirdwebClient, getContract, prepareContractCall } from "thirdweb";
import { bsc } from "thirdweb/chains";

export default function HomePage() {
  useScrollToTop();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { disconnect } = useDisconnect();
  const activeWallet = useActiveWallet();
  const { toast } = useToast();
  
  const [isConnected, setIsConnected] = useState(() => {
    return localStorage.getItem('walletConnected') === 'true';
  });
  
  const [connectedUser, setConnectedUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('connectedUser');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to parse connectedUser from localStorage:', error);
      localStorage.removeItem('connectedUser');
      return null;
    }
  });
  
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  
  // Send token modal states
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>("");
  const [sendAmount, setSendAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");

  // Check for existing authentication on mount and when wallet state changes
  useEffect(() => {
    let authCheckTimeout: NodeJS.Timeout;
    
    const checkAuthAndRedirect = () => {
      const userSignedOut = localStorage.getItem('userSignedOut');
      if (userSignedOut === 'true') {
        console.log('🚫 User signed out, staying on homepage');
        setIsConnected(false);
        setConnectedUser(null);
        return;
      }
      
      const storedConnected = localStorage.getItem('walletConnected');
      const storedUser = localStorage.getItem('connectedUser');
      const userClickedHome = localStorage.getItem('userClickedHome');
      
      console.log('🔍 Checking authentication state:', {
        storedConnected,
        hasStoredUser: !!storedUser,
        userClickedHome,
        userOnHomepage: sessionStorage.getItem('userOnHomepage')
      });
      
      // Update component state based on localStorage
      if (storedConnected === 'true' && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          console.log('🔍 Parsed user:', { id: parsedUser?.id, hasWalletAddress: !!parsedUser?.walletAddress });
          
          if (parsedUser?.id || parsedUser?.address || parsedUser?.walletAddress) {
            // Update component state immediately
            setIsConnected(true);
            setConnectedUser(parsedUser);
            
            // Don't redirect if user explicitly chose to stay on homepage  
            if (userClickedHome === 'true' || sessionStorage.getItem('userOnHomepage') === 'true') {
              console.log('👤 User explicitly navigated to homepage, staying on homepage');
              sessionStorage.setItem('userOnHomepage', 'true');
              return;
            }
            
            console.log('✅ Authenticated user detected, redirecting to messenger...');
            setLocation("/messenger");
            return;
          } else {
            console.log('❌ User data incomplete, clearing storage');
            localStorage.removeItem('walletConnected');
            localStorage.removeItem('connectedUser');
            localStorage.removeItem('connectedUserId');
            setIsConnected(false);
            setConnectedUser(null);
          }
        } catch (error) {
          console.log('❌ Error parsing user data:', error);
          localStorage.removeItem('walletConnected');
          localStorage.removeItem('connectedUser');
          localStorage.removeItem('connectedUserId');
          setIsConnected(false);
          setConnectedUser(null);
        }
      } else {
        // No valid connection found
        setIsConnected(false);
        setConnectedUser(null);
      }
    };

    // Initial check immediately
    checkAuthAndRedirect();

    // Listen for wallet connection events (when user returns from wallet app)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'walletConnected' || e.key === 'connectedUser' || e.key === 'userSignedOut') {
        console.log('📱 MOBILE: Storage change detected, checking for wallet return...', e.key);
        // Clear any pending timeout and schedule new check
        clearTimeout(authCheckTimeout);
        authCheckTimeout = setTimeout(checkAuthAndRedirect, 150);
      }
    };

    // Listen for focus events (when user returns from wallet app)
    const handleFocus = () => {
      console.log('👁️ MOBILE: Window focus detected, checking for wallet return...');
      // Clear any pending timeout and schedule new check
      clearTimeout(authCheckTimeout);
      authCheckTimeout = setTimeout(checkAuthAndRedirect, 150);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearTimeout(authCheckTimeout);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [setLocation]);

  // Fetch wallet balances
  const { data: walletBalances = [] } = useQuery<WalletBalance[]>({
    queryKey: ["/api/wallet/balances", connectedUser?.id],
    enabled: !!connectedUser?.id && isConnected,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const connectWalletMutation = useMutation({
    mutationFn: async ({ walletAddress }: { walletAddress: string }) => {
      try {
        return await apiRequest("POST", "/api/users/find-or-create", { walletAddress });
      } catch (error: any) {
        throw new Error(error.message || "Failed to connect wallet");
      }
    },
    onSuccess: (user: User) => {
      console.log('✅ COYN: User authenticated successfully!', { userId: user.id, walletAddress: user.walletAddress });
      
      // Clean up any competing states first
      localStorage.removeItem('pendingWalletConnection');
      localStorage.removeItem('walletConnectionAttempt');
      localStorage.removeItem('walletRedirectState');
      localStorage.removeItem('explicitWalletConnection'); // Clean up the connection flag
      localStorage.removeItem('userSignedOut'); // Clear sign out flag on successful connection
      localStorage.removeItem('userClickedHome'); // Clear any homepage preference
      sessionStorage.removeItem('userOnHomepage'); // Clear any homepage session flag
      
      // Store connection state
      localStorage.setItem('walletConnected', 'true');
      localStorage.setItem('connectedUser', JSON.stringify(user));
      localStorage.setItem('connectedUserId', user.id.toString());
      
      // Update cache and state
      queryClient.setQueryData(["/api/user"], user);
      queryClient.setQueryData(["/api/user", user.id], user);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      
      // Update component state
      setConnectedUser(user);
      setIsConnected(true);
      
      // Clean URL
      const cleanUrl = `${window.location.origin}${window.location.pathname}`;
      window.history.replaceState({}, document.title, cleanUrl);
      
      // IMMEDIATE REDIRECT to messenger - this is the primary path for auto-navigation
      console.log('🎯 COYN: SUCCESS! Auto-navigating to messenger...');
      console.log('🖥️ DESKTOP/📱 MOBILE: Universal auto-navigation starting...');
      
      // Use multiple strategies to ensure navigation works on both desktop and mobile
      // Strategy 1: Immediate navigation
      setLocation("/messenger");
      
      // Strategy 2: Backup navigation after short delay (for any platform-specific timing issues)
      setTimeout(() => {
        console.log('🔄 BACKUP: Ensuring navigation to messenger...');
        if (window.location.pathname !== '/messenger') {
          console.log('⚡ BACKUP: Navigation needed, redirecting to messenger...');
          setLocation("/messenger");
        } else {
          console.log('✅ BACKUP: Already on messenger, navigation successful');
        }
      }, 150);
      
      // Strategy 3: Force navigation if still not on messenger (last resort)
      setTimeout(() => {
        if (window.location.pathname !== '/messenger') {
          console.log('🚨 FORCE: Force navigation to messenger for desktop compatibility...');
          window.location.href = '/messenger';
        }
      }, 300);
    },
  });

  const handleSignOut = async () => {
    try {
      // First disconnect the thirdweb wallet
      console.log('🔌 Disconnecting thirdweb wallet...');
      if (activeWallet) {
        await disconnect(activeWallet);
      }
    } catch (error) {
      console.error('Error disconnecting thirdweb wallet:', error);
    }
    
    // Set explicit sign out flag
    localStorage.setItem('userSignedOut', 'true');
    
    // Clear ALL localStorage items
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('connectedUser');
    localStorage.removeItem('connectedUserId');
    localStorage.removeItem('pendingWalletConnection');
    localStorage.removeItem('shopping-cart');
    localStorage.removeItem('theme');
    localStorage.removeItem('favorites');
    localStorage.removeItem('wallet-balances-hidden');
    
    // Clear session storage
    sessionStorage.clear();
    
    // Reset state
    setIsConnected(false);
    setConnectedUser(null);
    
    // Force page refresh
    window.location.reload();
  };

  const handleThirdwebConnect = (address: string) => {
    console.log('🔗 COYN: Wallet approved! Address received:', address);
    console.log('🚀 COYN: Starting user authentication and AUTO-NAVIGATION to messenger...');
    
    // Clear ALL navigation flags that might prevent redirect since user is explicitly connecting
    localStorage.removeItem('userSignedOut');
    localStorage.removeItem('userClickedHome');
    sessionStorage.removeItem('userOnHomepage');
    
    // Mark that this is an explicit wallet connection for immediate redirect
    localStorage.setItem('explicitWalletConnection', 'true');
    
    console.log('🎯 COYN: User flags cleared, proceeding with authentication and auto-navigation...');
    connectWalletMutation.mutate({ walletAddress: address });
  };

  const handleThirdwebDisconnect = () => {
    console.log('🔌 Thirdweb wallet disconnected');
    // Clear wallet connection state
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('connectedUser');
    localStorage.removeItem('connectedUserId');
    
    // Reset component state
    setIsConnected(false);
    setConnectedUser(null);
    
    // Clear query cache
    queryClient.clear();
  };

  // Handle sending tokens
  const sendTokenMutation = useMutation({
    mutationFn: async ({ currency, amount, recipient }: { currency: string; amount: string; recipient: string }) => {
      if (!activeWallet || !connectedUser?.walletAddress) {
        throw new Error('Wallet not connected');
      }

      const account = activeWallet.getAccount();
      if (!account?.address) {
        throw new Error('Unable to access wallet account');
      }

      // Validate recipient address
      if (!recipient.startsWith('0x') || recipient.length !== 42) {
        throw new Error('Invalid recipient address format');
      }

      // Ensure on BSC network
      const chain = activeWallet.getChain();
      if (chain?.id !== 56) {
        await activeWallet.switchChain(bsc);
      }

      const client = createThirdwebClient({
        clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID,
      });

      let transaction;
      
      if (currency === 'BNB') {
        // Native BNB transfer
        transaction = prepareTransaction({
          to: recipient,
          value: toWei(amount),
          chain: bsc,
          client,
        });
      } else {
        // Token transfers (USDT, COYN)
        const tokenAddresses: Record<string, string> = {
          USDT: '0x55d398326f99059fF775485246999027B3197955',
          COYN: '0x22c89a156cb6f05bc54fae2ed8d690a1bc4fe8e1'
        };

        const tokenAddress = tokenAddresses[currency];
        if (!tokenAddress) {
          throw new Error(`Unsupported currency: ${currency}`);
        }

        const contract = getContract({
          client,
          chain: bsc,
          address: tokenAddress,
        });

        const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1e18));

        transaction = prepareContractCall({
          contract,
          method: "function transfer(address to, uint256 amount) returns (bool)",
          params: [recipient, amountInWei],
        });
      }

      const result = await sendTransaction({
        transaction: await transaction,
        account,
      });

      return result.transactionHash;
    },
    onSuccess: (txHash) => {
      toast({
        title: "Transaction Sent!",
        description: `Transaction hash: ${txHash.substring(0, 10)}...`,
      });
      
      // Reset form
      setSendAmount("");
      setRecipientAddress("");
      setShowSendModal(false);
      
      // Refresh balances
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balances", connectedUser?.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to send transaction",
        variant: "destructive",
      });
    },
  });

  const handleSendClick = (currency: string, balance: string) => {
    setSelectedCurrency(currency);
    setSendAmount(balance); // Set to max by default
    setShowSendModal(true);
  };

  const handleConfirmSend = () => {
    if (!sendAmount || !recipientAddress || !selectedCurrency) {
      toast({
        title: "Missing Information",
        description: "Please enter amount and recipient address",
        variant: "destructive",
      });
      return;
    }

    sendTokenMutation.mutate({
      currency: selectedCurrency,
      amount: sendAmount,
      recipient: recipientAddress,
    });
  };

  const getCurrencyIcon = (currency: string) => {
    switch (currency) {
      case "BNB":
        return <SiBinance className="h-5 w-5 text-yellow-500" />;
      case "USDT":
        return <div className="h-5 w-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">T</div>;
      case "COYN":
        return <img src={coynCoinPath} alt="COYN" className="h-5 w-5 rounded-full" />;
      default:
        return null;
    }
  };

  const formatBalance = (balance: string) => {
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

  const features = [
    { icon: MessageCircle, title: "Real-time Messaging", description: "Instant encrypted communication" },
    { icon: Users, title: "Wallet Integration", description: "Send crypto directly in chats" },
    { icon: Lock, title: "Secure & Private", description: "End-to-end encryption" },
    { icon: Globe, title: "Global Network", description: "Connect with users worldwide" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-orange-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800 flex flex-col">

      {/* Header with Logo */}
      <header className="w-full p-4 sm:p-6">
        <div className="flex justify-center">
          <img 
            src={coynfulLogoPath} 
            alt="Coynful" 
            className="h-32 w-auto object-contain"
          />
        </div>
      </header>

      {/* Main Content - Centered Layout */}
      <main 
        className="flex-1 flex flex-col items-center justify-start px-4 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImagePath})` }}
      >
        {/* Connection Card - Positioned directly under logo */}
        <div className="w-full max-w-md mx-auto mb-8">
            <Card className="border-0 shadow-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
              <CardHeader className="text-center space-y-4 pb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-3">
                    <img 
                      src={coynSymbolPath} 
                      alt="COYN" 
                      className="w-[35px] h-[35px]"
                    />
                    COYN Messenger
                  </h3>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {!isConnected || !connectedUser ? (
                  <div className="space-y-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-4">
                        Choose your preferred wallet to connect
                      </p>
                    </div>

                    {/* Thirdweb Wallet Connection */}
                    <div className="flex justify-center">
                      <ThirdwebWalletConnector
                        onConnect={handleThirdwebConnect}
                        onDisconnect={handleThirdwebDisconnect}
                        className="w-[640px] h-[370px] bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-900 dark:text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg border border-gray-200 dark:border-slate-600"
                      />
                    </div>
                    
                    {connectWalletMutation.isPending && (
                      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                        ✅ Wallet connected successfully - user can now click to enter messenger
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                        <Check className="h-8 w-8 text-green-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-green-600 dark:text-green-400 mb-2">
                          Connected to COYN Network
                        </h3>
                        <p className="text-black dark:text-foreground mb-2">
                          Welcome to COYN, {connectedUser?.displayName}!
                        </p>
                        <p className="text-xs text-gray-600 dark:text-muted-foreground font-mono break-all px-4">
                          {connectedUser?.walletAddress}
                        </p>
                      </div>
                    </div>

                    {/* Wallet Balances Section */}
                    <div className="border-t border-border pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <Wallet className="h-4 w-4" />
                          Your Tokens
                        </h4>
                      </div>
                      
                      <div className="space-y-3">
                        {walletBalances.length > 0 ? (
                          walletBalances.map((balance) => (
                            <div
                              key={balance.currency}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                              data-testid={`token-balance-${balance.currency.toLowerCase()}`}
                            >
                              <div className="flex items-center space-x-3">
                                {getCurrencyIcon(balance.currency)}
                                <div>
                                  <div className="font-semibold text-gray-900 dark:text-white text-sm">
                                    {balance.currency}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    {formatBalance(balance.balance)}
                                  </div>
                                  {balance.usdValue && (
                                    <div className="text-xs text-gray-500 dark:text-gray-500">
                                      ${parseFloat(balance.usdValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleSendClick(balance.currency, balance.balance)}
                                className="bg-orange-500 hover:bg-orange-600 text-white"
                                data-testid={`button-send-${balance.currency.toLowerCase()}`}
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Send All
                              </Button>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                            Loading balances...
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 border-t border-border pt-4">
                      <Button
                        onClick={() => setLocation("/messenger")}
                        className="w-full bg-black dark:bg-primary hover:bg-gray-800 dark:hover:bg-primary/90 text-white dark:text-primary-foreground font-semibold rounded-lg h-14 sm:h-12 touch-manipulation"
                        data-testid="button-open-messenger"
                      >
                        <MessageCircle className="mr-2 h-6 w-6 sm:h-5 sm:w-5" />
                        Open Messenger
                      </Button>
                      <Button
                        onClick={handleSignOut}
                        variant="outline"
                        className="w-full border-gray-300 dark:border-border text-gray-700 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-muted rounded-lg h-14 sm:h-12 touch-manipulation"
                        data-testid="button-sign-out"
                      >
                        Sign Out
                      </Button>
                    </div>
                  </div>
                )}

                {/* Supported Currencies */}
                {(!isConnected || !connectedUser) && (
                  <div className="border-t border-border pt-4">
                    <p className="text-center text-muted-foreground mb-3 text-sm">
                      Supported Currencies
                    </p>
                    <div className="flex justify-center space-x-3 flex-wrap gap-2">
                      {['BNB', 'USDT', 'COYN'].map((currency) => (
                        <Badge key={currency} variant="secondary" className="text-xs">
                          {currency}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
        </div>
        
        {/* Features Section - Moved to bottom */}
        <div className="w-full max-w-6xl mx-auto mt-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center space-y-3 p-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mx-auto">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                  {feature.title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-600 dark:text-gray-400 space-y-4">
          {/* Terms and Privacy Links */}
          <div className="flex items-center justify-center space-x-6">
            <button
              onClick={() => setShowTermsModal(true)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Terms
            </button>
            <button
              onClick={() => setShowPrivacyModal(true)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Privacy
            </button>
          </div>
          
          {/* Copyright */}
          <p className="flex items-center justify-center gap-1">© 2025 Powered by <a href="https://bscscan.com/token/0x22c89a156cb6f05bc54fae2ed8d690a1bc4fe8e1" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-1"><img src={coynCoinPath} alt="COYN" className="w-4 h-4" />COYN</a></p>
        </div>
      </footer>

      {/* Modals */}
      <TermsModal 
        isOpen={showTermsModal} 
        onClose={() => setShowTermsModal(false)} 
      />
      <PrivacyModal 
        isOpen={showPrivacyModal} 
        onClose={() => setShowPrivacyModal(false)} 
      />
      
      {/* Send Token Modal */}
      <Dialog open={showSendModal} onOpenChange={setShowSendModal}>
        <DialogContent className="sm:max-w-md bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {selectedCurrency && getCurrencyIcon(selectedCurrency)}
              <span>Send All {selectedCurrency}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="send-amount">Amount</Label>
              <div className="flex space-x-2">
                <Input
                  id="send-amount"
                  type="number"
                  placeholder="0.00"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  className="flex-1 bg-white/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50"
                  data-testid="input-send-amount"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const balance = walletBalances.find(b => b.currency === selectedCurrency);
                    if (balance) setSendAmount(balance.balance);
                  }}
                  className="px-3 border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-900/20 text-orange-600 dark:text-orange-400"
                  data-testid="button-max-amount"
                >
                  Max
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This will send all available {selectedCurrency} tokens
              </p>
            </div>
            <div>
              <Label htmlFor="recipient-address">Recipient Address</Label>
              <textarea
                id="recipient-address"
                placeholder="Enter full wallet address (0x...)"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="w-full min-h-[80px] p-3 text-sm font-mono bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 rounded-md resize-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 break-all"
                rows={3}
                data-testid="input-recipient-address"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Paste the complete wallet address (42 characters starting with 0x)
              </p>
            </div>
            <div className="flex space-x-3 pt-4">
              <Button
                onClick={handleConfirmSend}
                disabled={sendTokenMutation.isPending || !sendAmount || !recipientAddress}
                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold"
                data-testid="button-confirm-send"
              >
                {sendTokenMutation.isPending ? (
                  <span className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Sending...</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-2">
                    <Send className="h-4 w-4" />
                    <span>Send {selectedCurrency}</span>
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowSendModal(false);
                  setSendAmount("");
                  setRecipientAddress("");
                }}
                disabled={sendTokenMutation.isPending}
                className="flex-1 border-gray-300 dark:border-gray-600"
                data-testid="button-cancel-send"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <PWAInstallPrompt />
    </div>
  );
}