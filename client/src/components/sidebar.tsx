import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { User, Conversation, Message } from "@shared/schema";
import { Search, Wallet, UserPlus, Settings, Eye, EyeOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import coynLogoPath from "@assets/COYN-symbol-square_1750892698348.png";
import AddContactModal from "./add-contact-modal";
import SettingsModal from "./settings-modal";

interface SidebarProps {
  user?: User;
  conversations: (Conversation & { otherUser: User; lastMessage?: Message })[];
  selectedConversation: number | null;
  onSelectConversation: (id: number) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenWallet: () => void;
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
                <h1 className="text-xl font-bold text-foreground">COYN</h1>
                <p className="text-xs text-muted-foreground">Messenger</p>
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

        {/* Wallet Quick View - Mobile Optimized */}
        <div 
          className="p-2 sm:p-3 bg-white dark:bg-gradient-to-br dark:from-card dark:to-muted mx-2 sm:mx-3 mb-1 sm:mb-2 rounded-lg border border-gray-200 dark:border-border cursor-pointer hover:border-gray-300 dark:hover:border-primary transition-all duration-200 shadow-sm"
          onClick={onOpenWallet}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600 dark:text-muted-foreground font-medium">Balance</span>
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
          <div className="text-base sm:text-lg font-bold text-black dark:text-primary mb-1.5">
            {isBalanceVisible ? "$12,220.75" : "••••••"}
          </div>
        </div>

        {/* Search - Mobile Optimized */}
        <div className="px-3 sm:px-4 pb-3 sm:pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 sm:h-4 sm:w-4" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-12 bg-white dark:bg-input border-gray-300 dark:border-border focus:border-primary focus:ring-1 focus:ring-primary/20 text-black dark:text-foreground placeholder-gray-500 dark:placeholder-muted-foreground rounded-lg h-12 sm:h-10 text-base sm:text-sm touch-manipulation"
            />
          </div>
        </div>

        {/* Chat List - Mobile Optimized */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conversation) => (
            <div key={conversation.id} className="px-2 sm:px-3 pb-1 sm:pb-2">
              <div
                className={`rounded-lg p-4 sm:p-3 cursor-pointer transition-colors border touch-manipulation min-h-[68px] sm:min-h-[60px] ${
                  selectedConversation === conversation.id
                    ? 'bg-gray-100 dark:chat-item-active border-gray-300 dark:border-cyan-500'
                    : 'bg-white dark:bg-slate-700/50 hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-slate-600 dark:active:bg-slate-500 border-gray-200 dark:border-transparent hover:border-gray-300 dark:hover:border-slate-500'
                }`}
                onClick={() => {
                  onSelectConversation(conversation.id);
                  onClose();
                }}
              >
                <div className="flex items-center space-x-3 sm:space-x-2">
                  <div className="relative">
                    <Avatar className="h-12 w-12 sm:h-10 sm:w-10">
                      <AvatarImage src={conversation.otherUser.profilePicture || ""} />
                      <AvatarFallback className="text-sm sm:text-xs bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-slate-300">
                        {conversation.otherUser.displayName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {conversation.otherUser.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-2.5 sm:h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-slate-800" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-base sm:text-sm truncate text-black dark:text-foreground">
                        {conversation.otherUser.displayName}
                      </h3>
                      <span className="text-sm sm:text-xs text-slate-400">
                        {conversation.lastMessage && formatTimestamp(conversation.lastMessage.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm sm:text-xs text-slate-400 truncate mt-1 sm:mt-0">
                      {formatLastMessage(conversation.lastMessage)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Settings - only visible on mobile */}
        <div className="lg:hidden p-4 border-t border-border bg-white dark:bg-card">
          <div className="flex gap-2">
            <Button 
              onClick={onOpenWallet}
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
