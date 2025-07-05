import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
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

  // Get current conversation data
  const currentConversation = conversations.find((conv) => conv.id === selectedConversation);



  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Panel 1: Navigation Sidebar (64px) */}
      <div className="w-16 bg-slate-200 dark:bg-slate-800 border-r border-gray-300 dark:border-gray-700 flex flex-col items-center py-4 space-y-4">
        {/* Profile Avatar */}
        <div className="relative">
          <Avatar className="w-10 h-10 cursor-pointer hover:opacity-80 transition-opacity">
            <AvatarImage 
              src={user?.profilePicture || undefined} 
              alt={user?.displayName || "User"}
            />
            <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-xs">
              <UserAvatarIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </AvatarFallback>
          </Avatar>
          {user?.isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
          )}
        </div>

        {/* Navigation Icons */}
        <div className="flex flex-col space-y-3">
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700"
            title="Chats"
          >
            <MessageCircle className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700"
            title="Calls"
            onClick={() => setIsVoiceCallOpen(true)}
          >
            <Phone className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700"
            title="Wallet"
            onClick={() => setIsWalletSidebarOpen(true)}
          >
            <Wallet className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700"
            title="Settings"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </Button>
        </div>

        {/* Bottom spacer */}
        <div className="flex-1"></div>

        {/* Menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="w-10 h-10 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700"
          onClick={() => setIsMenuOpen(true)}
        >
          <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </Button>
      </div>

      {/* Panel 2: Chat List (400px) */}
      <div className="w-96 bg-white dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700">
        <div className="flex flex-col h-full">
          {/* Chat List Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Chats</h1>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                  title="New Group"
                  onClick={() => setIsGroupModalOpen(true)}
                >
                  <Users className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </Button>

              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search or start new chat"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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

            {/* Filter Tabs */}
            <div className="flex mt-3 space-x-1">
              <Button
                variant="ghost"
                size="sm"
                className="px-3 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400"
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="px-3 py-1 text-xs rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              >
                Unread
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="px-3 py-1 text-xs rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              >
                Groups
              </Button>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-auto">
            {/* Existing Conversations */}
            {filteredConversations.length > 0 && (
              <div>
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation.id)}
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedConversation === conversation.id 
                        ? 'bg-green-100 dark:bg-green-900/20 border-r-4 border-green-500' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          {conversation.isGroup ? (
                            <AvatarFallback className="bg-gradient-to-br from-green-500 to-green-600 text-white">
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
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">
                            {conversation.isGroup ? conversation.groupName : conversation.otherUser?.displayName}
                          </h3>
                          {conversation.lastMessage && conversation.lastMessage.timestamp && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(conversation.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
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
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <div className="mx-auto mb-4">
                    <img 
                      src={coynLogoPath} 
                      alt="Coynful Logo" 
                      className="w-16 h-16 mx-auto drop-shadow-[0_0_20px_rgba(255,193,7,0.4)]"
                    />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">No Conversations</h2>
                  <p>Start messaging to see your conversations here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel 3: Chat Window (Flexible) */}
      <div className="flex-1 flex flex-col bg-green-50 dark:bg-gray-900">
        {selectedConversation && currentConversation ? (
          <ChatWindow
            conversation={currentConversation}
            onToggleSidebar={() => setIsWalletSidebarOpen(true)}
            onBack={() => setSelectedConversation(null)}
            searchQuery={searchQuery}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="mx-auto mb-6">
                <img 
                  src={coynLogoPath} 
                  alt="Coynful Logo" 
                  className="w-24 h-24 mx-auto drop-shadow-[0_0_20px_rgba(255,193,7,0.4)]"
                />
              </div>
              <h2 className="text-2xl font-semibold mb-2 text-gray-700 dark:text-gray-300">Welcome to Coynful</h2>
              <p className="text-gray-500 dark:text-gray-400">Select a conversation to start messaging</p>
            </div>
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