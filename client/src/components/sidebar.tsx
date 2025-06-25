import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { User, Conversation, Message } from "@shared/schema";
import { Search, Wallet, UserPlus, Settings } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import coynLogoPath from "@assets/COYN-symbol-square_1750808237977.png";
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
              className="text-muted-foreground hover:text-primary"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          {user && (
            <div className="mt-4 text-xs text-primary font-mono">
              {user.walletAddress}
            </div>
          )}
        </div>

        {/* Compact Wallet */}
        <div 
          className="mx-3 mb-2 p-2 bg-white dark:bg-card/50 rounded-lg border border-gray-200 dark:border-border/50 cursor-pointer hover:bg-gray-50 dark:hover:bg-card/70 transition-colors"
          onClick={onOpenWallet}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-xs text-gray-500 dark:text-muted-foreground">Balance</div>
              <div className="text-sm font-semibold text-black dark:text-primary">$12,220.75</div>
            </div>
            <Wallet className="h-4 w-4 text-gray-600 dark:text-muted-foreground" />
          </div>
        </div>

        {/* Search and Add Contact */}
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-10 bg-white dark:bg-input border-gray-300 dark:border-border focus:border-primary focus:ring-1 focus:ring-primary/20 text-black dark:text-foreground placeholder-gray-500 dark:placeholder-muted-foreground rounded-lg"
            />
          </div>

        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto px-3">
          <div className="space-y-0.5">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-2 rounded-lg cursor-pointer transition-colors border ${
                  selectedConversation === conversation.id
                    ? 'bg-gray-100 dark:bg-primary/10 border-gray-300 dark:border-primary/30'
                    : 'bg-white dark:bg-card/30 hover:bg-gray-50 dark:hover:bg-card/50 border-transparent hover:border-gray-200 dark:hover:border-border/50'
                }`}
                onClick={() => {
                  onSelectConversation(conversation.id);
                  onClose();
                }}
              >
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={conversation.otherUser.profilePicture || ""} />
                      <AvatarFallback className="text-xs font-medium">
                        {conversation.otherUser.displayName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {conversation.otherUser.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-white dark:border-slate-800" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-xs truncate text-black dark:text-foreground">
                        {conversation.otherUser.displayName}
                      </h3>
                      <span className="text-xs text-gray-400 dark:text-muted-foreground shrink-0 ml-1">
                        {conversation.lastMessage && formatTimestamp(conversation.lastMessage.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-muted-foreground truncate">
                      {formatLastMessage(conversation.lastMessage)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Compact Footer */}
        <div className="p-2 mx-3 border-t border-gray-200 dark:border-border/50">
          <div className="flex gap-1">
            <Button 
              onClick={onOpenWallet}
              size="sm"
              className="flex-1 h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Wallet className="h-3 w-3 mr-1" />
              Wallet
            </Button>
            <Button
              onClick={() => setIsSettingsOpen(true)}
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs border-gray-300 dark:border-border text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-3 w-3" />
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
