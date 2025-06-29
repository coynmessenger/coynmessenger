import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { useMessagingWebSocket } from "@/hooks/use-messaging-websocket";
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
import ConnectionStatus from "@/components/connection-status";
import TypingIndicator from "@/components/typing-indicator";
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
  const [isGroupCreateOpen, setIsGroupCreateOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: conversations = [] } = useQuery<(Conversation & { otherUser: User; lastMessage?: Message })[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Initialize real-time messaging WebSocket
  const {
    isConnected: isWSConnected,
    typingUsers,
    onlineUsers,
    joinConversation,
    leaveConversation,
    sendTyping,
    notifyNewMessage,
    notifyMessageUpdate
  } = useMessagingWebSocket(user?.id);

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
      // If no conversation exists, create one only when user actually wants to chat
      createConversationMutation.mutate(contact.id);
    }
  };

  // Filter out current user and users who already have conversations
  const availableContacts = allUsers.filter(contact => 
    contact.id !== user?.id && 
    !conversations.some(conv => conv.otherUser?.id === contact.id)
  );

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

  // Effect to join/leave conversations when selection changes
  useEffect(() => {
    if (selectedConversation) {
      joinConversation(selectedConversation);
      return () => leaveConversation();
    }
  }, [selectedConversation, joinConversation, leaveConversation]);

  // Get typing users for current conversation
  const currentTypingUsers = selectedConversation 
    ? typingUsers.get(selectedConversation) || []
    : [];

  // Get online status for users
  const isUserOnline = (userId: number) => onlineUsers.has(userId);

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
            <ConnectionStatus isConnected={isWSConnected} className="hidden sm:block" />
            <HamburgerMenu 
              onOpenSettings={() => setIsSettingsOpen(true)} 
              onGroupCreated={(conversationId) => setSelectedConversation(conversationId)}
            />
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
                  {/* Available Contacts - Primary Display */}
                  {availableContacts.length > 0 && (
                    <div>
                      <div className="px-3 py-2 bg-muted/30 border-b border-border">
                        <h3 className="text-xs font-medium text-muted-foreground">Start New Conversation</h3>
                      </div>
                      <div className="divide-y divide-border">
                        {(searchQuery ? filteredContacts : availableContacts).map((contact) => (
                          <div
                            key={contact.id}
                            onClick={() => handleContactClick(contact)}
                            className="px-3 py-2.5 sm:px-4 sm:py-3 hover:bg-accent/50 cursor-pointer transition-colors border-l-4 border-transparent hover:border-orange-500"
                          >
                            <div className="flex items-center space-x-2.5 sm:space-x-3">
                              <div className="relative">
                                <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
                                  <AvatarImage 
                                    src={contact.username === 'jane' ? undefined : (contact.profilePicture || undefined)} 
                                    alt={contact.displayName}
                                    onError={(e) => {
                                      console.log(`Avatar failed to load for ${contact.displayName}:`, contact.profilePicture);
                                    }}
                                  />
                                  <AvatarFallback className="bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                    <UserAvatarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500 dark:text-gray-400" />
                                  </AvatarFallback>
                                </Avatar>
                                {contact.isOnline && (
                                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 border-2 border-background rounded-full"></div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm sm:text-base font-medium text-foreground truncate">
                                  {contact.displayName}
                                </h3>
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">
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
                    </div>
                  )}

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
                onClick={() => setIsSearchOpen(!isSearchOpen)}
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
              <HamburgerMenu 
                onOpenSettings={() => setIsSettingsOpen(true)}
                onGroupCreated={(conversationId) => setSelectedConversation(conversationId)}
                externalGroupCreate={isGroupCreateOpen}
                onExternalGroupCreateClose={() => setIsGroupCreateOpen(false)}
              />
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
                {/* Available Contacts - Primary Display */}
                {availableContacts.length > 0 && (
                  <div className="mb-2">
                    <div className="p-3 bg-muted/30 border-b border-border">
                      <h3 className="text-sm font-medium text-muted-foreground">Start New Conversation</h3>
                    </div>
                    <div className="divide-y divide-border">
                      {availableContacts.map((contact) => (
                        <div
                          key={contact.id}
                          onClick={() => createConversationMutation.mutate(contact.id)}
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
                  </div>
                )}

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

      {/* Mobile Group Creation FAB */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setIsGroupCreateOpen(true)}
          className="h-14 w-14 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-2 border-white dark:border-gray-800"
          title="Create New Group"
        >
          <Users className="h-6 w-6 text-white" />
        </Button>
      </div>
    </div>
  );
}
