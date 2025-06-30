import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Sidebar from "@/components/sidebar";
import ChatWindow from "@/components/chat-window";
import WalletModal from "@/components/wallet-modal";
import WalletSidebar from "@/components/wallet-sidebar";
import VideoCallModal from "@/components/video-call-modal";
import VoiceCallModal from "@/components/voice-call-modal";
import SettingsModal from "@/components/settings-modal";
import HamburgerMenu from "@/components/hamburger-menu";
import type { User, Conversation, Message } from "@shared/schema";
import { Home, User as UserIcon, Settings, Users } from "lucide-react";
import { UserAvatarIcon } from "@/components/ui/user-avatar-icon";
import { WalletIcon } from "@/components/ui/wallet-icon";
import coynLogoPath from "@assets/COYN-symbol-square_1750808237977.png";

export default function MessengerPage() {
  useScrollToTop(); // Clean contact list
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isWalletSidebarOpen, setIsWalletSidebarOpen] = useState(false);
  const [selectedWalletCurrency, setSelectedWalletCurrency] = useState<string | undefined>();
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [isVoiceCallOpen, setIsVoiceCallOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
    return 5; // Fallback to default user
  };

  const connectedUserId = getConnectedUserId();

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

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createConversationMutation = useMutation({
    mutationFn: async (otherUserId: number) => {
      const response = await apiRequest("POST", "/api/conversations", { otherUserId });
      return response.json();
    },
    onSuccess: (newConversation: Conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversation(newConversation.id);
    },
  });

  // Handler for clicking on a contact - don't auto-create conversations
  const handleContactClick = (contact: User) => {
    // Check if conversation already exists
    const existingConversation = conversations.find(conv => 
      conv.otherUser?.id === contact.id
    );
    
    if (existingConversation) {
      // If conversation exists, open it
      setSelectedConversation(existingConversation.id);
    } else {
      // Only create conversation if the contact is actually in the available contacts list
      const isContactAvailable = availableContacts.some(c => c.id === contact.id);
      if (isContactAvailable) {
        // If no conversation exists, create one only when user actually wants to chat
        createConversationMutation.mutate(contact.id);
      } else {
        console.log("Contact not available for new conversation:", contact.displayName);
      }
    }
  };

  // Filter out current user and users who already have conversations
  const availableContacts = allUsers.filter(contact => {
    const hasExistingConversation = conversations.some(conv => conv.otherUser?.id === contact.id);
    const isCurrentUser = contact.id === user?.id;
    return !isCurrentUser && !hasExistingConversation;
  });

  // Filter conversations and contacts based on search query
  const filteredConversations = conversations.filter(conversation => {
    const isGroup = conversation.isGroup;
    if (isGroup) {
      // For groups, search by group name
      return conversation.groupName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (conversation.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    } else {
      // For direct conversations, search by other user's name
      return conversation.otherUser?.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conversation.otherUser?.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (conversation.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    }
  });

  const filteredContacts = availableContacts.filter(contact =>
    contact.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  // Keep messenger open to contact list view by default

  const currentConversation = conversations.find(c => c.id === selectedConversation);

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Desktop Header - only visible on large screens */}
      <div className="hidden lg:flex lg:flex-col lg:w-full lg:h-screen">
        <div className="bg-card border-b border-border p-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setLocation("/")}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary hover:bg-muted"
            >
              <Home className="h-4 w-4 mr-2" />
              Return to Home
            </Button>
            <h1 className="text-xl font-normal text-primary" style={{ fontFamily: 'Product Sans, Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', letterSpacing: '-0.025em' }}>
              Messenger
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <HamburgerMenu onOpenSettings={() => setIsSettingsOpen(true)} />
            <button
              onClick={() => setIsWalletSidebarOpen(true)}
              className="hover:opacity-80 transition-opacity"
              title="Open COYN Wallet"
            >
              <img 
                src={coynLogoPath} 
                alt="COYN Logo" 
                className="w-8 h-8 cursor-pointer"
              />
            </button>
          </div>
        </div>

        {/* Desktop Main Content */}
        <div className="flex flex-1">
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

          <div className="flex-1 flex flex-col bg-background">
            {selectedConversation && currentConversation ? (
              <ChatWindow
                conversation={currentConversation}
                onToggleSidebar={() => {}}
                onBack={() => setSelectedConversation(null)}
                searchQuery={searchQuery}
              />
            ) : (
              <div className="flex-1 flex flex-col bg-background">


                {/* Contact List First - Main Focus */}
                <div className="flex-1 overflow-auto">


                  {/* Existing Conversations - Secondary Display */}
                  {filteredConversations.length > 0 && (
                    <div>
                      <div className="p-3 bg-muted/30 border-b border-border">
                        <h3 className="text-sm font-medium text-muted-foreground">Recent Conversations</h3>
                      </div>
                      <div className="divide-y divide-border">
                        {filteredConversations.map((conversation) => (
                          <div
                            key={conversation.id}
                            onClick={() => {
                              setSelectedConversation(conversation.id);
                              // Clear search when switching conversations on mobile
                              if (window.innerWidth < 768) {
                                setSearchQuery("");
                                setIsSearchOpen(false);
                              }
                            }}
                            className="p-4 hover:bg-accent/50 cursor-pointer transition-colors border-l-4 border-transparent hover:border-orange-500"
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
                                      {new Date(conversation.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                    </div>
                  )}

                  {/* Empty State - Only show if no conversations AND no available contacts */}
                  {filteredConversations.length === 0 && availableContacts.length === 0 && (
                    <div className="flex-1 flex flex-col">
                      <div className="bg-card border-b border-border p-4">
                        <div className="flex items-center space-x-3">
                          <img 
                            src={coynLogoPath} 
                            alt="COYN Logo" 
                            className="w-8 h-8 drop-shadow-[0_0_12px_rgba(255,193,7,0.4)]"
                          />
                          <h1 className="text-xl font-normal text-foreground" style={{ fontFamily: 'Product Sans, Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', letterSpacing: '-0.025em' }}>
                            Start a Conversation
                          </h1>
                        </div>
                      </div>

                      <div className="flex-1 overflow-auto">
                        {(searchQuery ? filteredContacts : availableContacts).length > 0 ? (
                          <div className="divide-y divide-border">
                            {(searchQuery ? filteredContacts : availableContacts).map((contact) => (
                              <div
                                key={contact.id}
                                onClick={() => handleContactClick(contact)}
                                className="p-4 hover:bg-accent/50 cursor-pointer transition-colors border-l-4 border-transparent hover:border-orange-500"
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="relative">
                                    <Avatar className="w-12 h-12">
                                      <AvatarImage 
                                        src={contact.profilePicture || undefined} 
                                        alt={contact.displayName}
                                      />
                                      <AvatarFallback className="bg-gray-200 dark:bg-gray-700">
                                        <UserAvatarIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                                      </AvatarFallback>
                                    </Avatar>
                                    {contact.isOnline && (
                                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-foreground truncate">
                                      {contact.displayName}
                                    </h3>
                                    <p className="text-sm text-muted-foreground truncate">
                                      @{contact.username}
                                    </p>
                                  </div>
                                  {createConversationMutation.isPending && (
                                    <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-center">
                            <div className="text-center text-muted-foreground">
                              <div className="mx-auto mb-4">
                                <img 
                                  src={coynLogoPath} 
                                  alt="COYN Logo" 
                                  className="w-16 h-16 mx-auto drop-shadow-[0_0_20px_rgba(255,193,7,0.4)]"
                                />
                              </div>
                              <h2 className="text-xl font-semibold mb-2">All Set!</h2>
                              <p>You're connected to all available contacts</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
                Messenger
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                className="text-slate-700 dark:text-slate-700 hover:text-orange-500 transition-colors p-2"
                onClick={() => {
                  setIsSearchOpen(!isSearchOpen);
                  // Clear search when closing search bar
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
                title="Open COYN Wallet"
              >
                <img 
                  src={coynLogoPath} 
                  alt="COYN Logo" 
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
                  onClick={() => {
                    setSearchQuery("");
                    // Remove any search highlighting safely
                    try {
                      const highlights = document.querySelectorAll('mark');
                      highlights.forEach(mark => {
                        if (mark && mark.parentNode) {
                          const parent = mark.parentNode;
                          const textNode = document.createTextNode(mark.textContent || '');
                          parent.replaceChild(textNode, mark);
                        }
                      });
                    } catch (error) {
                      console.log('Search cleanup error:', error);
                    }
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mobile Main Content */}
        <div className="flex-1 flex flex-col bg-background">
          {selectedConversation && currentConversation ? (
            <ChatWindow
              conversation={currentConversation}
              onToggleSidebar={() => setIsSidebarOpen(true)}
              onBack={() => setSelectedConversation(null)}
              searchQuery={searchQuery}
            />
          ) : (
            <div className="flex-1 flex flex-col bg-background">
              {/* Contact List and Conversations */}
              <div className="flex-1 overflow-auto">


                {/* Existing Conversations */}
                {filteredConversations.length > 0 && (
                  <div>
                    {availableContacts.length > 0 && (
                      <div className="p-3 bg-muted/30 border-b border-border">
                        <h3 className="text-sm font-medium text-muted-foreground">Recent Conversations</h3>
                      </div>
                    )}
                    <div className="divide-y divide-border">
                      {filteredConversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          onClick={() => setSelectedConversation(conversation.id)}
                          className="p-4 hover:bg-accent/50 cursor-pointer transition-colors border-l-4 border-transparent hover:border-orange-500"
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
                                    {new Date(conversation.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                  </div>
                )}

                {/* Empty State */}
                {filteredConversations.length === 0 && availableContacts.length === 0 && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <div className="mx-auto mb-4">
                        <img 
                          src={coynLogoPath} 
                          alt="COYN Logo" 
                          className="w-16 h-16 mx-auto drop-shadow-[0_0_20px_rgba(255,193,7,0.4)]"
                        />
                      </div>
                      <h2 className="text-xl font-semibold mb-2">No contacts available</h2>
                      <p>Add contacts to start messaging</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Sidebar */}
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
        showShipping={false}
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
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          style={{ touchAction: 'manipulation' }}
        />
      )}
    </div>
  );
}
