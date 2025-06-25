import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User, Conversation, Message } from "@shared/schema";
import { Search, UserPlus, Settings, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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

  const formatTimestamp = (date: Date | string) => {
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return "";
      }
      return formatDistanceToNow(dateObj, { addSuffix: false });
    } catch {
      return "";
    }
  };

  const filteredConversations = conversations.filter(conversation =>
    conversation.otherUser.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conversation.otherUser.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`fixed lg:relative inset-y-0 left-0 z-40 w-80 bg-white dark:bg-card border-r border-border transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Header */}
        <div className="p-4 border-b border-border bg-white dark:bg-card">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-black dark:text-foreground" style={{ fontFamily: 'Google Product Sans, sans-serif' }}>
              Messenger
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="lg:hidden text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-3">
            <Button 
              onClick={onOpenWallet}
              size="sm"
              className="flex-1 bg-black dark:bg-primary text-white dark:text-primary-foreground hover:bg-gray-800 dark:hover:bg-primary/90"
            >
              Send
            </Button>
            <Button 
              variant="outline"
              size="sm"
              className="flex-1 border-gray-300 dark:border-border text-gray-700 dark:text-muted-foreground hover:bg-gray-100 dark:hover:bg-secondary"
            >
              Request
            </Button>
          </div>

          {/* Search and Add Contact */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder=""
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="pl-10 bg-white dark:bg-input border-gray-300 dark:border-border focus:border-primary focus:ring-1 focus:ring-primary/20 text-black dark:text-foreground placeholder-gray-500 dark:placeholder-muted-foreground rounded-lg h-9"
              />
            </div>
            <Button
              onClick={() => setIsAddContactOpen(true)}
              variant="outline"
              size="sm"
              className="h-9 px-3 border-gray-300 dark:border-border text-gray-700 dark:text-muted-foreground hover:bg-gray-100 dark:hover:bg-secondary shrink-0"
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 px-4 text-muted-foreground">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs opacity-75">Add a contact to start chatting</p>
            </div>
          ) : (
            filteredConversations.map((conversation, index) => (
              <div key={conversation.id} className="px-4 pb-2">
                <div
                  className={`rounded-lg p-3 cursor-pointer transition-colors border ${
                    selectedConversation === conversation.id
                      ? 'bg-gray-100 dark:bg-primary/10 border-gray-300 dark:border-primary'
                      : 'bg-white dark:bg-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-600 border-gray-200 dark:border-transparent hover:border-gray-300 dark:hover:border-slate-500'
                  }`}
                  onClick={() => {
                    onSelectConversation(conversation.id);
                    onClose();
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={conversation.otherUser.profilePicture || ""} />
                        <AvatarFallback>
                          {conversation.otherUser.displayName?.charAt(0) || conversation.otherUser.username.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {conversation.otherUser.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-card" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm truncate text-black dark:text-foreground">
                          {conversation.otherUser.displayName || conversation.otherUser.username}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {conversation.lastMessage && formatTimestamp(conversation.lastMessage.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {formatLastMessage(conversation.lastMessage)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer - Settings Button */}
        <div className="p-4 border-t border-border bg-white dark:bg-card">
          <Button
            variant="ghost"
            onClick={() => setIsSettingsOpen(true)}
            className="w-full text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-secondary"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
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
