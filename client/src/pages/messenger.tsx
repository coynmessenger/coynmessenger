import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import ChatWindow from '@/components/chat-window';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { UserAvatarIcon } from '@/components/ui/user-avatar-icon';
import type { User, Conversation } from '@shared/schema';
import coynLogoPath from '@assets/COYN-symbol-square_1751239261149.png';

// Extended conversation type with populated user data
interface ConversationWithUser extends Conversation {
  otherUser?: User;
}

export default function MessengerPage() {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const queryClient = useQueryClient();

  // Get current user
  const { data: user } = useQuery<User>({
    queryKey: ['/api/user'],
    enabled: !!localStorage.getItem('connectedUser')
  });

  // Get all users for contact list
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ['/api/users']
  });

  // Get conversations with proper typing
  const { data: conversations = [] } = useQuery<ConversationWithUser[]>({
    queryKey: ['/api/conversations'],
    enabled: !!user?.id
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (otherUserId: number) => {
      return apiRequest(`/api/conversations`, 'POST', {
        otherUserId,
        currentUserId: user?.id
      });
    },
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setSelectedConversation(newConversation.id);
    }
  });

  // Handle contact click
  const handleContactClick = async (contact: User) => {
    if (!user) return;
    
    // Check if conversation already exists
    const existingConversation = conversations.find(conv => 
      (conv.participant1Id === user.id && conv.participant2Id === contact.id) ||
      (conv.participant2Id === user.id && conv.participant1Id === contact.id)
    );
    
    if (existingConversation) {
      setSelectedConversation(existingConversation.id);
    } else {
      // Create new conversation
      createConversationMutation.mutate(contact.id);
    }
  };

  // Create unified contact list: current user first, then others without existing conversations
  const currentUserContact = user ? [user] : [];
  const otherAvailableContacts = allUsers.filter(contact => {
    const hasExistingConversation = conversations.some(conv => 
      (conv.participant1Id === user?.id && conv.participant2Id === contact.id) ||
      (conv.participant2Id === user?.id && conv.participant1Id === contact.id)
    );
    const isCurrentUser = contact.id === user?.id;
    return !isCurrentUser && !hasExistingConversation;
  });

  const allContacts = [...currentUserContact, ...otherAvailableContacts];

  // Filter contacts based on search
  const filteredContacts = allContacts.filter(contact =>
    contact.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get current conversation
  const currentConversation = conversations.find(conv => conv.id === selectedConversation);

  return (
    <div className="h-screen flex flex-col md:flex-row bg-background">
      {/* Desktop Layout */}
      <div className="hidden md:flex md:w-1/3 md:border-r md:border-border flex-col">
        <div className="flex-1 flex flex-col bg-background">
          {selectedConversation && currentConversation ? (
            <ChatWindow
              conversation={currentConversation as ConversationWithUser}
              onToggleSidebar={() => {}}
              onBack={() => setSelectedConversation(null)}
              searchQuery={searchQuery}
            />
          ) : (
            <div className="flex-1 flex flex-col bg-background">
              {/* Unified Contact List */}
              <div className="flex-1 overflow-auto">
                <div className="divide-y divide-border">
                  {(searchQuery ? filteredContacts : allContacts).map((contact) => (
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
                            {contact.id === user?.id && (
                              <span className="ml-2 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">
                                You
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {contact.id === user?.id ? "Message yourself" : `@${contact.username}`}
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
            </div>
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden flex-1 flex flex-col">
        {/* Mobile Header */}
        <nav className="bg-white dark:bg-white border-b border-gray-200 dark:border-gray-200 p-4 z-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => window.location.href = '/'}
                className="text-slate-700 dark:text-slate-700 hover:text-orange-500 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </button>
              <img 
                src={coynLogoPath} 
                alt="COYN Logo" 
                className="w-8 h-8 drop-shadow-[0_0_12px_rgba(255,193,7,0.4)]"
              />
              <h1 className="text-xl font-normal text-slate-700 dark:text-slate-700" style={{ fontFamily: 'Product Sans, Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', letterSpacing: '-0.025em' }}>
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
                className="hover:opacity-80 transition-opacity"
                title="Open COYN Wallet"
              >
                <img 
                  src={coynLogoPath} 
                  alt="COYN Logo" 
                  className="w-8 h-8 drop-shadow-[0_0_12px_rgba(255,193,7,0.4)] cursor-pointer"
                />
              </button>
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
              conversation={currentConversation as ConversationWithUser}
              onToggleSidebar={() => {}}
              onBack={() => setSelectedConversation(null)}
              searchQuery={searchQuery}
            />
          ) : (
            <div className="flex-1 flex flex-col bg-background">
              {/* Unified Contact List - Mobile */}
              <div className="flex-1 overflow-auto">
                <div className="divide-y divide-border">
                  {(searchQuery ? filteredContacts : allContacts).map((contact) => (
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
                            {contact.id === user?.id && (
                              <span className="ml-2 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">
                                You
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {contact.id === user?.id ? "Message yourself" : `@${contact.username}`}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}