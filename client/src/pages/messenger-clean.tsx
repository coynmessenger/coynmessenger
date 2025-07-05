import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import Sidebar from "@/components/sidebar";
import ChatWindow from "@/components/chat-window";
import WalletModal from "@/components/wallet-modal";
import WalletSidebar from "@/components/wallet-sidebar";
import VideoCallModal from "@/components/video-call-modal";
import VoiceCallModal from "@/components/voice-call-modal";
import SettingsModal from "@/components/settings-modal";
import HamburgerMenu from "@/components/hamburger-menu";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import coynLogoPath from "@assets/COYN-symbol-square_1751239261149.png";
import type { User, Conversation, Message } from "@shared/schema";

export default function MessengerPage() {
  useScrollToTop();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isWalletSidebarOpen, setIsWalletSidebarOpen] = useState(false);
  const [selectedWalletCurrency, setSelectedWalletCurrency] = useState<string | undefined>();
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [isVoiceCallOpen, setIsVoiceCallOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Get connected user from localStorage
  const connectedUserId = parseInt(localStorage.getItem('connectedUserId') || '0');

  // Fetch current user
  const { data: user } = useQuery<User>({
    queryKey: ['/api/user', connectedUserId],
    queryFn: () => apiRequest("GET", `/api/user?userId=${connectedUserId}`).then(res => res.json()),
    enabled: !!connectedUserId,
  });

  // Fetch conversations
  const { data: conversations = [] } = useQuery<(Conversation & { otherUser: User; lastMessage?: Message })[]>({
    queryKey: ['/api/conversations'],
    queryFn: () => apiRequest("GET", "/api/conversations").then(res => res.json()),
    enabled: !!connectedUserId,
  });

  // Filter conversations based on search
  const filteredConversations = conversations.filter((conversation) => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    const displayName = conversation.isGroup 
      ? conversation.groupName?.toLowerCase() 
      : conversation.otherUser?.displayName?.toLowerCase();
    
    return displayName?.includes(searchLower) ||
      (conversation.lastMessage?.content?.toLowerCase().includes(searchLower) ?? false);
  }).sort((a, b) => {
    // Sort conversations to prioritize user's own conversation at the top
    const isUserConversationA = a.otherUser?.id === connectedUserId;
    const isUserConversationB = b.otherUser?.id === connectedUserId;
    
    if (isUserConversationA && !isUserConversationB) {
      return -1; // User's conversation comes first
    }
    if (!isUserConversationA && isUserConversationB) {
      return 1; // Other user's conversation comes after
    }
    
    return 0;
  });

  // Handler for opening wallet with optional pre-selected currency
  const handleOpenWallet = (currency?: string) => {
    setSelectedWalletCurrency(currency);
    setIsWalletOpen(true);
  };

  // Handler for closing wallet and resetting selected currency
  const handleCloseWallet = () => {
    setIsWalletOpen(false);
    setSelectedWalletCurrency(undefined);
  };

  const currentConversation = conversations.find(c => c.id === selectedConversation);

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Desktop Layout - Clean and Simple */}
      <div className="hidden lg:flex lg:w-full lg:h-screen">
        {/* Desktop Sidebar */}
        {user && (
          <Sidebar
            user={user}
            conversations={searchQuery ? filteredConversations : conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={setSelectedConversation}
            isOpen={false}
            onClose={() => {}}
            onOpenWallet={handleOpenWallet}
            onOpenWalletSidebar={() => setIsWalletSidebarOpen(true)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}

        {/* Desktop Chat Area */}
        <div className="flex-1 flex flex-col bg-background">
          {selectedConversation && currentConversation ? (
            <ChatWindow
              conversation={currentConversation}
              onToggleSidebar={() => {}}
              onBack={() => setSelectedConversation(null)}
              searchQuery={searchQuery}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-background">
              <div className="text-center text-muted-foreground max-w-md">
                <div className="mx-auto mb-6">
                  <img 
                    src={coynLogoPath} 
                    alt="Coynful Logo" 
                    className="w-20 h-20 mx-auto drop-shadow-[0_0_20px_rgba(255,193,7,0.4)]"
                  />
                </div>
                <h2 className="text-2xl font-semibold mb-3 text-foreground">Welcome to Coynful</h2>
                <p className="text-lg mb-2">Select a conversation to start messaging</p>
                <p className="text-sm">Your conversations appear in the sidebar</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden flex flex-col w-full h-screen">
        {/* Mobile Navigation */}
        <nav className="bg-white dark:bg-white backdrop-blur-sm border-b border-gray-200 dark:border-gray-200 z-50">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setLocation("/")}
                variant="ghost"
                size="sm"
                className="text-slate-700 dark:text-slate-700 hover:text-orange-500 hover:bg-gray-100 dark:hover:bg-gray-100 p-2"
                title="Home"
              >
                <Home className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-normal text-black dark:text-black" style={{ fontFamily: 'Google Product Sans, sans-serif', letterSpacing: '-0.025em' }}>
                Coynful
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                className="text-slate-700 dark:text-slate-700 hover:text-orange-500 transition-colors p-2"
                onClick={() => {
                  setIsSearchOpen(!isSearchOpen);
                  if (isSearchOpen) {
                    setSearchQuery("");
                  }
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button
                onClick={() => setIsWalletSidebarOpen(true)}
                className="hover:opacity-80 transition-opacity"
                title="Open Coynful Wallet"
              >
                <img 
                  src={coynLogoPath} 
                  alt="Coynful Logo" 
                  className="w-8 h-8 drop-shadow-[0_0_12px_rgba(255,193,7,0.4)] cursor-pointer"
                />
              </button>
              <HamburgerMenu onOpenSettings={() => setIsSettingsOpen(true)} />
            </div>
          </div>
        </nav>

        {/* Mobile Search Bar */}
        {isSearchOpen && (
          <div className="bg-white dark:bg-white border-b border-gray-200 dark:border-gray-200 p-4 z-40">
            <div className="relative">
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-50 border border-gray-300 dark:border-gray-300 rounded-lg px-4 py-2 text-black dark:text-black placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:border-orange-500 dark:focus:border-orange-500"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mobile Content */}
        <div className="flex-1 overflow-hidden">
          {selectedConversation && currentConversation ? (
            <ChatWindow
              conversation={currentConversation}
              onToggleSidebar={() => setIsSidebarOpen(true)}
              onBack={() => setSelectedConversation(null)}
              searchQuery={searchQuery}
            />
          ) : (
            <div className="h-full overflow-auto">
              {user && (
                <Sidebar
                  user={user}
                  conversations={searchQuery ? filteredConversations : conversations}
                  selectedConversation={selectedConversation}
                  onSelectConversation={setSelectedConversation}
                  isOpen={isSidebarOpen}
                  onClose={() => setIsSidebarOpen(false)}
                  onOpenWallet={handleOpenWallet}
                  onOpenWalletSidebar={() => setIsWalletSidebarOpen(true)}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <WalletModal 
        isOpen={isWalletOpen} 
        onClose={handleCloseWallet} 
        initialCurrency={selectedWalletCurrency}
      />

      <VideoCallModal
        isOpen={isVideoCallOpen}
        onClose={() => setIsVideoCallOpen(false)}
        user={currentConversation?.otherUser}
      />

      <VoiceCallModal
        isOpen={isVoiceCallOpen}
        onClose={() => setIsVoiceCallOpen(false)}
        user={currentConversation?.otherUser}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Wallet Sidebar */}
      <WalletSidebar
        isOpen={isWalletSidebarOpen}
        onClose={() => setIsWalletSidebarOpen(false)}
        user={user}
      />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}