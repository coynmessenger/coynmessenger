import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/sidebar";
import ChatWindow from "@/components/chat-window";
import WalletModal from "@/components/wallet-modal";
import VideoCallModal from "@/components/video-call-modal";
import type { User, Conversation, Message } from "@shared/schema";
import { Home } from "lucide-react";
import coynLogoPath from "@assets/COYN-symbol-square_1750808237977.png";

export default function MessengerPage() {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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

  // Filter out current user and users who already have conversations
  const availableContacts = allUsers.filter(contact => 
    contact.id !== user?.id && 
    !conversations.some(conv => conv.otherUser.id === contact.id)
  );

  // Keep messenger open to contact list view by default

  const currentConversation = conversations.find(c => c.id === selectedConversation);

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conversation =>
    conversation.otherUser.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conversation.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Desktop Header - only visible on large screens */}
      <div className="hidden lg:flex lg:flex-col lg:w-full lg:h-screen">
        <div className="bg-card border-b border-border p-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src={coynLogoPath} 
              alt="COYN Logo" 
              className="w-8 h-8"
            />
            <h1 className="text-xl font-normal text-primary" style={{ fontFamily: 'Product Sans, Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', letterSpacing: '-0.025em' }}>
              Messenger
            </h1>
          </div>
          <Button
            onClick={() => setLocation("/")}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary hover:bg-muted"
          >
            <Home className="h-4 w-4 mr-2" />
            Return to Home
          </Button>
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
            onOpenWallet={() => setIsWalletOpen(true)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          <div className="flex-1 flex flex-col bg-slate-900">
            {selectedConversation && currentConversation ? (
              <ChatWindow
                conversation={currentConversation}
                onOpenVideoCall={() => setIsVideoCallOpen(true)}
                onToggleSidebar={() => {}}
              />
            ) : (
              <div className="flex-1 flex flex-col bg-background">
                {/* Header */}
                <div className="bg-card border-b border-border p-4">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={coynLogoPath} 
                      alt="COYN Logo" 
                      className="w-8 h-8 drop-shadow-[0_0_12px_rgba(255,193,7,0.4)]"
                    />
                    <h1 className="text-xl font-normal text-foreground" style={{ fontFamily: 'Product Sans, Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', letterSpacing: '-0.025em' }}>
                      Conversations
                    </h1>
                  </div>
                </div>

                {/* Contact List First - Main Focus */}
                <div className="flex-1 overflow-auto">
                  {/* Available Contacts - Primary Display */}
                  {availableContacts.length > 0 && (
                    <div>
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
                                <img
                                  src={contact.profilePicture || "/api/placeholder/40/40"}
                                  alt={contact.displayName}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
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
                                <img
                                  src={conversation.otherUser.profilePicture || "/api/placeholder/40/40"}
                                  alt={conversation.otherUser.displayName}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                                {conversation.otherUser.isOnline && (
                                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-medium text-foreground truncate">
                                    {conversation.otherUser.displayName}
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
                        {availableContacts.length > 0 ? (
                          <div className="divide-y divide-border">
                            {availableContacts.map((contact) => (
                              <div
                                key={contact.id}
                                onClick={() => createConversationMutation.mutate(contact.id)}
                                className="p-4 hover:bg-accent/50 cursor-pointer transition-colors border-l-4 border-transparent hover:border-orange-500"
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="relative">
                                    <img
                                      src={contact.profilePicture || "/api/placeholder/40/40"}
                                      alt={contact.displayName}
                                      className="w-12 h-12 rounded-full object-cover"
                                    />
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
        <nav className="bg-slate-800/95 backdrop-blur-sm border-b border-slate-700 z-50">
          <div className="flex items-center justify-between p-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-cyan-500"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center space-x-2">
              <img 
                src={coynLogoPath} 
                alt="COYN Logo" 
                className="w-8 h-8 drop-shadow-[0_0_12px_rgba(255,193,7,0.4)]"
              />
            </div>
            <div className="flex items-center space-x-2">
              <button 
                className="text-slate-400 hover:text-cyan-400 transition-colors p-2"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <Button
                onClick={() => setLocation("/")}
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-cyan-400 hover:bg-slate-700 p-2"
              >
                <Home className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </nav>

        {/* Mobile Search Bar */}
        {isSearchOpen && (
          <div className="bg-slate-800 border-b border-slate-700 p-4 z-40">
            <div className="relative">
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-slate-50 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
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
        <div className="flex-1 flex flex-col bg-slate-900">
          {selectedConversation && currentConversation ? (
            <ChatWindow
              conversation={currentConversation}
              onOpenVideoCall={() => setIsVideoCallOpen(true)}
              onToggleSidebar={() => setIsSidebarOpen(true)}
            />
          ) : (
            <div className="flex-1 flex flex-col bg-background">
              {/* Header */}
              <div className="bg-card border-b border-border p-4">
                <div className="flex items-center space-x-3">
                  <img 
                    src={coynLogoPath} 
                    alt="COYN Logo" 
                    className="w-8 h-8 drop-shadow-[0_0_12px_rgba(255,193,7,0.4)]"
                  />
                  <h1 className="text-xl font-normal text-foreground" style={{ fontFamily: 'Product Sans, Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', letterSpacing: '-0.025em' }}>
                    Conversations
                  </h1>
                </div>
              </div>

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
                              <img
                                src={contact.profilePicture || "/api/placeholder/40/40"}
                                alt={contact.displayName}
                                className="w-12 h-12 rounded-full object-cover"
                              />
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
                              <img
                                src={conversation.otherUser.profilePicture || "/api/placeholder/40/40"}
                                alt={conversation.otherUser.displayName}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                              {conversation.otherUser.isOnline && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h3 className="font-medium text-foreground truncate">
                                  {conversation.otherUser.displayName}
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
          onOpenWallet={() => setIsWalletOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* Modals */}
      <WalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
      <VideoCallModal
        isOpen={isVideoCallOpen}
        onClose={() => setIsVideoCallOpen(false)}
        otherUser={currentConversation?.otherUser}
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
