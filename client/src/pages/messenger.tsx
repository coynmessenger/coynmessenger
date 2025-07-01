import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { UserAvatarIcon } from '@/components/ui/user-avatar-icon';
import type { User } from '@shared/schema';
import coynLogoPath from '@assets/COYN-symbol-square_1751239261149.png';

export default function MessengerPage() {
  const [selectedContact, setSelectedContact] = useState<User | null>(null);
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
      // Handle successful conversation creation
    }
  });

  // Handle contact click
  const handleContactClick = async (contact: User) => {
    if (!user) return;
    
    // Set selected contact for display
    setSelectedContact(contact);
    
    // Create conversation with the contact
    createConversationMutation.mutate(contact.id);
  };

  // Create unified contact list: current user first, then others
  const currentUserContact = user ? [user] : [];
  const otherContacts = allUsers.filter(contact => contact.id !== user?.id);
  const allContacts = [...currentUserContact, ...otherContacts];

  // Filter contacts based on search
  const filteredContacts = allContacts.filter(contact =>
    contact.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-background">
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

      {/* Search Bar */}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-background">
        {selectedContact ? (
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="text-center">
              <Avatar className="w-20 h-20 mx-auto mb-4">
                <AvatarImage 
                  src={selectedContact.profilePicture || undefined} 
                  alt={selectedContact.displayName}
                />
                <AvatarFallback className="bg-gray-200 dark:bg-gray-700">
                  <UserAvatarIcon className="w-10 h-10 text-gray-500 dark:text-gray-400" />
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-medium text-foreground mb-2">
                {selectedContact.displayName}
                {selectedContact.id === user?.id && (
                  <span className="ml-2 text-sm bg-orange-500 text-white px-2 py-1 rounded-full">
                    You
                  </span>
                )}
              </h2>
              <p className="text-muted-foreground mb-4">
                {selectedContact.id === user?.id ? "This is your personal space" : `@${selectedContact.username}`}
              </p>
              {createConversationMutation.isPending && (
                <div className="flex justify-center">
                  <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              <button
                onClick={() => setSelectedContact(null)}
                className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Back to Contacts
              </button>
            </div>
          </div>
        ) : (
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
                  </div>
                </div>
              ))}
              
              {/* Empty state */}
              {(searchQuery ? filteredContacts : allContacts).length === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">No contacts found</h3>
                    <p className="text-muted-foreground">
                      {searchQuery ? 'Try a different search term' : 'Connect your wallet to see available contacts'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}