import React, { useState, useRef, useEffect, startTransition } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { notificationService } from "@/lib/notification-service";
import { io, Socket } from "socket.io-client";

import ShareModal from "@/components/share-modal";
import UserProfileModal from "@/components/user-profile-modal";
import VoiceCallModal from "@/components/voice-call-modal";
import VideoCallModal from "@/components/video-call-modal";
import ImagePreviewModal from "@/components/image-preview-modal";
import { EmojiPicker } from "@/components/emoji-picker";
import { GifPicker } from "@/components/gif-picker";

import { CryptoSender } from "@/components/crypto-sender";
import { walletConnector } from "@/lib/wallet-connector";

import type { User, Conversation, Message, WalletBalance } from "@shared/schema";
import { ArrowLeft, Phone, Video, MoreVertical, Plus, Send, Smile, X, Coins, Trash2, Home, ArrowUp, ArrowDown, Reply, Share, Users, Copy, Star, Forward, MoreHorizontal, Image, Paperclip, FileText, File, Download, ChevronUp, ChevronDown } from "lucide-react";
import { SiBinance, SiTether } from "react-icons/si";
import { UserAvatarIcon } from "@/components/ui/user-avatar-icon";
import coynLogoPath from "@assets/COYN-symbol-square_1750891892214.png";
import { formatDistanceToNow } from "date-fns";

// Utility function to get effective display name (mirrors backend logic)
function getEffectiveDisplayName(user: User): string {
  // Priority: 1. Profile display name (most recent), 2. Sign-in name, 3. @id format
  if (user.displayName && !user.displayName.startsWith('@')) {
    return user.displayName;
  }
  if (user.signInName) {
    return user.signInName;
  }
  // Fallback to @id format using last 6 characters of wallet address
  if (user.walletAddress) {
    return `@${user.walletAddress.slice(-6)}`;
  }
  // Ultimate fallback
  return user.displayName || user.username;
}

interface ChatWindowProps {
  conversation: Conversation & { otherUser: User };
  onToggleSidebar: () => void;
  onBack?: () => void;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  searchResults?: any[];
  onSearchResultsChange?: (results: any[]) => void;
  currentSearchIndex?: number;
  onCurrentSearchIndexChange?: (index: number) => void;
  searchResultCount?: number;
  onSearchResultCountChange?: (count: number) => void;
  isSearching?: boolean;
  onIsSearchingChange?: (searching: boolean) => void;
}

