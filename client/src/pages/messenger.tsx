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
import coynLogoPath from "@assets/COYN symbol square_1759099649514.png";
import { initializeGlobalWebRTC, getGlobalWebRTC, setGlobalWebRTCHandlers, cleanupGlobalWebRTC } from "@/lib/global-webrtc";
import { globalNotificationService } from "@/lib/global-notification-service";

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
  const [socketConnected, setSocketConnected] = useState(false);
  
  // Track active toast notifications by conversation ID (store toast IDs)
  const [activeToasts, setActiveToasts] = useState<Map<string, string>>(new Map());
  
  // Track WebRTC initialization to prevent loops
  const [globalWebRTCInitialized, setGlobalWebRTCInitialized] = useState(false);
  const [webRTCInitializationAttempts, setWebRTCInitializationAttempts] = useState(0);

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

  // UNIVERSAL WebRTC INITIALIZATION: Runs immediately when user is authenticated
  useEffect(() => {
    if (connectedUserId && !globalWebRTCInitialized && webRTCInitializationAttempts === 0) {
      console.log('🚀 UNIVERSAL: Immediate WebRTC initialization for user:', connectedUserId);
      
      const initializeWebRTCUniversal = async () => {
        try {
          // Set attempts to prevent multiple initializations
          setWebRTCInitializationAttempts(1);
          
          console.log('🚀 UNIVERSAL: Starting guaranteed WebRTC initialization...');
          await initializeGlobalWebRTC(connectedUserId.toString(), 3);
          setGlobalWebRTCInitialized(true);
          console.log('🚀 UNIVERSAL: WebRTC initialization complete for user:', connectedUserId);
          
          // Set up universal call handlers
          setGlobalWebRTCHandlers({
            onIncomingCall: (call) => {
              console.log('📞 UNIVERSAL: Incoming call received:', call);
              setIncomingCallData({ fromUserId: call.fromUserId, type: call.type, callId: call.callId });
              if (call.type === 'voice') {
                setIsVoiceCallOpen(true);
              } else {
                setIsVideoCallOpen(true);
              }
            },
            onCallAccepted: (call) => {
              console.log('✅ UNIVERSAL: Call accepted:', call);
            },
            onCallEnded: (call) => {
              console.log('🔚 UNIVERSAL: Call ended:', call);
              setIsVideoCallOpen(false);
              setIsVoiceCallOpen(false);
              setIncomingCallData(null);
            }
          });
          
        } catch (error) {
          console.error('❌ UNIVERSAL: WebRTC initialization failed for user:', connectedUserId, error);
          // Retry once more if it failed
          if (webRTCInitializationAttempts < 2) {
            console.log('🔄 UNIVERSAL: Retrying WebRTC initialization...');
            setWebRTCInitializationAttempts(webRTCInitializationAttempts + 1);
            setTimeout(() => initializeWebRTCUniversal(), 2000);
          }
        }
      };
      
      // Initialize immediately, no delays
      initializeWebRTCUniversal();
    }
  }, [connectedUserId, globalWebRTCInitialized, webRTCInitializationAttempts]); // Proper dependencies to prevent loops

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
    if (existingToastId && existingToastId !== 'unread') {
      dismiss(existingToastId);
    }
    
    // Clear the unread indicator (highlighting) when conversation is opened
    setActiveToasts(prev => {
      const newMap = new Map(prev);
      newMap.delete(conversationId);
      return newMap;
    });
    
    console.log('🧹 Cleared notifications and highlighting for conversation:', conversationId);
    
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
    if (!connectedUserId || socket || socketConnected) {
      console.log('⏸️ Skipping socket connection - already exists or no user:', { 
        hasUserId: !!connectedUserId, 
        hasSocket: !!socket, 
        socketConnected 
      });
      return;
    }

    console.log('🔌 Creating new socket connection for user:', connectedUserId);
    const socketConnection = io();
    setSocket(socketConnection);

    // Handle connection event
    socketConnection.on('connect', () => {
      console.log('Connected to Socket.IO server for conversations');
      setSocketConnected(true);
      
      // Authenticate with server
      socketConnection.emit('authenticate', { userId: connectedUserId });
      
      // Wait longer for authentication to process before joining rooms
      setTimeout(() => {
        console.log('🏠 FIXED: Attempting to join conversation rooms after auth delay');
        // Join all conversation rooms for this user
        console.log('🏠 Checking conversations to join:', { 
          conversationsCount: conversations?.length || 0, 
          conversations: conversations?.map(c => c.id) || [] 
        });
        
        if (conversations && conversations.length > 0) {
          conversations.forEach(conversation => {
            console.log('🏠 FIXED: Joining conversation room:', conversation.id);
            socketConnection.emit('join-conversation', { 
              conversationId: conversation.id.toString() 
            });
          });
        } else {
          console.log('⚠️ No conversations found to join, will retry when conversations load');
        }
      }, 500); // Longer delay to ensure authentication is processed
    });

    // GUARANTEED WebRTC initialization with retry mechanism
    const initializeWebRTC = async () => {
        console.log('🔧 GUARANTEED: Starting WebRTC initialization for user:', connectedUserId);
        
        // Always reset and initialize fresh to ensure it works
        setGlobalWebRTCInitialized(false);
        
        try {
          // Use retry mechanism for guaranteed initialization
          await initializeGlobalWebRTC(connectedUserId.toString(), 3);
          setGlobalWebRTCInitialized(true); // Only set flag AFTER successful initialization
          console.log('✅ GUARANTEED: WebRTC service ready for user:', connectedUserId);
          
          // Don't initialize global notification service here - we handle notifications in messenger
          // globalNotificationService.initialize(connectedUserId.toString());
          
          // Set up global WebRTC handlers for incoming calls IMMEDIATELY after initialization
          setGlobalWebRTCHandlers({
            onIncomingCall: (call) => {
              console.log('📞 CRITICAL: Incoming call received in messenger handler:', call);
              console.log('👥 All users available:', allUsers.length);
              console.log('🔍 Looking for caller user ID:', call.fromUserId);
              console.log('🎯 Current modal states - Video:', isVideoCallOpen);
              
              // Find the user for this call
              const callerUser = allUsers.find(u => u.id.toString() === call.fromUserId);
              console.log('👤 Found caller user:', callerUser);
              
              // Always show the call modal, even if user is not found in the list
              // The modal can handle missing user gracefully
              console.log('🔧 Setting incoming call data:', { fromUserId: call.fromUserId, type: call.type, callId: call.callId });
              setIncomingCallData({ fromUserId: call.fromUserId, type: call.type, callId: call.callId });
              
              // Open the appropriate modal
              if (call.type === 'voice') {
                console.log('🎙️ CRITICAL: Opening voice call modal for incoming call');
                setIsVoiceCallOpen(true); // This was missing! Voice calls need modal too
                console.log('🎙️ CRITICAL: Voice call modal should now be open');
              } else if (call.type === 'video') {
                console.log('📹 CRITICAL: Opening video call modal');
                setIsVideoCallOpen(true);
                console.log('📹 CRITICAL: Video call modal should now be open');
              }
              
              // Force a re-render to ensure modals show
              setTimeout(() => {
                console.log('🔄 Post-timeout modal states - Video:', isVideoCallOpen);
              }, 100);
            },
            onCallAccepted: (call) => {
              console.log('Global WebRTC call accepted:', call);
            },
            onCallEnded: (call) => {
              console.log('Global WebRTC call ended:', call);
              setIsVideoCallOpen(false);
              setIsVoiceCallOpen(false); // Also close voice call modal
              setIncomingCallData(null);
            }
          });
        } catch (error) {
          console.error('❌ GUARANTEED: WebRTC initialization failed after all retries for user:', connectedUserId, error);
          // Don't set flag to true on failure
        }
      };
      
      // Remove backup initialization to prevent infinite loops

    // Listen for new messages
    socketConnection.on('new_message', (data) => {
      console.log('🔔 MESSENGER: New message received via Socket.IO:', data);
      console.log('🔔 MESSENGER: Current user ID:', connectedUserId);
      console.log('🔔 MESSENGER: Selected conversation:', selectedConversation);
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
      
      // Show notification for new messages from other users
      if (data.senderId !== connectedUserId && data.senderName) {
        // Check if the conversation is currently open by checking if ChatWindow is rendered for this conversation
        const chatWindow = document.querySelector(`[data-conversation-id="${data.conversationId}"]`);
        const isConversationOpen = !!chatWindow;
        console.log('🔔 Notification check:', {
          isConversationOpen,
          shouldShowNotification: !isConversationOpen,
          conversationId: data.conversationId,
          isConversationOpenByDom: !!chatWindow,
          dataConversationId: data.conversationId
        });
        
        // Only mark conversation as unread AND show notification if conversation is NOT currently open
        if (!isConversationOpen) {
          // Mark conversation as having unread messages (for visual highlighting)
          setActiveToasts(prev => new Map(prev.set(data.conversationId, 'unread')));
          // Dismiss any existing toast for this conversation
          const existingToastId = activeToasts.get(data.conversationId);
          if (existingToastId && existingToastId !== 'unread') {
            dismiss(existingToastId);
          }
          
          // Create new toast notification - entire toast is clickable
          const newToast = toast({
            title: `New message from ${data.senderName}`,
            description: data.content ? data.content.substring(0, 100) + (data.content.length > 100 ? '...' : '') : 'New message received',
            duration: 4500,
            onClick: () => {
              console.log('🖱️ Toast notification clicked - opening conversation:', data.conversationId);
              // Dismiss this toast with fade animation
              dismiss(newToast.id);
              setSelectedConversation(parseInt(data.conversationId));
              // Clear notifications for this conversation since user is now viewing it
              clearNotificationsForConversation(data.conversationId);
            }
          });
          
          console.log('📱 Toast notification shown and conversation marked as unread:', data.conversationId);
        } else {
          console.log('🔇 No notification or highlighting - conversation is currently open and user can see messages in real-time');
        }
      }
    });

    // Listen for instant notifications from server
    socketConnection.on('instant-notification', (data: {
      type: 'message' | 'call' | 'transaction';
      title: string;
      body: string;
      conversationId?: string;
      messageId?: string;
      fromUserId?: string;
      fromUserName?: string;
      timestamp: string;
    }) => {
      console.log('📱 MESSENGER: Instant notification received:', data);
      
      // Show toast notification immediately - entire toast is clickable
      const newToast = toast({
        title: data.title,
        description: data.body,
        duration: 4500, // Show for 4.5 seconds
        onClick: data.conversationId ? () => {
          console.log('🖱️ Instant notification clicked - opening conversation:', data.conversationId);
          // Dismiss this toast with fade animation
          dismiss(newToast.id);
          setSelectedConversation(parseInt(data.conversationId!));
          // Clear notifications for this conversation since user is now viewing it
          clearNotificationsForConversation(data.conversationId!);
        } : undefined
      });
      
      // If this is a message notification, track it for conversation unread indicator
      if (data.type === 'message' && data.conversationId) {
        setActiveToasts(prev => new Map(prev.set(data.conversationId!, newToast.id)));
        
        // Clean up toast reference when it expires
        setTimeout(() => {
          setActiveToasts(prev => {
            const newMap = new Map(prev);
            if (data.conversationId) {
              newMap.delete(data.conversationId!);
            }
            return newMap;
          });
        }, 5000);
      }
      
      // Also trigger browser notification if available
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(data.title, {
          body: data.body,
          icon: '/generated-icon.png',
          tag: `coyn-instant-${data.type}-${data.conversationId || 'general'}`,
          requireInteraction: false,
          silent: false
        });
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

    // Handle disconnect event
    socketConnection.on('disconnect', () => {
      console.log('Socket disconnected');
      setSocketConnected(false);
    });

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up socket connection');
      socketConnection.disconnect();
      setSocket(null);
      setSocketConnected(false);
      if (globalWebRTCInitialized) {
        cleanupGlobalWebRTC();
        setGlobalWebRTCInitialized(false);
      }
    };
  }, [connectedUserId, socket, socketConnected]); // Include socket state to prevent duplicates

  // Separate effect to join conversation rooms when conversations are loaded
  useEffect(() => {
    if (!socket || !conversations || conversations.length === 0) return;

    console.log('🏠 CONVERSATIONS LOADED: Joining rooms for loaded conversations:', {
      conversationsCount: conversations.length,
      conversations: conversations.map(c => c.id)
    });

    // Join all conversation rooms
    conversations.forEach(conversation => {
      console.log('🏠 CONVERSATIONS LOADED: Joining room for conversation:', conversation.id);
      socket.emit('join-conversation', { 
        conversationId: conversation.id.toString() 
      });
    });

  }, [socket, conversations]); // Trigger when socket is connected AND conversations are loaded

  return (
    <div className="flex h-screen watercolor-bg bg-background text-foreground relative">
      {/* Watercolor Background Overlay */}
      <div className="absolute inset-0 watercolor-overlay dark:watercolor-overlay-dark -z-10"></div>
      
      {/* Hidden audio element for incoming call ringtone */}
      <audio 
        id="incoming-call-ringtone" 
        preload="none" 
        loop
        style={{ display: 'none' }}
      >
        {/* Use data URL for a simple ringtone sound */}
        <source src="data:audio/mpeg;base64," type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
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
                {...({ fetchpriority: "high" } as any)}
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
              <div data-conversation-id={selectedConversation}>
                <ChatWindow
                  conversation={currentConversation}
                  onToggleSidebar={() => {}}
                  onBack={() => setSelectedConversation(null)}
                  searchQuery={searchQuery}
                  onSearchQueryChange={setSearchQuery}
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col bg-background">


                {/* Contact List First - Main Focus */}
                <div className="flex-1 overflow-auto">


                  {/* Existing Conversations - Secondary Display */}
                  {filteredConversations.length > 0 && (
                    <div>
                      <div className="divide-y divide-border">
                        {filteredConversations.map((conversation) => {
                          // Check if this conversation has unread messages (highlighted until opened)
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
                            {...({ fetchpriority: "high" } as any)}
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
                                  {...({ fetchpriority: "high" } as any)}
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
                  {...({ fetchpriority: "high" } as any)}
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
                          {...({ fetchpriority: "high" } as any)}
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
      {/* Voice Call Modal */}
      <VoiceCallModal
        isOpen={isVoiceCallOpen}
        onClose={() => {
          console.log('🎙️ Voice call modal closing');
          setIsVoiceCallOpen(false);
          setIncomingCallData(null);
        }}
        user={
          incomingCallData && incomingCallData.type === 'voice'
            ? allUsers.find(u => u.id.toString() === incomingCallData.fromUserId) ||
              { 
                id: parseInt(incomingCallData.fromUserId), 
                displayName: `User ${incomingCallData.fromUserId}`,
                signInName: `user_${incomingCallData.fromUserId}`,
                username: `user_${incomingCallData.fromUserId}`,
                walletAddress: `0x...${incomingCallData.fromUserId}`,
                profilePicture: null,
                isOnline: null,
                isSetup: null,
                lastSeen: null,
                fullName: null,
                addressLine1: null,
                addressLine2: null,
                city: null,
                state: null,
                zipCode: null,
                country: null
              }
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
      
      {/* Video Call Modal - Enhanced debugging */}
      <VideoCallModal
        isOpen={isVideoCallOpen}
        onClose={() => {
          console.log('📹 Video call modal closing');
          setIsVideoCallOpen(false);
          setIncomingCallData(null);
        }}
        user={
          incomingCallData && incomingCallData.type === 'video'
            ? allUsers.find(u => u.id.toString() === incomingCallData.fromUserId) ||
              { 
                id: parseInt(incomingCallData.fromUserId), 
                displayName: `User ${incomingCallData.fromUserId}`,
                signInName: `user_${incomingCallData.fromUserId}`,
                username: `user_${incomingCallData.fromUserId}`,
                walletAddress: `0x...${incomingCallData.fromUserId}`,
                profilePicture: null,
                isOnline: null,
                isSetup: null,
                lastSeen: null,
                fullName: null,
                addressLine1: null,
                addressLine2: null,
                city: null,
                state: null,
                zipCode: null,
                country: null
              }
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
