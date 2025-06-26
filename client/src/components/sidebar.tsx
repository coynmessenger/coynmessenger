import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { User, Conversation, Message, WalletBalance } from "@shared/schema";
import { Search, Wallet, UserPlus, Settings, Eye, EyeOff, TrendingUp, TrendingDown, User as UserIcon } from "lucide-react";
import { SiBinance, SiBitcoin } from "react-icons/si";
import { formatDistanceToNow } from "date-fns";
import coynLogoPath from "@assets/COYN-symbol-square_1750892698348.png";
import AddContactModal from "./add-contact-modal";
import SettingsModal from "./settings-modal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface SidebarProps {
  user?: User;
  conversations: (Conversation & { otherUser: User; lastMessage?: Message })[];
  selectedConversation: number | null;
  onSelectConversation: (id: number) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenWallet: (currency?: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function Sidebar({
  user,
  conversations,
  selectedConversation,
  onSelectConversation,
  isOpen,
  onClose,
  onOpenWallet,
  searchQuery = "",
  onSearchChange,
}: SidebarProps) {
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  
  const queryClient = useQueryClient();

  // Fetch all users for contact list
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Fetch wallet balances
  const { data: walletBalances = [] } = useQuery<WalletBalance[]>({
    queryKey: ["/api/wallet/balances"],
  });

  // Calculate total balance
  const totalBalance = walletBalances.reduce((sum, balance) => {
    return sum + parseFloat(balance.usdValue || "0");
  }, 0);

  // Currency icons and helper functions
  const currencyIcons: { [key: string]: { color: string; symbol: string; isCoyn?: boolean } } = {
    BTC: { color: "bg-orange-500", symbol: "₿" },
    BNB: { color: "bg-yellow-500", symbol: "⬢" },
    USDT: { color: "bg-green-500", symbol: "₮" },
    COYN: { color: "bg-gradient-to-br from-cyan-400 to-blue-500", symbol: "C", isCoyn: true },
  };

  const renderCurrencyIcon = (currency: string, size: "sm" | "md" | "lg" = "md") => {
    const sizeClasses = {
      sm: "w-4 h-4",
      md: "w-5 h-5", 
      lg: "w-6 h-6"
    };

    const config = currencyIcons[currency];
    if (!config) {
      return <div className={`${sizeClasses[size]} ${currencyIcons.BTC.color} rounded-full flex items-center justify-center text-white text-xs font-bold`}>?</div>;
    }

    if (config.isCoyn) {
      return (
        <img 
          src={coynLogoPath} 
          alt={currency} 
          className={`${sizeClasses[size]} drop-shadow-[0_0_8px_rgba(255,193,7,0.3)]`}
        />
      );
    }

    if (currency === "BTC") {
      return <SiBitcoin className={`${sizeClasses[size]} text-orange-500`} />;
    }

    if (currency === "BNB") {
      return <SiBinance className={`${sizeClasses[size]} text-yellow-500`} />;
    }

    return (
      <div className={`${sizeClasses[size]} ${config.color} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
        {config.symbol}
      </div>
    );
  };

  const formatBalance = (balance: string, currency: string) => {
    const num = parseFloat(balance);
    if (currency === "USDT") return num.toFixed(2);
    if (currency === "BTC") return num.toFixed(8);
    if (currency === "ETH") return num.toFixed(6);
    return num.toFixed(3);
  };

  const formatUSD = (value: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(value));
  };

  // Get available contacts (users not in current conversations and not current user)
  const availableContacts = allUsers.filter(contact => {
    if (!user || contact.id === user.id) return false;
    const hasConversation = conversations.some(conv => 
      conv.otherUser.id === contact.id
    );
    return !hasConversation;
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (otherUserId: number) => {
      const response = await apiRequest("POST", "/api/conversations", {
        otherUserId,
      });
      return response.json();
    },
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      onSelectConversation(newConversation.id);
      onClose();
    },
  });
  const formatLastMessage = (message?: Message) => {
    if (!message) return "";
    
    if (message.messageType === "crypto") {
      return `${message.cryptoAmount} ${message.cryptoCurrency} sent`;
    }
    
    return message.content || "";
  };

  const formatTimestamp = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: false });
  };

  return (
    <>
      <div className={`fixed lg:relative inset-y-0 left-0 w-80 bg-card border-r border-border transform transition-transform duration-300 ease-in-out z-40 pt-16 lg:pt-0 flex flex-col ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Logo Header */}
        <div className="p-6 border-b border-border hidden lg:block bg-white dark:bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src={coynLogoPath} 
                alt="COYN Logo" 
                className="w-10 h-10 drop-shadow-[0_0_15px_rgba(255,193,7,0.4)]"
              />
              <div>
                <h1 className="text-xl font-bold text-foreground">COYN Messenger</h1>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
              className="text-muted-foreground hover:text-primary h-10 w-10 sm:h-8 sm:w-8 touch-manipulation"
            >
              <Settings className="h-5 w-5 sm:h-4 sm:w-4" />
            </Button>
          </div>
          {user && (
            <div className="mt-4 text-xs text-primary font-mono">
              {user.walletAddress}
            </div>
          )}
        </div>

        {/* Enhanced Wallet Overview - Mobile Optimized */}
        <div className="mx-2 sm:mx-3 mb-2">
          {/* Total Balance Header */}
          <div 
            className="p-3 bg-white dark:bg-gradient-to-br dark:from-card dark:to-muted rounded-lg border border-gray-200 dark:border-border cursor-pointer hover:border-gray-300 dark:hover:border-primary transition-all duration-200 shadow-sm mb-2"
            onClick={() => onOpenWallet()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600 dark:text-muted-foreground font-medium">Total Balance</span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsBalanceVisible(!isBalanceVisible);
                  }}
                  className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-slate-600"
                >
                  {isBalanceVisible ? (
                    <Eye className="h-3 w-3 text-gray-600 dark:text-muted-foreground" />
                  ) : (
                    <EyeOff className="h-3 w-3 text-gray-600 dark:text-muted-foreground" />
                  )}
                </Button>
                <Wallet className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-700 dark:text-primary" />
              </div>
            </div>
            <div className="text-lg font-bold text-black dark:text-primary">
              {isBalanceVisible ? formatUSD(totalBalance.toString()) : "••••••"}
            </div>
          </div>

          {/* Asset Breakdown */}
          <div className="space-y-1">
            {walletBalances.map((balance) => {
              const changePercent = parseFloat(balance.changePercent || "0");
              const isPositive = changePercent >= 0;
              const portfolioPercent = totalBalance > 0 ? (parseFloat(balance.usdValue || "0") / totalBalance * 100) : 0;
              
              return (
                <Card key={balance.id} className="bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors cursor-pointer" onClick={() => onOpenWallet(balance.currency)}>
                  <CardContent className="p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 flex items-center justify-center">
                          {renderCurrencyIcon(balance.currency, "sm")}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-black dark:text-white">
                            {balance.currency}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">
                            {isBalanceVisible ? `${formatBalance(balance.balance, balance.currency)}` : "••••"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium text-black dark:text-white">
                          {isBalanceVisible ? formatUSD(balance.usdValue || "0") : "••••••"}
                        </div>
                        <div className={`text-xs flex items-center justify-end ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                          {isPositive ? (
                            <TrendingUp className="h-2 w-2 mr-1" />
                          ) : (
                            <TrendingDown className="h-2 w-2 mr-1" />
                          )}
                          {Math.abs(changePercent).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

          </div>
        </div>



        {/* Contact List and Chat List - Mobile Optimized */}
        <div className="flex-1 overflow-y-auto">
          {/* Available Contacts - Primary Display */}
          {availableContacts.length > 0 && (
            <div className="mb-2">
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground bg-muted/30">
                Start New Conversation
              </div>
              {availableContacts.map((contact) => (
                <div key={`contact-${contact.id}`} className="px-1 sm:px-4 pb-0.5 sm:pb-2">
                  <div
                    className="rounded-lg sm:rounded-xl p-2 sm:p-4 cursor-pointer transition-colors border bg-white dark:bg-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-600 border-gray-200 dark:border-transparent hover:border-gray-300 dark:hover:border-slate-500"
                    onClick={() => createConversationMutation.mutate(contact.id)}
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="relative">
                        <Avatar className="h-8 w-8 sm:h-12 sm:w-12">
                          <AvatarImage src={contact.profilePicture || undefined} />
                          <AvatarFallback className="bg-gray-200 dark:bg-gray-700">
                            <UserIcon className="w-4 h-4 sm:w-6 sm:h-6 text-gray-500 dark:text-gray-400" />
                          </AvatarFallback>
                        </Avatar>
                        {contact.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-black dark:text-white text-sm sm:text-base truncate">
                            {contact.displayName}
                          </h3>
                          {createConversationMutation.isPending && (
                            <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                          @{contact.username}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}


        </div>

        {/* Mobile Settings - only visible on mobile */}
        <div className="lg:hidden p-4 border-t border-border bg-white dark:bg-card">
          <div className="flex gap-2">
            <Button 
              onClick={() => onOpenWallet()}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              <Wallet className="h-4 w-4 mr-2" />
              Wallet
            </Button>
            <Button
              onClick={() => setIsAddContactOpen(true)}
              variant="outline"
              size="icon"
              className="text-muted-foreground hover:text-primary border-border hover:border-primary"
              title="Add Contact"
            >
              <UserPlus className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
              className="text-muted-foreground hover:text-primary border-border hover:border-primary"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

      </div>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Modals */}
      <AddContactModal
        isOpen={isAddContactOpen}
        onClose={() => setIsAddContactOpen(false)}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