export default function ChatWindow({ 
  conversation, 
  onToggleSidebar, 
  onBack, 
  searchQuery, 
  onSearchQueryChange,
  searchResults: externalSearchResults,
  onSearchResultsChange,
  currentSearchIndex: externalCurrentSearchIndex,
  onCurrentSearchIndexChange,
  searchResultCount: externalSearchResultCount,
  onSearchResultCountChange,
  isSearching: externalIsSearching,
  onIsSearchingChange
}: ChatWindowProps) {
  const [, setLocation] = useLocation();
  const [message, setMessage] = useState("");
  const [showCryptoSend, setShowCryptoSend] = useState(false);
  const [cryptoAmount, setCryptoAmount] = useState("");
  const [selectedCrypto, setSelectedCrypto] = useState<string>("");
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const [cryptoStep, setCryptoStep] = useState<"amount" | "confirm">("amount");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  
  // Get queryClient instance
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get connected user ID from localStorage
  const getConnectedUserId = () => {
    const storedUser = localStorage.getItem('connectedUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        return parsedUser.id;
      } catch (e) {
        
      }
    }
    return null;
  };

  const connectedUserId = getConnectedUserId();
  
  // Check if this is a self-conversation (messaging yourself)
  const isSelfConversation = connectedUserId === conversation.otherUser.id;

  // Query for connected user data to get current display name
  const { data: connectedUser } = useQuery<User>({
    queryKey: ["/api/user", connectedUserId],
    queryFn: async () => {
      if (!connectedUserId) return null;
      const response = await fetch(`/api/user?userId=${connectedUserId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch connected user');
      }
      return response.json();
    },
    enabled: !!connectedUserId,
  });

  // Query for wallet balances to enable Max button functionality
  const { data: walletBalances = [] } = useQuery<WalletBalance[]>({
    queryKey: ["/api/wallet/balances", connectedUserId],
    queryFn: async () => {
      if (!connectedUserId) return [];
      const response = await fetch(`/api/wallet/balances?userId=${connectedUserId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch wallet balances');
      }
      return response.json();
    },
    enabled: !!connectedUserId,
  });

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageVideoInputRef = useRef<HTMLInputElement>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<Set<number>>(new Set());
  const [showShareModal, setShowShareModal] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  // Use external search result count state when provided, otherwise use local state
  const [localSearchResultCount, setLocalSearchResultCount] = useState(0);
  const searchResultCount = externalSearchResultCount ?? localSearchResultCount;
  const setSearchResultCount = onSearchResultCountChange ?? setLocalSearchResultCount;
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [showFilePickerModal, setShowFilePickerModal] = useState(false);

  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [contextMenuMessage, setContextMenuMessage] = useState<Message | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    name?: string;
    size?: number;
  } | null>(null);
  // Use external search state when provided, otherwise use local state
  const [localCurrentSearchIndex, setLocalCurrentSearchIndex] = useState(0);
  const [localSearchResults, setLocalSearchResults] = useState<Message[]>([]);
  const [localIsSearching, setLocalIsSearching] = useState(false);
  
  const currentSearchIndex = externalCurrentSearchIndex ?? localCurrentSearchIndex;
  const setCurrentSearchIndex = onCurrentSearchIndexChange ?? setLocalCurrentSearchIndex;
  const searchResults = (externalSearchResults ?? localSearchResults) as Message[];
  const setSearchResults = onSearchResultsChange ?? setLocalSearchResults;
  const isSearching = externalIsSearching ?? localIsSearching;
  const setIsSearching = onIsSearchingChange ?? setLocalIsSearching;
  const [swipeState, setSwipeState] = useState<{
    messageId: number | null;
    offsetX: number;
    isDragging: boolean;
    showReply: boolean;
    startX: number;
  }>({
    messageId: null,
    offsetX: 0,
    isDragging: false,
    showReply: false,
    startX: 0
  });
  
  const [replyToMessage, setReplyToMessage] = useState<{
    id: number;
    content: string;
    sender: string;
  } | null>(null);
  
  // Add call debouncing state
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);

  // Socket.IO state for real-time messaging
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  
  // Add global mouse event listeners for swipe functionality
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (swipeState.isDragging) {
        e.preventDefault();
        handleSwipeMove(e as any);
      }
    };

    const handleGlobalMouseUp = () => {
      if (swipeState.isDragging) {
        handleSwipeEnd();
      }
    };

    if (swipeState.isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [swipeState.isDragging]); // Only depend on the boolean property, not the entire object

  // Socket.IO connection for real-time messaging
  useEffect(() => {
    if (!connectedUserId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socketUrl = `${protocol}//${window.location.host}`;
    
    const newSocket = io(socketUrl, {
      transports: ['websocket'],
      forceNew: true,
      path: '/socket.io/',
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 10000,
    });
    
    setSocket(newSocket);

    // Handle connection events
    newSocket.on('connect', () => {
      setIsConnected(true);
      
      // Join the conversation room
      newSocket.emit('join-conversation', { 
        conversationId: conversation.id.toString() 
      });
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      setIsConnected(true);
      
      // Rejoin the conversation room after reconnection
      newSocket.emit('join-conversation', { 
        conversationId: conversation.id.toString() 
      });
    });

    newSocket.on('reconnect_error', (error) => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      setIsConnected(false);
    });

    // Handle new messages from other users
    newSocket.on('new-message', (data: {
      conversationId: string;
      message: Message & { sender: User };
      timestamp: string;
    }) => {
      // Update conversations list to show new message and embolden
      queryClient.invalidateQueries({ 
        queryKey: ["/api/conversations"] 
      });
      
      // If it's for this conversation, update messages instantly
      if (data.conversationId === conversation.id.toString()) {
        // Add message immediately to cache for instant display
        const currentMessages = queryClient.getQueryData<(Message & { sender: User })[]>(
          ["/api/conversations", conversation.id, "messages"]
        ) || [];
        
        // Check if message already exists to avoid duplicates
        const messageExists = currentMessages.some(msg => msg.id === data.message.id);
        if (!messageExists) {
          queryClient.setQueryData<(Message & { sender: User })[]>(
            ["/api/conversations", conversation.id, "messages"],
            [...currentMessages, data.message]
          );
        }
        
        // Auto-scroll to bottom for new messages
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }
    });

    // Handle instant notifications
    newSocket.on('instant-notification', (notification: {
      type: 'message' | 'call' | 'transaction';
      title: string;
      body: string;
      conversationId?: string;
      messageId?: string;
      fromUserId?: string;
      fromUserName?: string;
      timestamp: string;
    }) => {
      
      // Show browser notification if supported
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.body,
          icon: '/favicon.ico',
          badge: '/favicon.ico'
        });
      }
      
      // Show toast notification
      toast({
        title: notification.title,
        description: notification.body,
        duration: 3000,
      });
    });

    // Cleanup on unmount
    return () => {

      newSocket.emit('leave-conversation', { 
        conversationId: conversation.id.toString() 
      });
      newSocket.disconnect();
    };
  }, [connectedUserId, conversation.id, toast]);

  // Mobile keyboard detection for intuitive input bar rising
  useEffect(() => {
    const handleViewportChange = () => {
      if (window.innerHeight && window.visualViewport) {
        const heightDiff = window.innerHeight - window.visualViewport.height;
        const isKeyboard = heightDiff > 150; // threshold for keyboard detection
        
        setKeyboardHeight(heightDiff);
        setIsKeyboardOpen(isKeyboard);
        
        // Apply mobile keyboard aware class to main container
        const mainContainer = document.querySelector('.chat-container');
        if (mainContainer) {
          if (isKeyboard) {
            mainContainer.classList.add('keyboard-open');
            // Auto-scroll to bottom when keyboard opens
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          } else {
            mainContainer.classList.remove('keyboard-open');
          }
        }
        
        // Apply proper viewport unit (dvh) for mobile
        if (isKeyboard) {
          document.documentElement.style.setProperty('--vh', `${window.visualViewport.height * 0.01}px`);
        } else {
          document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        }
      }
    };

    // Listen for visual viewport changes (mobile keyboard opening/closing)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
    }

    // Fallback for older browsers
    window.addEventListener('resize', handleViewportChange);
    
    // Initial check
    handleViewportChange();

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      }
      window.removeEventListener('resize', handleViewportChange);
    };
  }, []);


  
  // Delete contact mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (userId: number) => {
      // Get current user ID from localStorage
      const storedUser = localStorage.getItem('connectedUser');
      let currentUserId = 5; // fallback
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          currentUserId = parsedUser.id;
        } catch (e) {
          // Use fallback user ID
        }
      }
      
      return apiRequest("DELETE", `/api/conversations/${conversation.id}`, { currentUserId });
    },
    onSuccess: () => {
      toast({
        title: "Contact deleted",
        description: "Contact has been removed successfully",
        duration: 3000,
      });
      // Invalidate multiple related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.removeQueries({ queryKey: ["/api/conversations", conversation.id] });
      
      // Navigate back to contact list
      if (onBack) {
        onBack();
      }
    },
    onError: (error) => {
      
      toast({
        title: "Error",
        description: "Failed to delete contact. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  });



  // File upload function
  const uploadFile = async (file: File, textContent?: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (textContent?.trim()) {
        formData.append('content', textContent.trim());
      }
      // Include the current connected user's ID as the sender
      formData.append('senderId', connectedUserId.toString());

      const response = await fetch(`/api/conversations/${conversation.id}/messages/attachment`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      // Refresh messages to show the new attachment
      queryClient.invalidateQueries({ 
        queryKey: ["/api/conversations", conversation.id, "messages"] 
      });

      toast({
        title: "File uploaded",
        description: "Your file has been sent successfully",
        duration: 2000,
      });

    } catch (error) {
      
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  // File upload handlers
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Show loading toast
      toast({
        title: "Uploading file...",
        description: "Please wait while we upload your file",
        duration: 1000,
      });
      
      // Upload file immediately
      await uploadFile(file, message);
      // Reset file input and message
      event.target.value = '';
      setMessage('');
    }
  };

  const triggerFileUpload = () => {
    // Add a small delay to ensure dropdown closes first
    setTimeout(() => {
      if (fileInputRef.current) {
        // Reset the input first
        fileInputRef.current.value = '';
        fileInputRef.current.click();
      }
    }, 150);
  };

  const triggerImageVideoUpload = () => {
    // Add a small delay to ensure dropdown closes first
    setTimeout(() => {
      if (imageVideoInputRef.current) {
        // Reset the input first
        imageVideoInputRef.current.value = '';
        imageVideoInputRef.current.click();
      }
    }, 150);
  };

  const handleImageVideoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Show loading toast
      toast({
        title: "Uploading media...",
        description: "Please wait while we upload your photo or video",
        duration: 1000,
      });
      
      // Upload file immediately
      await uploadFile(file, message);
      // Reset file input and message
      event.target.value = '';
      setMessage('');
    }
  };

  // Analyze conversation context to suggest relevant GIFs
  const getContextualGifs = () => {
    const recentMessages = messages.slice(-5); // Last 5 messages
    const messageText = recentMessages
      .filter(m => m.content)
      .map(m => m.content!.toLowerCase())
      .join(' ');
    
    // Keywords that trigger specific GIF categories
    const contextKeywords = {
      celebration: ['congrats', 'celebration', 'party', 'awesome', 'great', 'amazing', 'win', 'success', 'good job', 'well done', 'fantastic', 'excellent'],
      reactions: ['wow', 'omg', 'shocked', 'surprised', 'love', 'heart', 'like', 'funny', 'lol', 'haha', 'laugh'],
      trending: ['hello', 'hi', 'thanks', 'thank you', 'bye', 'goodbye', 'see you', 'good morning', 'good night']
    };
    
    // Check which category has the most keyword matches
    let bestCategory = 'trending';
    let maxMatches = 0;
    
    Object.entries(contextKeywords).forEach(([category, keywords]) => {
      const matches = keywords.filter(keyword => messageText.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestCategory = category;
      }
    });
    
    return []; // Simplified for modular component
  };

  // GIF filtering moved to modular component

  // Cryptocurrency icon helper function with optimized rendering
  const getCryptoIcon = (crypto: string) => {
    switch (crypto) {
      case 'BNB':
        return <SiBinance className="w-5 h-5 text-yellow-500" />;
      case 'USDT':
        return <SiTether className="w-5 h-5 text-green-500" />;
      case 'COYN':
        return (
          <img 
            src={coynLogoPath} 
            alt="COYN" 
            className="w-5 h-5" 
            loading="eager"
            decoding="async"
            style={{ imageRendering: 'auto' }}
          />
        );
      default:
        return <Coins className="w-5 h-5" />;
    }
  };

  // Emoji functionality moved to modular component

  const { data: messages = [], isLoading: messagesLoading, error: messagesError } = useQuery<(Message & { sender: User })[]>({
    queryKey: ["/api/conversations", conversation.id, "messages"],
    queryFn: async () => {

      const res = await fetch(`/api/conversations/${conversation.id}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();

      return data;
    },
    refetchInterval: 2000, // Optimized refetch interval for better performance
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Track previous message count for notification triggering
  const [previousMessageCount, setPreviousMessageCount] = useState(0);

  // Monitor new messages and trigger notifications
  useEffect(() => {
    if (messages.length > previousMessageCount && previousMessageCount > 0) {
      // Get the newest messages since last count
      const newMessages = messages.slice(previousMessageCount);
      
      newMessages.forEach(message => {
        // Only show notifications for messages not sent by current user
        if (message.senderId !== connectedUserId) {
          const senderName = getEffectiveDisplayName(message.sender);
          
          // Determine message type and content for notification
          let content = message.content || '';
          let messageType: 'text' | 'crypto_transfer' | 'product_share' = 'text';
          
          if (message.messageType === 'crypto_transfer') {
            messageType = 'crypto_transfer';
            content = `Sent ${message.cryptoAmount} ${message.cryptoCurrency}`;
          } else if (message.messageType === 'product_share') {
            messageType = 'product_share';
            content = message.productTitle || 'Shared a product';
          }
          
          // Trigger notification
          notificationService.showMessageNotification(
            senderName,
            content,
            conversation.id.toString(),
            messageType
          );
        }
      });
    }
    
    setPreviousMessageCount(messages.length);
  }, [messages, connectedUserId, conversation.id, previousMessageCount]);



  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { content: string; messageType: string }) => {
      console.log("📡 Starting send message mutation");
      console.log("- Message data:", messageData);
      console.log("- Connected user ID:", connectedUserId);
      
      if (!connectedUserId) {
        console.log("❌ User not authenticated - missing connectedUserId");
        throw new Error("User not authenticated");
      }
      
      // Enhanced error handling with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      try {
        const requestBody = {
          ...messageData,
          senderId: connectedUserId
        };
        

        
        console.log("📡 Making fetch request to:", `/api/conversations/${conversation.id}/messages`);
        console.log("📡 Request body:", requestBody);
        
        const response = await fetch(`/api/conversations/${conversation.id}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        console.log("📡 Response status:", response.status);
        console.log("📡 Response ok:", response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log("❌ Server error response:", errorText);
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log("✅ Message sent successfully:", result);
        return result;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error("Request timed out");
        }
        throw error as Error;
      }
    },
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 10000), // Exponential backoff with max 10s
    onMutate: async (variables) => {
      // Optimistic update for instant UI feedback
      await queryClient.cancelQueries({ 
        queryKey: ["/api/conversations", conversation.id, "messages"] 
      });
      
      // Get current messages
      const previousMessages = queryClient.getQueryData<(Message & { sender: User })[]>(
        ["/api/conversations", conversation.id, "messages"]
      ) ?? [];
      
      // Create optimistic message
      const optimisticMessage = {
        id: Date.now(), // Temporary ID
        conversationId: conversation.id,
        senderId: connectedUserId,
        content: variables.content,
        messageType: variables.messageType,
        timestamp: new Date(),
        sender: connectedUser || { 
          id: connectedUserId, 
          displayName: 'You', 
          username: 'you',
          signInName: null,
          walletAddress: '',
          profilePicture: null,
          isOnline: null,
          isSetup: null,
          fullName: null,
          addressLine1: null,
          addressLine2: null,
          city: null,
          state: null,
          zipCode: null,
          country: null,
          lastSeen: null
        },
        cryptoAmount: null,
        cryptoCurrency: null,
        attachmentUrl: null,
        attachmentType: null,
        attachmentName: null,
        attachmentSize: null,
        audioFilePath: null,
        transcription: null,
        audioDuration: null,
        productId: null,
        productTitle: null,
        productPrice: null,
        productImage: null,
        gifUrl: null,
        gifTitle: null,
        gifId: null,
        transactionHash: null
      };
      
      // Add optimistic message to cache
      queryClient.setQueryData<(Message & { sender: User })[]>(
        ["/api/conversations", conversation.id, "messages"],
        old => [...(old || []), { ...optimisticMessage, isStarred: false }]
      );
      
      // Auto-scroll to bottom for new message
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
      
      return { previousMessages };
    },
    onSuccess: (data) => {
      // Invalidate and refetch messages to get server response
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversation.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setMessage("");
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["/api/conversations", conversation.id, "messages"],
          context.previousMessages
        );
      }
      

      
      // Show specific error messages based on error type
      let errorMessage = "Please try again.";
      let errorTitle = "Failed to send message";
      
      if (error.message.includes("timeout") || error.message.includes("timed out")) {
        errorMessage = "Request timed out. Please check your connection and try again.";
        errorTitle = "Connection timeout";
      } else if (error.message.includes("Server error: 5")) {
        errorMessage = "Server is temporarily unavailable. Please try again in a moment.";
        errorTitle = "Server error";
      } else if (error.message.includes("User not authenticated")) {
        errorMessage = "Please refresh the page and sign in again.";
        errorTitle = "Authentication error";
      } else if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
        errorMessage = "Network error. Please check your internet connection.";
        errorTitle = "Connection error";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const sendCryptoMutation = useMutation({
    mutationFn: async (cryptoData: { toUserId: number; currency: string; amount: string; conversationId?: number }) => {
      // For BNB, USDT, and COYN, perform real blockchain transactions
      if (cryptoData.currency === 'BNB' || cryptoData.currency === 'USDT' || cryptoData.currency === 'COYN') {
        // Get recipient user wallet address from conversation data
        const recipientAddress = conversation.otherUser.walletAddress;
        if (!recipientAddress) {
          throw new Error('Recipient wallet address not found');
        }
        
        // Validate recipient address format for BSC tokens
        if (!recipientAddress.startsWith('0x') || recipientAddress.length !== 42) {
          throw new Error(`Invalid recipient ${cryptoData.currency} address format`);
        }
        
        try {
          console.log(`🔴 Initiating ${cryptoData.currency} blockchain transaction`);
          console.log(`To: ${recipientAddress}`);
          console.log(`Amount: ${cryptoData.amount} ${cryptoData.currency}`);
          
          // Connect wallet if not already connected
          if (!walletConnector.isConnected()) {
            console.log('🔗 Connecting to wallet...');
            await walletConnector.connectWallet();
          }
          
          // Send transaction based on currency type
          let txResult;
          if (cryptoData.currency === 'BNB') {
            txResult = await walletConnector.sendBNB(recipientAddress, cryptoData.amount);
          } else if (cryptoData.currency === 'USDT') {
            txResult = await walletConnector.sendUSDT(recipientAddress, cryptoData.amount);
          } else if (cryptoData.currency === 'COYN') {
            txResult = await walletConnector.sendCOYN(recipientAddress, cryptoData.amount);
          } else {
            throw new Error(`Unsupported currency: ${cryptoData.currency}`);
          }
          
          console.log(`✅ ${cryptoData.currency} transaction successful!`);
          console.log(`Transaction hash: ${txResult.hash}`);
          console.log(`From: ${txResult.from}`);
          console.log(`To: ${txResult.to}`);
          console.log(`Amount: ${txResult.value} ${cryptoData.currency}`);
          
          // Update backend with successful blockchain transaction
          return apiRequest("POST", "/api/wallet/send", {
            ...cryptoData,
            fromUserId: connectedUserId,
            transactionHash: txResult.hash,
            senderAddress: txResult.from,
            recipientAddress: txResult.to,
            isBlockchainTransaction: true
          });
          
        } catch (txError: any) {
          console.error(`❌ ${cryptoData.currency} transaction failed:`, txError);
          
          // If user rejected or specific wallet issues, provide clear feedback
          if (txError.message.includes('rejected') || txError.message.includes('cancelled')) {
            throw new Error(`${cryptoData.currency} transaction was cancelled by user`);
          } else if (txError.message.includes('Insufficient')) {
            throw new Error(`Insufficient ${cryptoData.currency} balance for transaction and gas fees`);
          } else if (txError.message.includes('No Web3 wallet')) {
            throw new Error(`Please install MetaMask or Trust Wallet to send ${cryptoData.currency}`);
          } else {
            throw new Error(`${cryptoData.currency} transaction failed: ${txError.message}`);
          }
        }
      } else {
        // For other currencies, use internal transfer
        return apiRequest("POST", "/api/wallet/send", {
          ...cryptoData,
          fromUserId: connectedUserId
        });
      }
    },
    onSuccess: async (data, variables) => {
      // Use startTransition to prevent blocking video call modal renders
      startTransition(() => {
        setCryptoAmount("");
        setSelectedCrypto("");
        setShowCryptoModal(false);
        setCryptoStep("amount");
      });
      
      // Defer query invalidations to prevent video call interference
      setTimeout(() => {
        startTransition(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversation.id, "messages"] });
          queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
          queryClient.invalidateQueries({ queryKey: ["/api/wallet/balances", connectedUserId] });
        });
      }, 150);
      
      const successMessage = variables.currency === 'BNB' 
        ? `${variables.amount} ${variables.currency} sent via blockchain to ${conversation.otherUser?.displayName || "Unknown User"}`
        : `${variables.amount} ${variables.currency} sent to ${conversation.otherUser?.displayName || "Unknown User"}`;
      
      toast({
        title: variables.currency === 'BNB' ? "BNB Blockchain Transaction Completed" : "Crypto sent successfully",
        description: successMessage,
        duration: 5000
      });
      
      // Show transaction hash for BNB transactions
      if (variables.currency === 'BNB' && data?.transactionHash) {
        setTimeout(() => {
          toast({
            title: "Transaction Hash",
            description: `Hash: ${data.transactionHash}`,
            duration: 10000
          });
        }, 1000);
      }
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Please try again.";
      
      toast({
        title: "Failed to send crypto",
        description: errorMessage,
        variant: "destructive",
        duration: 8000 // Longer duration for important error messages
      });
      
      // If it's a wallet access issue, provide additional help
      if (errorMessage.includes('iframe') || errorMessage.includes('frames') || errorMessage.includes('new tab')) {
        setTimeout(() => {
          toast({
            title: "💡 Tip",
            description: "Copy this URL and paste it in a new browser tab for full wallet access.",
            duration: 10000
          });
        }, 2000);
      }
    },
  });

  const leaveGroupMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/groups/${conversation.id}/leave`);
    },
    onSuccess: () => {
      toast({
        title: "Left group",
        description: "You have successfully left the group",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      onBack?.(); // Go back to conversation list
    },
    onError: () => {
      toast({
        title: "Failed to leave group",
        description: "Please try again",
        variant: "destructive"
      });
    }
  });

  // Handle crypto button clicks
  const handleCryptoClick = (currency: string) => {
    setSelectedCrypto(currency);
    setShowCryptoModal(true);
    setCryptoStep("amount");
    setCryptoAmount("");
  };

  // Handle amount confirmation
  const handleAmountConfirm = () => {
    if (!cryptoAmount || parseFloat(cryptoAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }
    setCryptoStep("confirm");
  };

  // Handle final send confirmation
  const handleSendConfirm = () => {
    if (!connectedUserId) {
      toast({
        title: "Authentication Error",
        description: "Please log in to send cryptocurrency",
        variant: "destructive",
      });
      return;
    }
    
    sendCryptoMutation.mutate({
      toUserId: conversation.otherUser.id,
      currency: selectedCrypto,
      amount: cryptoAmount,
      conversationId: conversation.id,
    });
  };

  // Handle max button click
  const handleMaxClick = () => {
    // Fetch real wallet balance from COYN Wallet data
    const currentBalance = walletBalances?.find(balance => balance.currency === selectedCrypto);
    const maxAmount = currentBalance?.balance || "0";
    setCryptoAmount(maxAmount);
  };

  // Reset crypto modal
  const resetCryptoModal = () => {
    setShowCryptoModal(false);
    setCryptoStep("amount");
    setCryptoAmount("");
    setSelectedCrypto("");
  };

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest("DELETE", `/api/messages/${messageId}`, { userId: connectedUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversation.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Message deleted",
        description: "Your message has been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to delete message",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    console.log("🔥 Send button clicked - Debug info:");
    console.log("- Message content:", message);
    console.log("- Message trimmed length:", message.trim().length);
    console.log("- Is pending:", sendMessageMutation.isPending);
    console.log("- Connected user ID:", connectedUserId);
    console.log("- Conversation ID:", conversation.id);
    
    if (!message.trim()) {
      console.log("❌ Message is empty or only whitespace");
      return;
    }

    // Haptic feedback for mobile devices
    if ('ontouchstart' in window && 'vibrate' in navigator) {
      navigator.vibrate(50); // Light vibration feedback
    }

    let messageContent = message;
    let replyData = null;
    
    // Store reply information for message display
    if (replyToMessage) {
      replyData = {
        replyToId: replyToMessage.id,
        replyToSender: replyToMessage.sender,
        replyToContent: replyToMessage.content
      };
      // Include reply context in message for backend
      messageContent = `@${replyToMessage.sender}: ${message}`;
    }

    console.log("✅ About to send message with content:", messageContent);
    console.log("✅ Mutation function exists:", !!sendMessageMutation.mutate);

    setIsSendingMessage(true);
    
    sendMessageMutation.mutate({
      content: messageContent,
      messageType: "text"
    }, {
      onSettled: () => {
        console.log("📤 Send message mutation settled");
        setIsSendingMessage(false);
      }
    });

    setMessage("");
    setReplyToMessage(null); // Clear reply state
    setShowEmojiPicker(false);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Swipe-to-reply handlers
  const handleSwipeStart = (e: React.TouchEvent | React.MouseEvent, messageId: number) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    // Swipe initiated
    setSwipeState({
      messageId,
      offsetX: 0,
      isDragging: true,
      showReply: false,
      startX: clientX
    });
  };

  const handleSwipeMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!swipeState.isDragging || !swipeState.messageId) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const deltaX = Math.max(0, clientX - swipeState.startX); // Only allow right swipes
    
    setSwipeState(prev => ({
      ...prev,
      offsetX: Math.min(deltaX, 150) // Limit maximum swipe distance
    }));
  };

  const handleSwipeEnd = () => {
    if (!swipeState.isDragging) return;

    if (swipeState.offsetX > 100) { // Increased threshold for less sensitive triggering
      // Trigger reply to message with haptic-like feedback
      const targetMessageId = swipeState.messageId;
      const message = messages.find(m => m.id === targetMessageId);
      // Reply triggered
      
      if (message && message.id === targetMessageId) {
        // Clear any existing reply state first
        setReplyToMessage(null);
        
        // Wait for state to clear then set new reply
        setTimeout(() => {
          // Check if this message is from the connected user, use current display name
          let effectiveName: string;
          if (connectedUserId && (message.sender as any)?.id === connectedUserId && connectedUser) {
            // Use current connected user's display name for their own messages
            effectiveName = getEffectiveDisplayName(connectedUser);
            
          } else {
            // Use the original sender's display name for other users' messages
            effectiveName = (message.sender as any).effectiveDisplayName || getEffectiveDisplayName(message.sender);
            
          }
          // Get appropriate content based on message type
          let replyContent = "Message content";
          if (message.messageType === "text") {
            replyContent = message.content || "Text message";
          } else if (message.messageType === "crypto") {
            replyContent = `${message.cryptoAmount} ${message.cryptoCurrency}`;
          } else if (message.messageType === "product_share") {
            replyContent = message.productTitle || message.content || "Shared product";
          } else if (message.messageType === "attachment") {
            replyContent = message.attachmentName || "File attachment";
          } else if (message.messageType === "gif") {
            replyContent = message.gifTitle || "GIF";
          } else {
            replyContent = message.content || "Message";
          }
          
          const newReplyData = {
            id: message.id,
            content: replyContent,
            sender: effectiveName
          };
          
          
          // Message details for debugging
          
          setReplyToMessage(newReplyData);
          
          // Add visual feedback similar to WhatsApp
          toast({
            title: "Replying to " + effectiveName,
            description: "Message ready for reply",
            duration: 1500,
          });
        }, 50);
      }
      // Reset swipe state with smooth animation
      
      setSwipeState({
        messageId: null,
        offsetX: 0,
        isDragging: false,
        showReply: false,
        startX: 0
      });
    } else {
      // Reset position with spring animation
      setSwipeState({
        messageId: null,
        offsetX: 0,
        isDragging: false,
        showReply: false,
        startX: 0
      });
    }
  };

  

  

  const handleImagePreview = (imageUrl: string, imageName?: string, imageSize?: number) => {
    setPreviewImage({ url: imageUrl, name: imageName, size: imageSize });
    setShowImagePreview(true);
  };

  // Message action handlers
  const handleCopyMessage = (message: Message) => {
    const textToCopy = message.content || `${message.cryptoAmount} ${message.cryptoCurrency}`;
    navigator.clipboard.writeText(textToCopy);
    toast({
      title: "Message copied",
      description: "Message copied to clipboard",
      duration: 1500,
    });
    setContextMenuMessage(null);
  };

  const starMessageMutation = useMutation({
    mutationFn: async ({ messageId, isStarred }: { messageId: number; isStarred: boolean }) => {
      const url = connectedUserId ? `/api/messages/${messageId}/star?userId=${connectedUserId}` : `/api/messages/${messageId}/star`;
      return apiRequest("PATCH", url, { isStarred });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversation.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/starred", connectedUserId] });
      
      toast({
        title: variables.isStarred ? "Message starred" : "Message unstarred",
        description: variables.isStarred ? "Message added to starred messages" : "Message removed from starred messages",
        duration: 1500,
      });
    },
    onError: (error) => {
      
      toast({
        title: "Failed to update star",
        description: "Please try again",
        variant: "destructive"
      });
    }
  });

  const handleStarMessage = (message: Message) => {
    const isCurrentlyStarred = message.isStarred || false;
    starMessageMutation.mutate({ 
      messageId: message.id, 
      isStarred: !isCurrentlyStarred 
    });
    setContextMenuMessage(null);
  };

  const handleForwardMessage = (message: Message) => {
    // Implement forward functionality
    setShowShareModal(true);
    setContextMenuMessage(null);
  };



  const deleteMessage = async (messageId: number) => {
    try {
      await apiRequest("DELETE", `/api/messages/${messageId}`, {
        userId: connectedUserId
      });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversation.id, "messages"] });
      toast({
        title: "Message deleted",
        description: "The message has been deleted",
        duration: 1500,
      });
    } catch (error) {
      toast({
        title: "Failed to delete message",
        description: "Please try again",
        variant: "destructive"
      });
    }
    setContextMenuMessage(null);
  };

  const handleReplyCancel = () => {
    
    setReplyToMessage(null);
  };

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent, message: Message) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuMessage(message);
  };

  const closeContextMenu = () => {
    setContextMenuMessage(null);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenuMessage) {
        closeContextMenu();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenuMessage]);

  const handleQuickSend = (currency: string) => {
    const amount = "0.01"; // Default quick send amount
    sendCryptoMutation.mutate({
      toUserId: conversation.otherUser.id,
      currency,
      amount,
      conversationId: conversation.id,
    });
  };

  const handleSendCrypto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cryptoAmount || parseFloat(cryptoAmount) <= 0) return;

    sendCryptoMutation.mutate({
      toUserId: conversation.otherUser.id,
      currency: "COYN",
      amount: cryptoAmount,
      conversationId: conversation.id,
    });
  };

  const formatTimestamp = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Show button if we have scrollable content and not at the very bottom
      const hasScrollableContent = scrollHeight > clientHeight + 10;
      const isNearBottom = scrollTop >= scrollHeight - clientHeight - 50;
      const shouldShow = hasScrollableContent && !isNearBottom;
      
      // Debug removed - scroll detection working correctly
      
      setShowBackToTop(shouldShow);
    };

    container.addEventListener('scroll', handleScroll);
    // Check initial scroll state
    handleScroll();
    return () => container.removeEventListener('scroll', handleScroll);
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Enhanced search functionality with fuzzy matching
  const performAdvancedSearch = (query: string, messageList: (Message & { sender: User })[]) => {
    if (!query || query.length < 1) return [];
    
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
    
    return messageList.filter(msg => {
      // Search in message content
      const content = (msg.content || '').toLowerCase();
      const senderName = getEffectiveDisplayName(msg.sender).toLowerCase();
      const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleDateString().toLowerCase() : '';
      
      // Advanced search criteria - build searchable text
      const searchParts = [content, senderName, timestamp];
      
      // Check if message contains attachment info
      if (msg.attachmentName) {
        searchParts.push(msg.attachmentName.toLowerCase());
      }
      
      // Check if message is crypto transaction
      if (msg.messageType === 'crypto' && msg.cryptoCurrency) {
        searchParts.push(`${msg.cryptoCurrency.toLowerCase()} crypto payment transaction`);
      }
      
      // Check if message is product share
      if (msg.messageType === 'product_share' && msg.productTitle) {
        searchParts.push(`${msg.productTitle.toLowerCase()} product`);
      }
      
      const searchableText = searchParts.join(' ');
      
      // Fuzzy search - match if any search term is found
      return searchTerms.some(term => {
        // Exact match
        if (searchableText.includes(term)) return true;
        
        // Partial word matching for better results
        return searchableText.split(/\s+/).some(word => 
          word.includes(term) || term.includes(word)
        );
      });
    });
  };

  // Enhanced text highlighting with multiple search terms
  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm || !text) return text;
    
    try {
      const searchTerms = searchTerm.split(/\s+/).filter(term => term.length > 0);
      if (searchTerms.length === 0) return text;
      
      // Create regex that matches any of the search terms
      const regexPattern = searchTerms
        .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');
      
      const regex = new RegExp(`(${regexPattern})`, 'gi');
      const parts = text.split(regex);
      
      return parts.map((part, index) => {
        const isMatch = searchTerms.some(term => 
          part.toLowerCase().includes(term.toLowerCase())
        );
        
        return isMatch ? (
          <mark key={`${searchTerm}-${index}-${part}`} className="search-result-container bg-blue-100 dark:bg-blue-500/30 text-blue-900 dark:text-blue-100 px-1 py-0.5 rounded font-medium border border-blue-200 dark:border-blue-400/30 inline-block max-w-fit">
            {part}
          </mark>
        ) : part;
      });
    } catch (error) {
      
      return text;
    }
  };

  // Navigation functions for search results
  const navigateToSearchResult = (index: number) => {
    if (searchResults.length === 0) return;
    
    const resultIndex = Math.max(0, Math.min(index, searchResults.length - 1));
    setCurrentSearchIndex(resultIndex);
    
    const message = searchResults[resultIndex];
    const messageId = message.id;
    
    // Force React to re-render and then navigate
    setTimeout(() => {
      // Clear any existing focus animations first
      document.querySelectorAll('.search-result-focus').forEach(el => {
        el.classList.remove('search-result-focus');
      });
      document.querySelectorAll('.search-highlight-pulse').forEach(el => {
        el.classList.remove('search-highlight-pulse');
      });
      
      // Try multiple strategies to find the message element
      let element = null;
      
      // Strategy 1: Look in the messages container
      const messagesContainer = messagesContainerRef.current;
      if (messagesContainer) {
        element = messagesContainer.querySelector(`[data-message-id="${messageId}"]`);
      }
      
      // Strategy 2: Global search
      if (!element) {
        element = document.querySelector(`[data-message-id="${messageId}"]`);
      }
      
      if (element) {
        // First, scroll to the message to get it in view
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
        
        // Wait for scroll to complete, then highlight ONLY the search terms
        setTimeout(() => {
          // Find and animate only the highlighted search terms (mark elements)
          const highlightElements = element.querySelectorAll('mark.search-result-container');
          
          if (highlightElements.length > 0) {
            // Focus on the first highlighted term and scroll it into perfect view
            const firstHighlight = highlightElements[0];
            
            // Scroll specifically to the highlighted search term itself
            setTimeout(() => {
              firstHighlight.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'center'
              });
            }, 200);
            
            // Animate ONLY the highlighted search terms with enhanced visibility
            highlightElements.forEach((mark, i) => {
              setTimeout(() => {
                // Enhanced highlighting just for the search term
                const element = mark as HTMLElement;
                element.style.backgroundColor = 'rgba(255, 215, 0, 0.9)'; // Gold background
                element.style.color = 'rgba(0, 0, 0, 0.9)'; // Dark text
                element.style.fontWeight = 'bold';
                element.style.transform = 'scale(1.15)';
                element.style.boxShadow = '0 0 12px rgba(255, 215, 0, 0.8)';
                element.style.border = '2px solid rgba(255, 140, 0, 0.8)';
                element.style.borderRadius = '4px';
                element.style.padding = '2px 4px';
                element.style.transition = 'all 0.3s ease';
                element.style.zIndex = '1000';
                element.style.position = 'relative';
                
                setTimeout(() => {
                  element.style.backgroundColor = '';
                  element.style.color = '';
                  element.style.fontWeight = '';
                  element.style.transform = '';
                  element.style.boxShadow = '';
                  element.style.border = '';
                  element.style.borderRadius = '';
                  element.style.padding = '';
                  element.style.zIndex = '';
                  element.style.position = '';
                }, 3000);
              }, i * 100);
            });
          }
        }, 600);
      }
    }, 100);
  };

  const goToNextResult = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    navigateToSearchResult(nextIndex);
  };

  const goToPreviousResult = () => {
    if (searchResults.length === 0) return;
    const prevIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1;
    navigateToSearchResult(prevIndex);
  };

  // Enhanced search effect with advanced functionality
  useEffect(() => {
    if (searchQuery && searchQuery.length >= 1 && messages?.length) {
      setIsSearching(true);
      
      // Debounce search for better performance
      const searchTimeout = setTimeout(() => {
        const results = performAdvancedSearch(searchQuery, messages);
        setSearchResults(results);
        setSearchResultCount(results.length);
        setCurrentSearchIndex(0);
        
        if (results.length > 0) {
          // Navigate to first result
          navigateToSearchResult(0);
        }
        
        setIsSearching(false);
      }, 200); // Reduced debounce for more responsive search
      
      return () => clearTimeout(searchTimeout);
    } else {
      setSearchResults([]);
      setSearchResultCount(0);
      setCurrentSearchIndex(0);
      setIsSearching(false);
      
      // Clean up any existing highlights when search is cleared
      try {
        const highlights = document.querySelectorAll('mark.search-result-container');
        highlights.forEach(mark => {
          if (mark && mark.parentNode && mark.parentNode.contains(mark)) {
            const parent = mark.parentNode;
            const textNode = document.createTextNode(mark.textContent || '');
            parent.replaceChild(textNode, mark);
          }
        });
      } catch (error) {
        
      }
    }
  }, [searchQuery, messages]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      try {
        const highlights = document.querySelectorAll('mark.search-result-container');
        highlights.forEach(mark => {
          if (mark && mark.parentNode && mark.parentNode.contains(mark)) {
            const parent = mark.parentNode;
            const textNode = document.createTextNode(mark.textContent || '');
            parent.replaceChild(textNode, mark);
          }
        });
      } catch (error) {
        
      }
    };
  }, []);

  // Keyboard shortcuts for search navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (searchQuery && searchResults.length > 0) {
        // Enter key - go to next result
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          goToNextResult();
        }
        // Shift+Enter - go to previous result
        else if (e.key === 'Enter' && e.shiftKey) {
          e.preventDefault();
          goToPreviousResult();
        }
        // Escape key - clear search (if implemented in parent)
        else if (e.key === 'Escape') {
          // This would need to be handled by the parent component
          // Can be extended to clear search
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery, searchResults]);


  return (
    <div className="flex flex-col h-screen bg-background chat-container">
      <div className="p-4 border-b">
        <h2>Chat Window - Loading...</h2>
        <p>Chat functionality is being restored.</p>
      </div>
    </div>
  );
}
