import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { io } from "socket.io-client";
import { useToast } from "@/hooks/use-toast";

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
import { initializeGlobalWebRTC, getGlobalWebRTC, setGlobalWebRTCHandlers, cleanupGlobalWebRTC } from "@/lib/global-webrtc";

// Enhanced COYN logo preloading with multiple optimization strategies
const preloadImage = (src: string) => {
  // Strategy 1: Preload via link element
  const linkPreload = document.createElement('link');
  linkPreload.rel = 'preload';
  linkPreload.as = 'image';
  linkPreload.href = src;
  linkPreload.fetchPriority = 'high';
  document.head.appendChild(linkPreload);

  // Strategy 2: Image object preloading
  const img = new Image();
  img.src = src;
  img.loading = 'eager';
  img.decoding = 'async';
  img.fetchPriority = 'high';
  
  // Strategy 3: Add to cache (with error handling)
  if ('caches' in window) {
    try {
      caches.open('coyn-logo-cache').then(cache => {
        cache.add(src);
      }).catch(() => {
        // Silently ignore cache errors to prevent security policy violations
      });
    } catch {
      // Silently ignore cache errors to prevent security policy violations
    }
  }
};

// Preload immediately when module loads
preloadImage(coynLogoPath);

export default function MessengerPage() {
  useScrollToTop(); // Clean contact list
  
  // Clear homepage session flag when user is in messenger
  useEffect(() => {
    sessionStorage.removeItem('userOnHomepage');
    localStorage.removeItem('userClickedHome');
  }, []);
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isWalletSidebarOpen, setIsWalletSidebarOpen] = useState(false);
  const [selectedWalletCurrency, setSelectedWalletCurrency] = useState<string | undefined>();
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [isVoiceCallOpen, setIsVoiceCallOpen] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState<{ fromUserId: string; type: 'voice' | 'video'; callId: string } | null>(null);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast, dismiss } = useToast();
  
  // Socket.IO connection for real-time updates
  const [socket, setSocket] = useState<any>(null);
  
  // Track active toast notifications by conversation ID (store toast IDs)
  const [activeToasts, setActiveToasts] = useState<Map<string, string>>(new Map());
  
  // Track WebRTC initialization to prevent loops
  const [globalWebRTCInitialized, setGlobalWebRTCInitialized] = useState(false);

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
    return null; // No fallback to prevent unwanted API calls
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
    enabled: !!connectedUserId,
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

  // Function to clear notifications for a conversation
  const clearNotificationsForConversation = (conversationId: string) => {
    // Dismiss active toast notification immediately using toast ID
    const existingToastId = activeToasts.get(conversationId);
    if (existingToastId) {
      dismiss(existingToastId);
      setActiveToasts(prev => {
        const newMap = new Map(prev);
        newMap.delete(conversationId);
        return newMap;
      });
    }
    
    // Notify server to clear notifications
    if (socket) {
      socket.emit('clear-notifications', { conversationId });
    }
  };

  // Handler for clicking on a contact - don't auto-create conversations
  const handleContactClick = (contact: User) => {
    // Check if conversation already exists
    const existingConversation = conversations.find(conv => 
      conv.otherUser?.id === contact.id
    );
    
    if (existingConversation) {
      // If conversation exists, open it
      setSelectedConversation(existingConversation.id);
      
      // Clear notifications for this conversation when opened
      clearNotificationsForConversation(existingConversation.id.toString());
    } else {
      // Only create conversation if the contact is actually in the available contacts list
      const isContactAvailable = availableContacts.some(c => c.id === contact.id);
      if (isContactAvailable) {
        // If no conversation exists, create one only when user actually wants to chat
        createConversationMutation.mutate(contact.id);
      } else {
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
    
    // For other conversations, maintain original order (could add timestamp sorting here)
    return 0;
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

  // Socket.IO connection for real-time updates
  useEffect(() => {
    if (!connectedUserId) return;

    const socketConnection = io();
    setSocket(socketConnection);

    // Handle connection event
    socketConnection.on('connect', () => {
      console.log('Connected to Socket.IO server for conversations');
      
      // Authenticate with server
      socketConnection.emit('authenticate', { userId: connectedUserId });
      
      // Join all conversation rooms for this user
      if (conversations && conversations.length > 0) {
        conversations.forEach(conversation => {
          socketConnection.emit('join-conversation', { 
            conversationId: conversation.id.toString() 
          });
        });
      }
      
      // Initialize global WebRTC service for calls (only once)
      const initializeWebRTC = async () => {
        if (globalWebRTCInitialized) return;
        
        try {
          setGlobalWebRTCInitialized(true);
          await initializeGlobalWebRTC(connectedUserId.toString());
          console.log('Global WebRTC service initialized for user:', connectedUserId);
          
          // Set up global WebRTC handlers for incoming calls IMMEDIATELY after initialization
          setGlobalWebRTCHandlers({
            onIncomingCall: (call) => {
              console.log('📞 Incoming call received:', call);
              
              // Find the user for this call
              const callerUser = allUsers.find(u => u.id.toString() === call.fromUserId);
              
              if (callerUser) {
                // Store incoming call data with call ID
                setIncomingCallData({ fromUserId: call.fromUserId, type: call.type, callId: call.callId });
                
                // Open the appropriate modal
                if (call.type === 'voice') {
                  setIsVoiceCallOpen(true);
                } else if (call.type === 'video') {
                  setIsVideoCallOpen(true);
                }
              }
            },
            onCallAccepted: (call) => {
              console.log('Global WebRTC call accepted:', call);
            },
            onCallEnded: (call) => {
              console.log('Global WebRTC call ended:', call);
              setIsVoiceCallOpen(false);
              setIsVideoCallOpen(false);
              setIncomingCallData(null);
            }
          });
        } catch (error) {
          console.error('Failed to initialize global WebRTC service:', error);
        }
      };
      
      // Call the async initialization
      initializeWebRTC();
    });

    // Listen for new messages
    socketConnection.on('new_message', (data) => {
      console.log('🔔 New message received via Socket.IO:', data);
      console.log('📧 Message details:', {
        senderId: data.senderId,
        senderName: data.senderName,
        conversationId: data.conversationId,
        content: data.content,
        currentUserId: connectedUserId,
        selectedConversation: selectedConversation
      });
      
      // Invalidate conversation queries to refresh the list immediately
      console.log('🔄 Invalidating conversation queries for user:', connectedUserId);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", connectedUserId] });
      
      // If this is the currently selected conversation, also invalidate messages query
      if (selectedConversation && selectedConversation.toString() === data.conversationId) {
        console.log('💬 Invalidating messages query for conversation:', data.conversationId);
        queryClient.invalidateQueries({ queryKey: ["/api/conversations", parseInt(data.conversationId), "messages"] });
      }
      
      // Show notification for new messages from other users only if conversation is not currently open
      if (data.senderId !== connectedUserId && data.senderName) {
        const isConversationOpen = selectedConversation && selectedConversation.toString() === data.conversationId;
        console.log('🔔 Notification check:', {
          isConversationOpen,
          shouldShowNotification: !isConversationOpen
        });
        
        if (!isConversationOpen) {
          // Dismiss any existing toast for this conversation
          const existingToastId = activeToasts.get(data.conversationId);
          if (existingToastId) {
            dismiss(existingToastId);
          }
          
          // Create new toast and track its ID
          const newToast = toast({
            title: `New message from ${data.senderName}`,
            description: data.content ? data.content.substring(0, 100) + (data.content.length > 100 ? '...' : '') : 'New message received',
            duration: 3000,
          });
          
          // Store toast ID for dismissal
          setActiveToasts(prev => new Map(prev.set(data.conversationId, newToast.id)));
          
          // Clean up toast reference when it expires
          setTimeout(() => {
            setActiveToasts(prev => {
              const newMap = new Map(prev);
              newMap.delete(data.conversationId);
              return newMap;
            });
          }, 3000);
        }
      }
    });

    // Listen for notification clearing confirmation
    socketConnection.on('notifications-cleared', (data) => {
      console.log('Notifications cleared for conversation:', data.conversationId);
      
      // Dismiss active toast notification for this conversation
      const existingToastId = activeToasts.get(data.conversationId);
      if (existingToastId) {
        dismiss(existingToastId);
        setActiveToasts(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.conversationId);
          return newMap;
        });
      }
      
      // Refresh conversation list to update unread indicators
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", connectedUserId] });
    });

    // Cleanup on unmount
    return () => {
      socketConnection.disconnect();
      if (globalWebRTCInitialized) {
        cleanupGlobalWebRTC();
        setGlobalWebRTCInitialized(false);
      }
    };
  }, [connectedUserId]); // Simplified dependencies to prevent loops

  return (
    <div className="flex h-screen watercolor-bg bg-background text-foreground relative">
      {/* Watercolor Background Overlay */}
      <div className="absolute inset-0 watercolor-overlay dark:watercolor-overlay-dark -z-10"></div>
      {/* Desktop Header - only visible on large screens */}
      <div className="hidden lg:flex lg:flex-col lg:w-full lg:h-screen">
        <div className="bg-card border-b border-border p-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => {
                console.log('Desktop home button clicked - navigating to homepage');
                localStorage.setItem('userClickedHome', 'true');
                setLocation("/");
              }}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary hover:bg-muted active:bg-muted/80 transition-colors"
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
                loading="eager"
                decoding="async"
                fetchPriority="high"
                style={{ 
                  imageRendering: 'auto',
                  transform: 'translateZ(0)',
                  willChange: 'auto'
                }}
              />
            </button>
          </div>
        </div>

        {/* Desktop Main Content */}
        <div className="flex flex-1">
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
                      <div className="divide-y divide-border">
                        {filteredConversations.map((conversation) => {
                          // Check if this conversation has unread messages (show notification only if there's an active toast)
                          const hasUnreadMessages = activeToasts.has(conversation.id.toString());
                          
                          return (
                            <div
                              key={conversation.id}
                              onClick={() => {
                                setSelectedConversation(conversation.id);
                                // Clear search when switching conversations on mobile
                                if (window.innerWidth < 768) {
                                  setSearchQuery("");
                                  setIsSearchOpen(false);
                                }
                                // Clear notifications for this conversation when opened
                                clearNotificationsForConversation(conversation.id.toString());
                              }}
                              className={`p-4 hover:bg-accent/50 cursor-pointer transition-colors border-l-4 border-transparent hover:border-blue-500 ${
                                hasUnreadMessages ? 'bg-blue-50 dark:bg-blue-900/20 border-l-blue-500' : ''
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="relative">
                                  <Avatar className="w-12 h-12">
                                    {conversation.isGroup ? (
                                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
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

                                  {/* Unread message indicator */}
                                  {hasUnreadMessages && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                                      <div className="w-2 h-2 bg-white rounded-full"></div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <h3 className={`font-medium text-foreground truncate ${
                                      hasUnreadMessages ? 'font-bold' : ''
                                    }`}>
                                      {conversation.isGroup ? conversation.groupName : conversation.otherUser?.displayName}
                                    </h3>
                                    {conversation.lastMessage && conversation.lastMessage.timestamp && (
                                      <span className={`text-xs ${
                                        hasUnreadMessages ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'text-muted-foreground'
                                      }`}>
                                        {new Date(conversation.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    )}
                                  </div>
                                  <p className={`text-sm truncate ${
                                    hasUnreadMessages ? 'text-orange-800 dark:text-orange-200 font-medium' : 'text-muted-foreground'
                                  }`}>
                                    {conversation.lastMessage?.content || "No messages yet"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
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
                            loading="eager"
                            decoding="async"
                            fetchPriority="high"
                            style={{ 
                              imageRendering: 'auto',
                              transform: 'translateZ(0)',
                              willChange: 'auto'
                            }}
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
                                className="p-4 hover:bg-accent/50 cursor-pointer transition-colors border-l-4 border-transparent hover:border-blue-500"
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
                                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
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
                                  loading="eager"
                                  decoding="async"
                                  fetchPriority="high"
                                  style={{ 
                                    imageRendering: 'auto',
                                    transform: 'translateZ(0)',
                                    willChange: 'auto'
                                  }}
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
                onClick={() => {
                  console.log('Home button clicked - navigating to homepage');
                  localStorage.setItem('userClickedHome', 'true');
                  setLocation("/");
                }}
                variant="ghost"
                size="sm"
                className="text-slate-700 dark:text-slate-700 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-100 p-2 active:bg-blue-100 transition-colors"
                title="Go to Homepage"
              >
                <Home className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-normal text-black dark:text-black" style={{ fontFamily: 'Google Product Sans, sans-serif', letterSpacing: '-0.025em' }}>
                Messenger
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                className="text-slate-700 dark:text-slate-700 hover:text-blue-500 transition-colors p-2"
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
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  style={{ 
                    imageRendering: 'auto',
                    transform: 'translateZ(0)',
                    willChange: 'auto'
                  }}
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
              onToggleSidebar={() => {}}
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
                    <div className="divide-y divide-border">
                      {filteredConversations.map((conversation) => {
                        // Check if this conversation has unread messages (show notification only if there's an active toast)
                        const hasUnreadMessages = activeToasts.has(conversation.id.toString());
                        
                        return (
                          <div
                            key={conversation.id}
                            onClick={() => {
                              setSelectedConversation(conversation.id);
                              // Clear notifications for this conversation when opened
                              clearNotificationsForConversation(conversation.id.toString());
                            }}
                            className={`p-4 hover:bg-accent/50 cursor-pointer transition-colors border-l-4 border-transparent hover:border-orange-500 ${
                              hasUnreadMessages ? 'bg-orange-50 dark:bg-orange-900/20 border-l-orange-500' : ''
                            }`}
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

                                {/* Unread message indicator */}
                                {hasUnreadMessages && (
                                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h3 className={`font-medium text-foreground truncate ${
                                    hasUnreadMessages ? 'font-bold' : ''
                                  }`}>
                                    {conversation.isGroup ? conversation.groupName : conversation.otherUser?.displayName}
                                  </h3>
                                  {conversation.lastMessage && conversation.lastMessage.timestamp && (
                                    <span className={`text-xs ${
                                      hasUnreadMessages ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'text-muted-foreground'
                                    }`}>
                                      {new Date(conversation.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  )}
                                </div>
                                <p className={`text-sm truncate ${
                                  hasUnreadMessages ? 'text-orange-800 dark:text-orange-200 font-medium' : 'text-muted-foreground'
                                }`}>
                                  {conversation.lastMessage?.content || "No messages yet"}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
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
                          loading="eager"
                          decoding="async"
                          fetchPriority="high"
                          style={{ 
                            imageRendering: 'auto',
                            transform: 'translateZ(0)',
                            willChange: 'auto'
                          }}
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


      </div>

      {/* Modals */}
      <WalletModal 
        isOpen={isWalletOpen} 
        onClose={handleCloseWallet}
        initialCurrency={selectedWalletCurrency}
      />
      <VideoCallModal
        isOpen={isVideoCallOpen}
        onClose={() => {
          setIsVideoCallOpen(false);
          setIncomingCallData(null);
        }}
        user={
          incomingCallData && incomingCallData.type === 'video'
            ? allUsers.find(u => u.id.toString() === incomingCallData.fromUserId)
            : currentConversation?.otherUser
        }
        callType={
          incomingCallData && incomingCallData.type === 'video'
            ? 'incoming'
            : 'outgoing'
        }
        incomingCallId={
          incomingCallData && incomingCallData.type === 'video'
            ? incomingCallData.callId
            : undefined
        }
      />
      <VoiceCallModal
        isOpen={isVoiceCallOpen}
        onClose={() => {
          setIsVoiceCallOpen(false);
          setIncomingCallData(null);
        }}
        user={
          incomingCallData && incomingCallData.type === 'voice'
            ? allUsers.find(u => u.id.toString() === incomingCallData.fromUserId)
            : currentConversation?.otherUser
        }
        callType={
          incomingCallData && incomingCallData.type === 'voice'
            ? 'incoming'
            : 'outgoing'
        }
        incomingCallId={
          incomingCallData && incomingCallData.type === 'voice'
            ? incomingCallData.callId
            : undefined
        }
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


    </div>
  );
}
