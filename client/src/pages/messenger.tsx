import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Home, Users } from "lucide-react";
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
import { UserAvatarIcon } from "@/components/ui/user-avatar-icon";
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

  // Fetch all users for contact list
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: () => apiRequest("GET", "/api/users").then(res => res.json()),
  });

  // Create contact list with current user at top
  const getContactList = () => {
    if (!user) return [];
    
    // Always start with current user at the top
    const contactList = [user];
    
    // Add other users who are setup (excluding current user) if any exist
    if (allUsers.length > 0) {
      const otherUsers = allUsers.filter(u => u.id !== user.id && u.isSetup);
      contactList.push(...otherUsers);
    }
    
    return contactList;
  };

  const contactList = getContactList();

  // Filter contact list based on search
  const filteredContactList = contactList.filter((contact) => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    const displayName = contact.displayName?.toLowerCase();
    const username = contact.username?.toLowerCase();
    
    return displayName?.includes(searchLower) || username?.includes(searchLower);
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

  // Handler for contact click (starts new conversation)
  const handleContactClick = async (contact: User) => {
    if (!user?.id) return;

    // Check if conversation already exists
    const existingConversation = conversations.find(conv => 
      conv.otherUser?.id === contact.id
    );

    if (existingConversation) {
      setSelectedConversation(existingConversation.id);
      return;
    }

    // Create new conversation
    createConversationMutation.mutate(contact.id);
  };

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
      setSelectedConversation(newConversation.id);
    },
  });

  const currentConversation = conversations.find(c => c.id === selectedConversation);

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Desktop Layout */}
      <div className="hidden lg:flex lg:w-full lg:h-screen">
        {/* Desktop Sidebar - Only shows wallet and conversations */}
        {user && (
          <Sidebar
            user={user}
            conversations={conversations}
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

        {/* Desktop Main Area */}
        <div className="flex-1 flex flex-col bg-background">
          {selectedConversation && currentConversation ? (
            <ChatWindow
              conversation={currentConversation}
              onToggleSidebar={() => {}}
              onBack={() => setSelectedConversation(null)}
              searchQuery={searchQuery}
            />
          ) : (
            <div className="flex-1 overflow-auto">
              {/* Contact List in Main Area */}
              <div className="p-6">
                <div className="mb-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <img 
                      src={coynLogoPath} 
                      alt="Coynful Logo" 
                      className="w-8 h-8 drop-shadow-[0_0_12px_rgba(255,193,7,0.4)]"
                    />
                    <h1 className="text-2xl font-semibold text-foreground">Contacts</h1>
                  </div>
                  <p className="text-muted-foreground">Start a conversation with someone from your contact list</p>
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search contacts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-orange-500 dark:focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Contact List */}
                <div className="grid gap-3">
                  {filteredContactList.map((contact) => (
                    <div
                      key={contact.id}
                      onClick={() => handleContactClick(contact)}
                      className="flex items-center space-x-4 p-4 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 cursor-pointer transition-all duration-200 border border-border hover:border-orange-300 dark:hover:border-orange-600 hover:shadow-md active:scale-[0.98]"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={contact.profilePicture || ""} />
                        <AvatarFallback>
                          <UserAvatarIcon />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-lg font-medium text-foreground truncate">
                            {contact.displayName || contact.username}
                          </p>
                          {contact.id === user?.id && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                              You
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className={`w-2 h-2 rounded-full ${contact.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                          <p className="text-sm text-muted-foreground">
                            {contact.id === user?.id ? 'Message yourself' : (contact.isOnline ? 'Online' : 'Offline')}
                          </p>
                        </div>
                      </div>
                      <div className="text-muted-foreground">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredContactList.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No contacts found</h3>
                    <p className="text-muted-foreground">
                      {searchQuery ? 'Try adjusting your search' : 'No contacts available'}
                    </p>
                  </div>
                )}
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
              <h1 className="text-xl font-semibold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent" style={{ fontFamily: 'Google Product Sans, sans-serif', letterSpacing: '-0.025em' }}>
                Messenger
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
                placeholder="Search contacts..."
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
            <div className="h-full overflow-auto p-4">
              {/* Contact List for Mobile */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground mb-2">Contacts</h2>
                <p className="text-muted-foreground text-sm">Tap a contact to start messaging</p>
              </div>

              <div className="space-y-3">
                {filteredContactList.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => handleContactClick(contact)}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 cursor-pointer transition-all duration-200 border border-border hover:border-orange-300 dark:hover:border-orange-600 hover:shadow-md active:scale-[0.98] touch-manipulation"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={contact.profilePicture || ""} />
                      <AvatarFallback>
                        <UserAvatarIcon />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-base font-medium text-foreground truncate">
                          {contact.displayName || contact.username}
                        </p>
                        {contact.id === user?.id && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 mt-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${contact.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <p className="text-xs text-muted-foreground">
                          {contact.id === user?.id ? 'Message yourself' : (contact.isOnline ? 'Online' : 'Offline')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredContactList.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-base font-medium text-foreground mb-1">No contacts found</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'Try adjusting your search' : 'No contacts available'}
                  </p>
                </div>
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