import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ChatWindow from "@/components/chat-window";
import WalletSidebar from "@/components/wallet-sidebar";
import VideoCallModal from "@/components/video-call-modal";
import VoiceCallModal from "@/components/voice-call-modal";
import SettingsModal from "@/components/settings-modal";
import HamburgerMenu from "@/components/hamburger-menu";
import type { User, Conversation, Message } from "@shared/schema";
import { 
  MessageCircle, 
  Phone, 
  Wallet, 
  MoreVertical, 
  Search, 
  X, 
  MessageSquarePlus, 
  Settings, 
  Users,
  Home
} from "lucide-react";
import { UserAvatarIcon } from "@/components/ui/user-avatar-icon";
import coynLogoPath from "@assets/COYN-symbol-square_1750808237977.png";

export default function MessengerWhatsApp() {
  useScrollToTop();
  
  // State management
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [isWalletSidebarOpen, setIsWalletSidebarOpen] = useState(false);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [isVoiceCallOpen, setIsVoiceCallOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [, setLocation] = useLocation();

  // Get connected user ID from localStorage
  const getConnectedUserId = () => {
    const storedUser = localStorage.getItem('connectedUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        return parsedUser.id;
      } catch (e) {
        console.error('Failed to parse stored user:', e);
      }
    }
    return 26; // Fallback to COYNBIT user
  };

  const connectedUserId = getConnectedUserId();

  // Fetch current user data
  const { data: user } = useQuery<User>({
    queryKey: ["/api/user", connectedUserId],
    queryFn: async () => {
      const response = await fetch(`/api/user?userId=${connectedUserId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      return response.json();
    },
  });

  // Fetch conversations
  const { data: conversations = [] } = useQuery<(Conversation & { otherUser: User; lastMessage?: Message })[]>({
    queryKey: ["/api/conversations", connectedUserId],
    queryFn: async () => {
      const response = await fetch(`/api/conversations?userId=${connectedUserId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      return response.json();
    },
    enabled: !!connectedUserId,
  });

  // Fetch all users for contact discovery
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Filter conversations based on search
  const filteredConversations = conversations.filter((conversation) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      conversation.otherUser?.displayName?.toLowerCase().includes(searchLower) ||
      conversation.groupName?.toLowerCase().includes(searchLower) ||
      conversation.lastMessage?.content?.toLowerCase().includes(searchLower)
    );
  });

  // Remove duplicate conversations and sort
  const uniqueConversations = conversations.filter((conv, index, self) => {
    return index === self.findIndex((c) => 
      (c.participant1Id === conv.participant1Id && c.participant2Id === conv.participant2Id) ||
      (c.participant1Id === conv.participant2Id && c.participant2Id === conv.participant1Id)
    );
  });

  // Get current conversation data
  const currentConversation = conversations.find((conv) => conv.id === selectedConversation);

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (contactId: number) => {
      return apiRequest("POST", "/api/conversations", {
        participant1Id: connectedUserId,
        participant2Id: contactId,
      });
    },
    onSuccess: (data: Conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversation(data.id);
    },
  });

  const handleContactClick = (contact: User) => {
    createConversationMutation.mutate(contact.id);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Mobile Navigation Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src={coynLogoPath} 
              alt="Coynful Logo" 
              className="w-8 h-8 drop-shadow-[0_0_15px_rgba(255,193,7,0.3)]"
            />
            <h1 className="text-xl font-semibold text-foreground font-['Google_Product_Sans']">
              Messenger
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 hover:bg-accent rounded-full"
              onClick={() => setSearchQuery(searchQuery ? "" : " ")}
              title="Search"
            >
              <Search className="w-5 h-5 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 hover:bg-accent rounded-full"
              onClick={() => setIsWalletSidebarOpen(true)}
              title="Wallet"
            >
              <Wallet className="w-5 h-5 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 hover:bg-accent rounded-full"
              onClick={() => setIsMenuOpen(true)}
              title="Menu"
            >
              <MoreVertical className="w-5 h-5 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 hover:bg-accent rounded-full"
              onClick={() => setLocation('/')}
              title="Home"
            >
              <Home className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>

      {/* Search Bar (conditionally shown) */}
      {searchQuery && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search messages"
              value={searchQuery === " " ? "" : searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {selectedConversation && currentConversation ? (
          <ChatWindow
            conversation={currentConversation}
            onToggleSidebar={() => setIsWalletSidebarOpen(true)}
            onBack={() => setSelectedConversation(null)}
            searchQuery={searchQuery === " " ? "" : searchQuery}
          />
        ) : (
          <div className="h-full overflow-auto">
            {/* Existing Conversations */}
            {filteredConversations.length > 0 && (
              <div className="divide-y divide-border">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation.id)}
                    className="p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          {conversation.isGroup ? (
                            <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                              <Users className="w-6 h-6" />
                            </AvatarFallback>
                          ) : (
                            <>
                              <AvatarImage 
                                src={conversation.otherUser?.profilePicture || undefined} 
                                alt={conversation.otherUser?.displayName || "User"}
                              />
                              <AvatarFallback className="bg-gray-200 dark:bg-gray-700">
                                <UserAvatarIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                              </AvatarFallback>
                            </>
                          )}
                        </Avatar>
                        {!conversation.isGroup && conversation.otherUser?.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-foreground truncate">
                            {conversation.isGroup ? conversation.groupName : conversation.otherUser?.displayName}
                          </h3>
                          {conversation.lastMessage && conversation.lastMessage.timestamp && (
                            <span className="text-xs text-muted-foreground">
                              {(() => {
                                try {
                                  const date = new Date(conversation.lastMessage.timestamp);
                                  if (isNaN(date.getTime())) {
                                    return "";
                                  }
                                  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                } catch (e) {
                                  return "";
                                }
                              })()}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.lastMessage?.content || "No messages yet"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {filteredConversations.length === 0 && (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center text-muted-foreground">
                  <div className="mx-auto mb-4">
                    <img 
                      src={coynLogoPath} 
                      alt="Coynful Logo" 
                      className="w-16 h-16 mx-auto drop-shadow-[0_0_20px_rgba(255,193,7,0.4)]"
                    />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Ready to Chat!</h2>
                  <p>Your conversations will appear here</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <WalletSidebar
        isOpen={isWalletSidebarOpen}
        onClose={() => setIsWalletSidebarOpen(false)}
        user={user}
      />

      <VideoCallModal
        isOpen={isVideoCallOpen}
        onClose={() => setIsVideoCallOpen(false)}
      />

      <VoiceCallModal
        isOpen={isVoiceCallOpen}
        onClose={() => setIsVoiceCallOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {isMenuOpen && (
        <HamburgerMenu onOpenSettings={() => setIsSettingsOpen(true)} />
      )}
    </div>
  );
}