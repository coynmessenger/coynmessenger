import { useState, useRef, useEffect } from "react";
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

import ShareModal from "@/components/share-modal";
import UserProfileModal from "@/components/user-profile-modal";
import VoiceCallModal from "@/components/voice-call-modal";
import VideoCallModal from "@/components/video-call-modal";
import ImagePreviewModal from "@/components/image-preview-modal";
import type { User, Conversation, Message } from "@shared/schema";
import { ArrowLeft, Phone, Video, MoreVertical, Plus, Send, Smile, X, Coins, Trash2, Home, ArrowUp, ArrowDown, Reply, Share, Users, Copy, Star, Forward, MoreHorizontal, Image, Paperclip, FileText, File, Download, ChevronUp, ChevronDown } from "lucide-react";
import { FaBitcoin } from "react-icons/fa";
import { SiBinance, SiTether } from "react-icons/si";
import { UserAvatarIcon } from "@/components/ui/user-avatar-icon";
import coynLogoPath from "@assets/COYN-symbol-square_1750891892214.png";
import { formatDistanceToNow } from "date-fns";

// Utility function to get effective display name (mirrors backend logic)
function getEffectiveDisplayName(user: User): string {
  // Priority: 1. Sign-in name, 2. Profile display name, 3. @id format
  if (user.signInName) {
    return user.signInName;
  }
  if (user.displayName && !user.displayName.startsWith('@')) {
    return user.displayName;
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
}

export default function ChatWindow({ conversation, onToggleSidebar, onBack, searchQuery }: ChatWindowProps) {
  const [, setLocation] = useLocation();
  const [message, setMessage] = useState("");
  const [showCryptoSend, setShowCryptoSend] = useState(false);
  const [cryptoAmount, setCryptoAmount] = useState("");
  const [selectedCrypto, setSelectedCrypto] = useState<string>("");
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const [cryptoStep, setCryptoStep] = useState<"amount" | "confirm">("amount");

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearchQuery, setGifSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageVideoInputRef = useRef<HTMLInputElement>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<Set<number>>(new Set());
  const [showShareModal, setShowShareModal] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [searchResultCount, setSearchResultCount] = useState(0);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    name?: string;
    size?: number;
  } | null>(null);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
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

  // Message hover options state
  const [hoveredMessage, setHoveredMessage] = useState<number | null>(null);
  const [showMessageOptions, setShowMessageOptions] = useState<number | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [hoverLeaveTimer, setHoverLeaveTimer] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
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
  }, [swipeState.isDragging]);

  // Close message options when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMessageOptions && !(event.target as Element).closest('[data-message-options]')) {
        setShowMessageOptions(null);
      }
    };

    if (showMessageOptions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMessageOptions]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
      if (hoverLeaveTimer) {
        clearTimeout(hoverLeaveTimer);
      }
    };
  }, [longPressTimer, hoverLeaveTimer]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Popular emojis for quick access - organized by categories
  const emojiCategories = {
    faces: ["😀", "😂", "🤣", "😊", "😍", "🥰", "😘", "😎", "🤔", "😮", "😤", "😔", "🥺", "😭", "😱", "🤗"],
    gestures: ["👍", "👎", "👏", "🙏", "💪", "✌️", "🤝", "👋", "🤙", "👌", "🤞", "🙌", "👐", "🤲", "🫶", "👊"],
    hearts: ["❤️", "💙", "💚", "💛", "🧡", "💜", "🖤", "🤍", "🤎", "💗", "💖", "💕", "💓", "💘", "💯", "💋"],
    finance: ["💰", "💸", "🪙", "💎", "📈", "📉", "💳", "🏦", "🚀", "⚡", "🔥", "💯", "🎯", "⭐", "🌟", "🎉"],
    nature: ["🌞", "🌙", "⭐", "🌟", "☀️", "🌈", "🔥", "💧", "🌸", "🌺", "🌻", "🌹", "🍀", "🌿", "🌱", "🎄"],
    objects: ["🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "🎖️", "🏅", "⚽", "🏀", "🎯", "🎪", "🎭", "🎨", "🎵", "🎶"],
    food: ["🍕", "🍔", "🌮", "🍝", "🍜", "🍱", "🍣", "🧀", "🥓", "🍎", "🍌", "🍓", "🥑", "🍰", "🍦", "☕"],
    travel: ["✈️", "🚗", "🚢", "🏖️", "🏔️", "🗽", "🏛️", "🎡", "🎢", "🌍", "🗺️", "🧳", "📸", "🎒", "🏨", "🎫"]
  };

  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState<keyof typeof emojiCategories>("faces");

  // Mock GIF data with expanded contextual categories
  const mockGifs = {
    trending: [
      { id: 1, url: "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif", title: "Hello Wave" },
      { id: 2, url: "https://media.giphy.com/media/3o7TKF1fSIs1R19B8k/giphy.gif", title: "Thank You" },
      { id: 3, url: "https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif", title: "Good Morning" },
      { id: 4, url: "https://media.giphy.com/media/l0MYP6WAFfaR7Q1jO/giphy.gif", title: "Thumbs Up" },
      { id: 5, url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif", title: "Goodbye" },
      { id: 6, url: "https://media.giphy.com/media/l0HlPystfePnAI3G8/giphy.gif", title: "See You Later" }
    ],
    reactions: [
      { id: 7, url: "https://media.giphy.com/media/l0MYzxkg0o1tkGSaI/giphy.gif", title: "OMG Surprised" },
      { id: 8, url: "https://media.giphy.com/media/26tn6jEVRIelPhdJC/giphy.gif", title: "Mind Blown" },
      { id: 9, url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif", title: "Love Heart" },
      { id: 10, url: "https://media.giphy.com/media/l0MYzxkg0o1tkGSaI/giphy.gif", title: "LOL Laughing" },
      { id: 14, url: "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif", title: "Wow Amazing" },
      { id: 15, url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif", title: "Funny Reaction" }
    ],
    celebration: [
      { id: 11, url: "https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif", title: "Party Time" },
      { id: 12, url: "https://media.giphy.com/media/3o7TKF1fSIs1R19B8k/giphy.gif", title: "Success Dance" },
      { id: 13, url: "https://media.giphy.com/media/l0MYP6WAFfaR7Q1jO/giphy.gif", title: "Winner Champion" },
      { id: 16, url: "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif", title: "Congratulations" },
      { id: 17, url: "https://media.giphy.com/media/3o6fIShUdNpuOaWWha/giphy.gif", title: "Great Job" },
      { id: 18, url: "https://media.giphy.com/media/26u4lOMA8JKSnL9Uk/giphy.gif", title: "Awesome Win" }
    ]
  };

  const handleGifSelect = (gif: any) => {
    setMessage(prev => prev + ` [GIF: ${gif.title}] `);
    setShowGifPicker(false);
  };

  // File upload function
  const uploadFile = async (file: File, textContent?: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (textContent?.trim()) {
        formData.append('content', textContent.trim());
      }

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
      console.error('Upload error:', error);
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
      // Upload file immediately
      await uploadFile(file, message);
      // Reset file input and message
      event.target.value = '';
      setMessage('');
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const triggerImageVideoUpload = () => {
    imageVideoInputRef.current?.click();
  };

  const handleImageVideoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
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
    
    return mockGifs[bestCategory as keyof typeof mockGifs] || mockGifs.trending;
  };

  // Filter GIFs based on search query or context
  const getFilteredGifs = () => {
    if (!gifSearchQuery.trim()) {
      return getContextualGifs();
    }
    
    const allGifs = [...mockGifs.trending, ...mockGifs.reactions, ...mockGifs.celebration];
    return allGifs.filter(gif => 
      gif.title.toLowerCase().includes(gifSearchQuery.toLowerCase())
    );
  };

  // Cryptocurrency icon helper function with optimized rendering
  const getCryptoIcon = (crypto: string) => {
    switch (crypto) {
      case 'BTC':
        return <FaBitcoin className="w-5 h-5 text-orange-500" />;
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

  const { data: messages = [] } = useQuery<(Message & { sender: User })[]>({
    queryKey: ["/api/conversations", conversation.id, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${conversation.id}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { content: string; messageType: string }) => {
      return apiRequest("POST", `/api/conversations/${conversation.id}/messages`, messageData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversation.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setMessage("");
    },
    onError: () => {
      toast({
        title: "Failed to send message",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const sendCryptoMutation = useMutation({
    mutationFn: async (cryptoData: { toUserId: number; currency: string; amount: string }) => {
      return apiRequest("POST", "/api/wallet/send", cryptoData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversation.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balances"] });
      setCryptoAmount("");
      setSelectedCrypto("");
      setShowCryptoModal(false);
      setCryptoStep("amount");
      toast({
        title: "Crypto sent successfully",
        description: `${variables.amount} ${variables.currency} sent to ${conversation.otherUser.displayName}`,
      });
    },
    onError: () => {
      toast({
        title: "Failed to send crypto",
        description: "Please try again.",
        variant: "destructive",
      });
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
    sendCryptoMutation.mutate({
      toUserId: conversation.otherUser.id,
      currency: selectedCrypto,
      amount: cryptoAmount,
    });
  };

  // Handle max button click
  const handleMaxClick = () => {
    // Mock wallet balances for demonstration
    const balances = {
      BTC: "0.125",
      BNB: "8.5",
      USDT: "2500",
      COYN: "1500"
    };
    
    const maxAmount = balances[selectedCrypto as keyof typeof balances] || "0";
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
      return apiRequest("DELETE", `/api/messages/${messageId}`, {});
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

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

    sendMessageMutation.mutate({
      content: messageContent,
      messageType: "text"
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
      const message = messages.find(m => m.id === swipeState.messageId);
      if (message) {
        // Use the effective display name from enhanced message data or calculate it
        const effectiveName = (message.sender as any).effectiveDisplayName || getEffectiveDisplayName(message.sender);
        setReplyToMessage({
          id: message.id,
          content: message.content || `${message.cryptoAmount} ${message.cryptoCurrency}`,
          sender: effectiveName
        });
        
        // Add visual feedback similar to WhatsApp
        toast({
          title: "Replying to " + effectiveName,
          description: "Message ready for reply",
          duration: 1500,
        });
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

  // Message hover and long press handlers
  const handleMessageHover = (messageId: number) => {
    // Clear any pending hide timer
    if (hoverLeaveTimer) {
      clearTimeout(hoverLeaveTimer);
      setHoverLeaveTimer(null);
    }
    setHoveredMessage(messageId);
  };

  const handleMessageLeave = () => {
    // Add delay before hiding options to allow user to move to options menu
    const timer = setTimeout(() => {
      setHoveredMessage(null);
    }, 300); // 300ms delay
    setHoverLeaveTimer(timer);
    
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Handler for when hovering over options menu itself
  const handleOptionsHover = () => {
    // Clear the hide timer when hovering over options
    if (hoverLeaveTimer) {
      clearTimeout(hoverLeaveTimer);
      setHoverLeaveTimer(null);
    }
  };

  const handleOptionsLeave = () => {
    // Add small delay when leaving options menu too
    const timer = setTimeout(() => {
      setHoveredMessage(null);
    }, 150); // Shorter delay for options menu
    setHoverLeaveTimer(timer);
  };

  const handleLongPressStart = (messageId: number) => {
    const timer = setTimeout(() => {
      setShowMessageOptions(messageId);
    }, 500); // Show options after 500ms long press
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
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
    setShowMessageOptions(null);
  };

  const starMessageMutation = useMutation({
    mutationFn: async ({ messageId, isStarred }: { messageId: number; isStarred: boolean }) => {
      return apiRequest("PATCH", `/api/messages/${messageId}/star`, { isStarred });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversation.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/starred"] });
      
      toast({
        title: variables.isStarred ? "Message starred" : "Message unstarred",
        description: variables.isStarred ? "Message added to starred messages" : "Message removed from starred messages",
        duration: 1500,
      });
    },
    onError: (error) => {
      console.error("Star message error:", error);
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
    setShowMessageOptions(null);
  };

  const handleForwardMessage = (message: Message) => {
    // Implement forward functionality
    setShowShareModal(true);
    setShowMessageOptions(null);
  };



  const deleteMessage = async (messageId: number) => {
    try {
      await apiRequest("DELETE", `/api/messages/${messageId}`);
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
    setShowMessageOptions(null);
  };

  const handleReplyCancel = () => {
    setReplyToMessage(null);
  };

  const handleQuickSend = (currency: string) => {
    const amount = "0.01"; // Default quick send amount
    sendCryptoMutation.mutate({
      toUserId: conversation.otherUser.id,
      currency,
      amount
    });
  };

  const handleSendCrypto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cryptoAmount || parseFloat(cryptoAmount) <= 0) return;

    sendCryptoMutation.mutate({
      toUserId: conversation.otherUser.id,
      currency: "COYN",
      amount: cryptoAmount,
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
        <mark key={index} className="search-result-container bg-yellow-200 dark:bg-yellow-500/60 text-black dark:text-white px-1 py-0.5 rounded font-medium border border-yellow-300 dark:border-yellow-400/50 inline-block max-w-fit">
          {part}
        </mark>
      ) : part;
    });
  };

  // Navigation functions for search results
  const navigateToSearchResult = (index: number) => {
    if (searchResults.length === 0) return;
    
    const resultIndex = Math.max(0, Math.min(index, searchResults.length - 1));
    setCurrentSearchIndex(resultIndex);
    
    const message = searchResults[resultIndex];
    const messageId = message.id;
    
    setTimeout(() => {
      // Find the message container specifically
      const messagesContainer = document.querySelector('.overflow-y-auto');
      let element = null;
      
      if (messagesContainer) {
        // Look for the exact element within the messages container
        element = messagesContainer.querySelector(`[data-message-id="${messageId}"]`);
      }
      
      // Fallback to global search if not found in container
      if (!element) {
        element = document.querySelector(`[data-message-id="${messageId}"]`);
      }
      
      if (element) {
        // Scroll to the element with better positioning
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
        
        // Add focus animation with better visual feedback
        element.classList.add('search-result-focus');
        
        // Remove animation after 3 seconds
        setTimeout(() => {
          element?.classList.remove('search-result-focus');
        }, 3000);
        
        // Enhanced highlight animation for search terms
        const highlightElements = element.querySelectorAll('mark');
        highlightElements.forEach((mark, i) => {
          setTimeout(() => {
            mark.classList.add('search-highlight-pulse');
            setTimeout(() => {
              mark.classList.remove('search-highlight-pulse');
            }, 2000);
          }, i * 100); // Staggered animation
        });
      } else {
        console.warn(`Could not find message element with ID: ${messageId}`);
        // Debug: log all available message IDs
        const allMessages = document.querySelectorAll('[data-message-id]');
        console.log('Available message IDs:', Array.from(allMessages).map(el => el.getAttribute('data-message-id')));
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
    }
  }, [searchQuery, messages]);

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
    <div className="flex flex-col h-full bg-background">
      {/* Chat Header */}
      <div className="chat-header bg-white dark:bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Back Button - Mobile and Desktop */}
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="p-2 hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            className="p-0 h-auto hover:bg-transparent flex items-center space-x-3"
            onClick={() => setShowUserProfile(true)}
          >
            <Avatar className="h-10 w-10">
              {conversation.isGroup ? (
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                  <Users className="w-5 h-5" />
                </AvatarFallback>
              ) : (
                <>
                  <AvatarImage src={conversation.otherUser?.profilePicture || ""} />
                  <AvatarFallback className="bg-gray-200 dark:bg-gray-700">
                    <UserAvatarIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </AvatarFallback>
                </>
              )}
            </Avatar>
            <div className="text-left">
              <h2 className="font-semibold text-foreground">
                {conversation.isGroup ? conversation.groupName : conversation.otherUser?.displayName}
              </h2>
              {conversation.isGroup ? (
                <p className="text-xs text-muted-foreground">Group conversation</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {conversation.otherUser?.walletAddress ? 
                    `${conversation.otherUser.walletAddress.slice(0, 6)}...${conversation.otherUser.walletAddress.slice(-4)}` : 
                    ''
                  }
                </p>
              )}
            </div>
          </Button>
        </div>

        {/* Search Results Bar */}
        {searchQuery && (
          <div className="search-results-bar flex items-center justify-between w-full px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-700">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              {searchResultCount > 0 ? (
                <>
                  <Badge variant="secondary" className="text-xs px-2 py-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-600 shadow-sm whitespace-nowrap shrink-0">
                    {isSearching ? (
                      <div className="flex items-center space-x-1">
                        <div className="animate-spin w-3 h-3 border border-yellow-500 border-t-transparent rounded-full"></div>
                        <span>Searching...</span>
                      </div>
                    ) : (
                      <span className="font-medium">{currentSearchIndex + 1}/{searchResultCount}</span>
                    )}
                  </Badge>
                  <span className="text-xs text-yellow-700 dark:text-yellow-300 truncate">
                    "{searchQuery}"
                  </span>
                </>
              ) : !isSearching ? (
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    No results
                  </Badge>
                  <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    for "{searchQuery}"
                  </span>
                </div>
              ) : null}
            </div>
            
            {!isSearching && searchResults.length > 1 && (
              <div className="flex items-center space-x-1 shrink-0 ml-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 p-1 hover:bg-yellow-200 dark:hover:bg-yellow-700 transition-colors duration-200 rounded-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    goToPreviousResult();
                  }}
                  title="Previous result"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 p-1 hover:bg-yellow-200 dark:hover:bg-yellow-700 transition-colors duration-200 rounded-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    goToNextResult();
                  }}
                  title="Next result"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Call and Video Icons */}
        <div className="flex items-center space-x-2">
          {!conversation.isGroup && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVoiceCall(true)}
                className={`p-2 hover:bg-accent rounded-full transition-all duration-300 ${
                  isVoiceCallActive 
                    ? "text-green-500 shadow-lg shadow-green-500/50 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={isVoiceCallActive ? "Join active call" : "Voice call"}
              >
                <Phone className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVideoCall(true)}
                className={`p-2 hover:bg-accent rounded-full transition-all duration-300 ${
                  isVideoCallActive 
                    ? "text-green-500 shadow-lg shadow-green-500/50 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={isVideoCallActive ? "Join active video call" : "Video call"}
              >
                <Video className={`h-5 w-5 ${isVideoCallActive ? 'animate-pulse' : ''}`} />
              </Button>
            </>
          )}
          
          {conversation.isGroup && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 hover:bg-accent text-muted-foreground hover:text-foreground rounded-full"
                  title="Group options"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem 
                  onClick={() => leaveGroupMutation.mutate()}
                  disabled={leaveGroupMutation.isPending}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Leave Group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

      </div>

      {/* Chat Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-gray-50/30 via-white/50 to-gray-50/30 dark:from-slate-900/30 dark:via-slate-800/50 dark:to-slate-900/30 px-4 relative backdrop-blur-sm max-h-[calc(100vh-200px)]"
      >

        
        {messages.map((msg, index) => (
          <div key={msg.id} className={`${index > 0 ? 'mt-3' : 'mt-1'} w-full overflow-hidden`}>
            {msg.messageType === "text" ? (
              // Check if this is an escrow system message
              (msg.content?.includes('🛡️ Escrow created:') || msg.content?.includes('🔔 Release Request:') || msg.content?.includes('🎉 Blockchain confirmations complete!')) ? (
                // Escrow system message
                <div className="flex justify-center mb-3" data-message-id={msg.id}>
                  <div className="bg-orange-500/90 backdrop-blur-sm text-white rounded-xl p-3 sm:p-4 max-w-[90%] sm:max-w-md shadow-lg border border-orange-400/30">
                    <div className="flex items-start space-x-2">
                      <div className="flex-shrink-0 mt-0.5">
                        {msg.content?.includes('🛡️ Escrow created:') && '🛡️'}
                        {msg.content?.includes('🔔 Release Request:') && '🔔'}
                        {msg.content?.includes('🎉 Blockchain confirmations complete!') && '🎉'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-relaxed break-words">
                          {highlightText(
                            // Format the message content to be more readable
                            msg.content
                              ?.replace(/(\d+)\.(\d{8})/g, (match, whole, decimal) => {
                                // Reduce decimal places from 8 to 4 for better readability
                                const cleanDecimal = decimal.substring(0, 4).replace(/0+$/, '') || '0';
                                return `${whole}.${cleanDecimal}`;
                              })
                              ?.replace(/🛡️ Escrow created: /, '')
                              ?.replace(/🔔 Release Request: /, '')
                              ?.replace(/🎉 Blockchain confirmations complete! /, '') || '',
                            searchQuery || ''
                          )}
                        </div>
                        <div className="text-xs text-orange-100 mt-2 opacity-80">
                          {formatTimestamp(msg.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : msg.senderId === 5 ? (
                  // Sent message (current user) - with swipe-to-reply
                  <div className="flex justify-end mb-1" data-message-id={msg.id}>
                    <div className="relative group max-w-xs lg:max-w-md">

                      {/* Message Options Menu */}
                      {(hoveredMessage === msg.id || showMessageOptions === msg.id) && (
                        <div 
                          data-message-options 
                          className="absolute -top-10 right-0 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-1 flex items-center space-x-1"
                          style={{ 
                            pointerEvents: 'all', 
                            zIndex: 9999,
                            position: 'absolute'
                          }}
                          onMouseEnter={handleOptionsHover}
                          onMouseLeave={handleOptionsLeave}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-8 w-8 hover:bg-gray-100 dark:hover:bg-slate-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyMessage(msg);
                            }}
                            title="Copy"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-8 w-8 hover:bg-gray-100 dark:hover:bg-slate-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStarMessage(msg);
                            }}
                            title={msg.isStarred ? "Unstar" : "Star"}
                          >
                            <Star className={`h-4 w-4 ${msg.isStarred ? 'fill-current text-yellow-500' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-8 w-8 hover:bg-gray-100 dark:hover:bg-slate-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleForwardMessage(msg);
                            }}
                            title="Forward"
                          >
                            <Forward className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMessageMutation.mutate(msg.id);
                            }}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      
                      {/* Swipeable message */}
                      <div 
                        className="relative cursor-pointer touch-pan-y select-none"
                        style={{
                          transform: swipeState.messageId === msg.id ? `translateX(${swipeState.offsetX}px)` : 'translateX(0px)',
                          transition: swipeState.isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        onTouchStart={(e) => {
                          handleSwipeStart(e, msg.id);
                          handleLongPressStart(msg.id);
                        }}
                        onTouchMove={handleSwipeMove}
                        onTouchEnd={() => {
                          handleSwipeEnd();
                          handleLongPressEnd();
                        }}
                        onMouseDown={(e) => {
                          // Only start swipe if not clicking on options menu
                          if (!(e.target as Element).closest('[data-message-options]')) {
                            handleSwipeStart(e, msg.id);
                          }
                        }}
                        onMouseUp={() => {
                          if (swipeState.isDragging) {
                            handleSwipeEnd();
                          }
                        }}
                        onMouseEnter={() => handleMessageHover(msg.id)}
                        onMouseLeave={() => {
                          if (swipeState.isDragging) {
                            handleSwipeEnd();
                          }
                          handleMessageLeave();
                        }}
                      >
                        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl rounded-tr-md px-4 py-3 shadow-lg hover:shadow-xl transition-shadow duration-300 backdrop-blur-xl border border-orange-400/20">
                          {/* WhatsApp-style reply context */}
                          {msg.content?.includes('@') && msg.content.includes(':') && (
                            <div className="bg-white/20 rounded-lg p-2 mb-2 border-l-4 border-white/40">
                              <div className="text-xs font-medium text-white/90 mb-1">
                                {msg.content.split(':')[0].replace('@', '')}
                              </div>
                              <div className="text-xs text-white/70 line-clamp-2">
                                {/* Find and display the original message from conversation history */}
                                {(() => {
                                  const replyToUser = msg.content?.split(':')[0].replace('@', '');
                                  const originalMsg = messages.find(m => {
                                    const effectiveName = (m.sender as any).effectiveDisplayName || getEffectiveDisplayName(m.sender);
                                    return effectiveName === replyToUser && 
                                      m.id !== msg.id &&
                                      (m.timestamp != null && msg.timestamp != null && m.timestamp < msg.timestamp);
                                  });
                                  return originalMsg?.content || originalMsg?.cryptoAmount 
                                    ? `${originalMsg.content || ''} ${originalMsg.cryptoAmount ? `${originalMsg.cryptoAmount} ${originalMsg.cryptoCurrency}` : ''}`.trim()
                                    : "Previous message";
                                })()}
                              </div>
                            </div>
                          )}
                          <p className="text-sm font-medium break-words">
                            {highlightText(
                              msg.content?.includes('@') && msg.content.includes(':') 
                                ? msg.content.split(':').slice(1).join(':').trim()  // Show only the new message part
                                : msg.content || "", 
                              searchQuery || ""
                            )}
                          </p>
                          <span className="text-xs text-primary-foreground/80 mt-1 block">
                            {formatTimestamp(msg.timestamp)}
                          </span>
                        </div>
                        
                        {/* WhatsApp-style visual hint for sent messages */}
                        {swipeState.messageId === msg.id && swipeState.offsetX > 20 && (
                          <div 
                            className="absolute right-full top-1/2 transform -translate-y-1/2 px-2 transition-all duration-100"
                            style={{
                              transform: `translateY(-50%) scale(${Math.min(1.2, 0.8 + swipeState.offsetX / 100)}) rotate(${Math.min(15, swipeState.offsetX / 10)}deg)`,
                              opacity: Math.min(1, swipeState.offsetX / 80)
                            }}
                          >
                            <div className="bg-green-500 rounded-full p-2 shadow-lg">
                              <Reply className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Received message - with swipe-to-reply
                  <div className="flex items-start space-x-3 mb-1" data-message-id={msg.id}>
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={msg.sender.profilePicture || ""} />
                      <AvatarFallback>{msg.sender.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="relative max-w-xs lg:max-w-md">
                      
                      {/* Message Options Menu */}
                      {(hoveredMessage === msg.id || showMessageOptions === msg.id) && (
                        <div 
                          data-message-options 
                          className="absolute -top-10 left-0 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-1 flex items-center space-x-1"
                          style={{ 
                            pointerEvents: 'all', 
                            zIndex: 9999,
                            position: 'absolute'
                          }}
                          onMouseEnter={handleOptionsHover}
                          onMouseLeave={handleOptionsLeave}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-8 w-8 hover:bg-gray-100 dark:hover:bg-slate-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyMessage(msg);
                            }}
                            title="Copy"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-8 w-8 hover:bg-gray-100 dark:hover:bg-slate-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStarMessage(msg);
                            }}
                            title={msg.isStarred ? "Unstar" : "Star"}
                          >
                            <Star className={`h-4 w-4 ${msg.isStarred ? 'fill-current text-yellow-500' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-8 w-8 hover:bg-gray-100 dark:hover:bg-slate-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleForwardMessage(msg);
                            }}
                            title="Forward"
                          >
                            <Forward className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMessageMutation.mutate(msg.id);
                            }}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>

                        </div>
                      )}

                      {/* Swipeable message */}
                      <div 
                        className="relative cursor-pointer touch-pan-y select-none"
                        style={{
                          transform: swipeState.messageId === msg.id ? `translateX(${swipeState.offsetX}px)` : 'translateX(0px)',
                          transition: swipeState.isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        onTouchStart={(e) => {
                          handleSwipeStart(e, msg.id);
                          handleLongPressStart(msg.id);
                        }}
                        onTouchMove={handleSwipeMove}
                        onTouchEnd={() => {
                          handleSwipeEnd();
                          handleLongPressEnd();
                        }}
                        onMouseDown={(e) => {
                          // Only start swipe if not clicking on options menu
                          if (!(e.target as Element).closest('[data-message-options]')) {
                            handleSwipeStart(e, msg.id);
                          }
                        }}
                        onMouseUp={() => {
                          if (swipeState.isDragging) {
                            handleSwipeEnd();
                          }
                        }}
                        onMouseEnter={() => handleMessageHover(msg.id)}
                        onMouseLeave={() => {
                          if (swipeState.isDragging) {
                            handleSwipeEnd();
                          }
                          handleMessageLeave();
                        }}
                      >
                        <div className="bg-white/80 dark:bg-slate-800/80 rounded-2xl rounded-tl-md px-4 py-3 shadow-lg hover:shadow-xl transition-shadow duration-300 backdrop-blur-xl border border-gray-200/50 dark:border-slate-600/50">
                          <p className="text-sm break-words text-foreground">{highlightText(msg.content || "", searchQuery || "")}</p>
                          <span className="text-xs text-muted-foreground mt-1 block">
                            {formatTimestamp(msg.timestamp)}
                          </span>
                        </div>
                        
                        {/* WhatsApp-style visual hint for received messages */}
                        {swipeState.messageId === msg.id && swipeState.offsetX > 20 && (
                          <div 
                            className="absolute right-full top-1/2 transform -translate-y-1/2 px-2 transition-all duration-100"
                            style={{
                              transform: `translateY(-50%) scale(${Math.min(1.2, 0.8 + swipeState.offsetX / 100)}) rotate(${Math.min(15, swipeState.offsetX / 10)}deg)`,
                              opacity: Math.min(1, swipeState.offsetX / 80)
                            }}
                          >
                            <div className="bg-green-500 rounded-full p-2 shadow-lg">
                              <Reply className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              ) : msg.messageType === "crypto" ? (
                // Crypto transaction message
                <div className="flex justify-center group mb-1" data-message-id={msg.id}>
                  <div className="relative">
                    <Card className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 max-w-xs shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-xl hover:scale-105">
                      <CardContent className="p-4">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <Coins className="h-4 w-4 text-cyan-400" />
                        <span className="text-sm font-medium text-cyan-400">Crypto Transaction</span>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-cyan-400">
                          {msg.senderId === 5 ? '-' : '+'}{msg.cryptoAmount} {msg.cryptoCurrency}
                        </div>
                        <div className="text-xs text-slate-400 break-all max-w-full overflow-hidden">
                          {msg.senderId === 5 ? 'To' : 'From'}: {msg.sender.walletAddress}
                        </div>
                        <div className="text-xs text-slate-400">
                          {formatTimestamp(msg.timestamp)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  {msg.senderId === 5 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute -top-1 -right-8 h-6 w-6 text-slate-400 dark:text-slate-400 hover:text-slate-300 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity bg-transparent hover:bg-slate-700/20 dark:hover:bg-slate-700/20 rounded-full"
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                        <DropdownMenuItem
                          onClick={() => deleteMessageMutation.mutate(msg.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950 justify-center p-2 h-8 w-8 min-w-0"
                          disabled={deleteMessageMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  </div>
                </div>
              ) : msg.messageType === "product_share" ? (
                // Product sharing message
                <div className="flex justify-center group mb-1" data-message-id={msg.id}>
                  <div className="relative">
                    
                    {/* Message Options Menu */}
                    {(hoveredMessage === msg.id || showMessageOptions === msg.id) && (
                      <div 
                        data-message-options 
                        className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-1 flex items-center space-x-1"
                        style={{ 
                          pointerEvents: 'all', 
                          zIndex: 9999,
                          position: 'absolute'
                        }}
                        onMouseEnter={handleOptionsHover}
                        onMouseLeave={handleOptionsLeave}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-8 w-8 hover:bg-gray-100 dark:hover:bg-slate-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyMessage(msg);
                          }}
                          title="Copy"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-8 w-8 hover:bg-gray-100 dark:hover:bg-slate-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStarMessage(msg);
                          }}
                          title={msg.isStarred ? "Unstar" : "Star"}
                        >
                          <Star className={`h-4 w-4 ${msg.isStarred ? 'fill-current text-yellow-500' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-8 w-8 hover:bg-gray-100 dark:hover:bg-slate-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleForwardMessage(msg);
                          }}
                          title="Forward"
                        >
                          <Forward className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMessageMutation.mutate(msg.id);
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <Card className="bg-gradient-to-r from-orange-500/20 to-pink-500/20 border border-orange-400/30 max-w-xs shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-xl hover:scale-105 cursor-pointer"
                      onClick={() => {
                        if (msg.productId) {
                          setLocation(`/product/${msg.productId}`);
                        }
                      }}
                      onMouseEnter={() => handleMessageHover(msg.id)}
                      onMouseLeave={() => handleMessageLeave()}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-center space-x-2 mb-3">
                          <div className="h-8 w-8 bg-gradient-to-r from-orange-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <span className="text-white text-sm">🛍️</span>
                          </div>
                          <span className="text-sm font-medium text-orange-500 dark:text-orange-400">Product Share</span>
                        </div>
                        
                        {msg.productImage && (
                          <div className="mb-3 flex justify-center">
                            <img 
                              src={msg.productImage} 
                              alt={msg.productTitle || "Product"} 
                              className="w-16 h-16 object-cover rounded-lg border border-orange-200 dark:border-orange-700"
                            />
                          </div>
                        )}
                        
                        <div className="text-center">
                          <div className="text-sm font-semibold text-foreground mb-1 line-clamp-2">
                            {msg.productTitle}
                          </div>
                          {msg.productPrice && (
                            <div className="text-lg font-bold text-orange-600 dark:text-orange-400 mb-2">
                              ${msg.productPrice}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mb-2">
                            Shared by {msg.sender.displayName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatTimestamp(msg.timestamp)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : msg.messageType === "attachment" ? (
                // File attachment message
                <div className={`flex ${msg.senderId === 5 ? 'justify-end' : 'justify-start'} group mb-1`} data-message-id={msg.id}>
                  <div className="relative max-w-xs lg:max-w-md">
                    
                    {/* Message Options Menu */}
                    {(hoveredMessage === msg.id || showMessageOptions === msg.id) && (
                      <div 
                        data-message-options 
                        className={`absolute -top-10 ${msg.senderId === 5 ? 'right-0' : 'left-0'} bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg p-1 flex items-center space-x-1`}
                        style={{ 
                          pointerEvents: 'all', 
                          zIndex: 9999,
                          position: 'absolute'
                        }}
                        onMouseEnter={handleOptionsHover}
                        onMouseLeave={handleOptionsLeave}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-8 w-8 hover:bg-gray-100 dark:hover:bg-slate-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyMessage(msg);
                          }}
                          title="Copy"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-8 w-8 hover:bg-gray-100 dark:hover:bg-slate-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStarMessage(msg);
                          }}
                          title={msg.isStarred ? "Unstar" : "Star"}
                        >
                          <Star className={`h-4 w-4 ${msg.isStarred ? 'fill-current text-yellow-500' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-8 w-8 hover:bg-gray-100 dark:hover:bg-slate-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleForwardMessage(msg);
                          }}
                          title="Forward"
                        >
                          <Forward className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMessageMutation.mutate(msg.id);
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {/* Attachment bubble */}
                    <div 
                      className={`
                        rounded-2xl p-2 shadow-lg backdrop-blur-xl border max-w-xs w-fit overflow-hidden
                        ${msg.senderId === 5 
                          ? 'bg-gradient-to-br from-orange-500/90 to-orange-600/90 text-white border-orange-400/50 rounded-br-md' 
                          : 'bg-white/80 dark:bg-slate-800/80 text-foreground border-gray-200/50 dark:border-slate-600/50 rounded-tl-md'
                        }
                      `}
                      onMouseEnter={() => handleMessageHover(msg.id)}
                      onMouseLeave={handleMessageLeave}
                    >
                      {/* Image Preview */}
                      {msg.attachmentType === 'image' && msg.attachmentUrl && (
                        <div className="mb-2 w-full max-w-[200px] overflow-hidden">
                          <img 
                            src={msg.attachmentUrl} 
                            alt={msg.attachmentName || "Image"} 
                            className="w-full h-auto max-h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            loading="lazy"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImagePreview(
                                msg.attachmentUrl!, 
                                msg.attachmentName ?? undefined, 
                                msg.attachmentSize ?? undefined
                              );
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Video Preview */}
                      {msg.attachmentType === 'video' && msg.attachmentUrl && (
                        <div className="mb-2 w-full max-w-[200px] overflow-hidden">
                          <video 
                            src={msg.attachmentUrl} 
                            controls 
                            className="w-full h-auto max-h-32 rounded-lg"
                            preload="metadata"
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      )}
                      
                      {/* File Preview */}
                      {msg.attachmentType === 'file' && (
                        <div className="flex items-center space-x-3 mb-2 p-3 bg-white/10 dark:bg-slate-700/30 rounded-lg">
                          <File className="h-8 w-8 text-blue-400" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {msg.attachmentName || "File"}
                            </div>
                            {msg.attachmentSize && (
                              <div className="text-xs opacity-70">
                                {(msg.attachmentSize / 1024 / 1024).toFixed(1)} MB
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Download button for all attachments */}
                      {msg.attachmentUrl && (
                        <a 
                          href={msg.attachmentUrl} 
                          download={msg.attachmentName}
                          className="flex items-center space-x-1 text-xs opacity-80 hover:opacity-100 transition-opacity truncate"
                        >
                          <Download className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate max-w-[150px]">{msg.attachmentName || "Download"}</span>
                        </a>
                      )}
                      
                      {/* Optional text content */}
                      {msg.content && (
                        <div className="mt-2 pt-2 border-t border-white/20 dark:border-slate-600/20">
                          <p className="text-sm break-words">
                            {highlightText(msg.content, searchQuery || "")}
                          </p>
                        </div>
                      )}
                      
                      {/* Timestamp */}
                      <div className={`text-xs mt-2 ${msg.senderId === 5 ? 'text-white/70' : 'text-muted-foreground'}`}>
                        {formatTimestamp(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        <div ref={messagesEndRef} className="h-4" />

        {/* Back to Bottom Button */}
        {showBackToTop && (
          <div className="sticky bottom-4 flex justify-end pr-4 pointer-events-none">
            <Button
              onClick={scrollToBottom}
              className="w-10 h-10 rounded-full bg-white/60 hover:bg-white/80 text-orange-500 hover:text-orange-600 border-2 border-orange-400 hover:border-orange-500 backdrop-blur-sm transition-all duration-200 pointer-events-auto shadow-sm"
              size="sm"
              title="Back to bottom"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Crypto Send Panel */}
      {showCryptoSend && (
        <div className="border-t border-slate-700 bg-slate-800 p-4">
          <Card className="bg-gradient-to-r from-cyan-600/10 to-cyan-500/10 border-cyan-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-cyan-400 flex items-center">
                  <Send className="h-4 w-4 mr-2" />
                  Send COYN
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-slate-300"
                  onClick={() => setShowCryptoSend(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <form onSubmit={handleSendCrypto} className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00 COYN"
                    value={cryptoAmount}
                    onChange={(e) => setCryptoAmount(e.target.value)}
                    className="bg-slate-700 border-slate-600 focus:border-cyan-500"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button 
                    type="submit"
                    className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-900"
                    disabled={sendCryptoMutation.isPending}
                  >
                    {sendCryptoMutation.isPending ? "Sending..." : "Send COYN"}
                  </Button>
                  <Button 
                    type="button"
                    variant="secondary" 
                    onClick={() => setShowCryptoSend(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Message Input */}
      <div className="border-t border-white/20 dark:border-slate-700/50 bg-gradient-to-r from-white/90 to-gray-50/90 dark:from-slate-900/90 dark:to-slate-800/90 backdrop-blur-xl p-3 sm:p-4 shadow-lg">
        {/* WhatsApp-style Reply indicator */}
        {replyToMessage && (
          <div className="mb-3 p-3 bg-gradient-to-r from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20 rounded-lg border-l-4 border-green-500 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center space-x-3">
              <Reply className="h-4 w-4 text-green-600 dark:text-green-400" />
              <div className="flex-1">
                <div className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                  {replyToMessage.sender}
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-200 line-clamp-2 max-w-xs">
                  {replyToMessage.content}
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleReplyCancel}
              className="h-7 w-7 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/30 rounded-full transition-all duration-150"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2 sm:space-x-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-orange-500 dark:text-cyan-400 hover:bg-orange-100/80 dark:hover:bg-slate-700/80 backdrop-blur-sm transition-all duration-300 hover:scale-110 active:scale-95 shadow-sm hover:shadow-md rounded-xl h-8 w-8 sm:h-10 sm:w-10"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
              <DropdownMenuItem
                onClick={() => handleCryptoClick('BTC')}
                className="text-black dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <FaBitcoin className="w-4 h-4 text-orange-500" />
                  <span>Send BTC</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleCryptoClick('BNB')}
                className="text-black dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <SiBinance className="w-4 h-4 text-yellow-500" />
                  <span>Send BNB</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleCryptoClick('USDT')}
                className="text-black dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <SiTether className="w-4 h-4 text-green-500" />
                  <span>Send USDT</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleCryptoClick('COYN')}
                className="text-black dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <img 
                    src={coynLogoPath} 
                    alt="COYN" 
                    className="w-4 h-4 rounded-full"
                    loading="eager"
                    decoding="async"
                    style={{ imageRendering: 'auto' }}
                  />
                  <span>Send COYN</span>
                </div>
              </DropdownMenuItem>
              <div className="px-2 py-1">
                <div className="h-px bg-gray-200 dark:bg-slate-600" />
              </div>

            </DropdownMenuContent>
          </DropdownMenu>

          {/* Attachment Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-orange-500 dark:text-cyan-400 hover:bg-orange-100/80 dark:hover:bg-slate-700/80 backdrop-blur-sm transition-all duration-300 hover:scale-110 active:scale-95 shadow-sm hover:shadow-md rounded-xl h-8 w-8 sm:h-10 sm:w-10"
              >
                <Paperclip className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  triggerFileUpload();
                }}
                className="text-black dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span>File</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  triggerImageVideoUpload();
                }}
                className="text-black dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Image className="w-4 h-4 text-green-500" />
                  <span>Image/Video</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="*/*"
            onChange={handleFileSelect}
            className="hidden"
            style={{ display: 'none' }}
          />
          <input
            ref={imageVideoInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleImageVideoSelect}
            className="hidden"
            style={{ display: 'none' }}
          />

          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="pr-16 sm:pr-20 h-11 sm:h-10 text-sm sm:text-sm bg-white/80 dark:bg-slate-800/80 border border-gray-200/50 dark:border-slate-600/50 focus:border-orange-500/60 dark:focus:border-cyan-500/60 text-black dark:text-white placeholder-gray-500 dark:placeholder-slate-400 touch-manipulation backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl focus:ring-2 focus:ring-orange-200/50 dark:focus:ring-cyan-200/20"
            />
            
            {/* GIF Picker */}
            <Popover open={showGifPicker} onOpenChange={setShowGifPicker}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-8 sm:right-11 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-slate-400 hover:text-primary dark:hover:text-cyan-400 h-8 w-8 sm:h-8 sm:w-8 touch-manipulation"
                >
                  <Image className="h-4 w-4 sm:h-4 sm:w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-xl" align="end">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 dark:text-slate-200 text-sm">GIFs</h3>
                    {!gifSearchQuery.trim() && (
                      <span className="text-xs text-orange-600 dark:text-cyan-400 bg-orange-50 dark:bg-cyan-900/30 px-2 py-1 rounded-full">
                        ✨ Smart suggestions
                      </span>
                    )}
                  </div>
                  
                  {/* Search Bar */}
                  <div className="relative">
                    <Input
                      placeholder="Search GIFs..."
                      value={gifSearchQuery}
                      onChange={(e) => setGifSearchQuery(e.target.value)}
                      className="h-8 text-sm bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 focus:border-orange-400 dark:focus:border-cyan-400"
                    />
                  </div>

                  

                  {/* GIF Grid */}
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {getFilteredGifs().map((gif) => (
                      <button
                        key={gif.id}
                        type="button"
                        onClick={() => handleGifSelect(gif)}
                        className="relative aspect-square bg-gray-100 dark:bg-slate-700 rounded-lg overflow-hidden hover:bg-orange-100 dark:hover:bg-slate-600 transition-colors group"
                      >
                        <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center">
                          <span className="text-xs text-gray-600 dark:text-slate-300 text-center p-2 group-hover:text-orange-600 dark:group-hover:text-cyan-300">
                            {gif.title}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  <div className="pt-1.5 border-t border-gray-200 dark:border-slate-700">
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {getFilteredGifs().length} GIFs {gifSearchQuery.trim() ? 'found' : 'suggested'}
                    </p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Emoji Picker */}
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-slate-400 hover:text-primary dark:hover:text-cyan-400 h-8 w-8 sm:h-8 sm:w-8 touch-manipulation"
                >
                  <Smile className="h-4 w-4 sm:h-4 sm:w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-xl" align="end">
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900 dark:text-slate-200 text-sm">Emojis</h3>
                  
                  {/* Category Tabs */}
                  <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-slate-700 pb-2">
                    {Object.keys(emojiCategories).map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setSelectedEmojiCategory(category as keyof typeof emojiCategories)}
                        className={`px-2 py-1 text-xs rounded-md transition-colors capitalize ${
                          selectedEmojiCategory === category
                            ? "bg-orange-100 dark:bg-cyan-900/50 text-orange-700 dark:text-cyan-300 border border-orange-300 dark:border-cyan-600"
                            : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>

                  {/* Emoji Grid */}
                  <div className="grid grid-cols-8 gap-0.5">
                    {emojiCategories[selectedEmojiCategory].map((emoji, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleEmojiSelect(emoji)}
                        className="text-lg hover:bg-orange-100 dark:hover:bg-slate-700 rounded p-1.5 transition-colors duration-200 hover:scale-110 active:scale-95 flex items-center justify-center h-8 w-8"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  
                  <div className="pt-1.5 border-t border-gray-200 dark:border-slate-700">
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Tip: You can also type emojis directly!
                    </p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <Button 
            type="submit"
            size="icon"
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 dark:from-cyan-500 dark:to-cyan-600 dark:hover:from-cyan-600 dark:hover:to-cyan-700 text-white h-10 w-10 sm:h-10 sm:w-10 touch-manipulation shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 rounded-xl backdrop-blur-sm"
            disabled={sendMessageMutation.isPending || !message.trim()}
          >
            <Send className="h-4 w-4 sm:h-4 sm:w-4" />
          </Button>
        </form>
      </div>



      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        selectedMessages={selectedMessages}
        currentConversationId={conversation.id}
      />

      {/* Crypto Send Modal */}
      <Dialog open={showCryptoModal} onOpenChange={resetCryptoModal}>
        <DialogContent className="w-[92vw] sm:w-[85vw] max-w-sm max-h-[85vh] m-3 sm:m-6 p-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-gray-200/60 dark:border-slate-700/60 flex flex-col rounded-2xl shadow-2xl">
          <DialogHeader className="p-4 sm:p-6 pb-0 bg-gradient-to-r from-gray-50/50 to-white/50 dark:from-slate-800/50 dark:to-slate-900/50 rounded-t-2xl border-b border-gray-200/30 dark:border-slate-700/30">
            <DialogTitle className="text-black dark:text-white text-lg sm:text-xl font-bold flex items-center space-x-2">
              <span className="bg-gradient-to-r from-orange-600 to-orange-500 dark:from-cyan-400 dark:to-cyan-300 bg-clip-text text-transparent">
                {cryptoStep === "amount" ? "Send" : "Confirm"}
              </span>
              <span className="bg-gradient-to-r from-yellow-500 to-yellow-600 dark:from-yellow-400 dark:to-yellow-500 bg-clip-text text-transparent font-bold">
                {selectedCrypto}
              </span>
              {getCryptoIcon(selectedCrypto)}
              {cryptoStep === "confirm" && (
                <span className="bg-gradient-to-r from-orange-600 to-orange-500 dark:from-cyan-400 dark:to-cyan-300 bg-clip-text text-transparent">
                  Transfer
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-3 sm:pt-4 backdrop-blur-sm">
            {cryptoStep === "amount" && (
              <div className="space-y-4 sm:space-y-6">
                <div className="relative">
                  <Label htmlFor="crypto-amount" className="text-black dark:text-white text-sm sm:text-base font-medium mb-2 sm:mb-3 block">
                    Amount to send
                  </Label>
                  <div className="relative group">
                    <Input
                      id="crypto-amount"
                      type="number"
                      step="0.00001"
                      placeholder={`0.00000 ${selectedCrypto}`}
                      value={cryptoAmount}
                      onChange={(e) => setCryptoAmount(e.target.value)}
                      className="h-12 sm:h-14 text-base sm:text-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-gray-200 dark:border-slate-600 focus:border-orange-400 dark:focus:border-cyan-400 focus:ring-2 focus:ring-orange-100 dark:focus:ring-cyan-900/50 text-black dark:text-white placeholder-gray-400 dark:placeholder-slate-500 pr-24 sm:pr-28 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                      <Button
                        type="button"
                        onClick={handleMaxClick}
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 text-xs font-medium bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 dark:from-cyan-950/80 dark:to-cyan-900/80 dark:hover:from-cyan-900 dark:hover:to-cyan-800 border-orange-200 dark:border-cyan-700 text-orange-600 dark:text-cyan-300 rounded-lg transition-all duration-200 hover:scale-105 shadow-sm"
                      >
                        Max
                      </Button>
                      <div className="flex items-center space-x-1 text-sm font-semibold text-gray-700 dark:text-slate-300 bg-gray-100/80 dark:bg-slate-700/80 px-2 py-1 rounded-md">
                        {getCryptoIcon(selectedCrypto)}
                        <span>{selectedCrypto}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 dark:from-slate-800/80 dark:to-slate-700/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-gray-200/50 dark:border-slate-600/50 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base font-medium text-gray-600 dark:text-slate-400">Recipient:</span>
                    <span className="text-sm sm:text-base font-semibold text-black dark:text-white bg-white/60 dark:bg-slate-900/60 px-2 sm:px-3 py-1 rounded-lg">
                      {conversation.otherUser.displayName}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-4 sm:pt-6">
                  <Button
                    onClick={handleAmountConfirm}
                    className="w-full h-11 sm:h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 dark:from-cyan-500 dark:to-cyan-600 dark:hover:from-cyan-600 dark:hover:to-cyan-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base"
                    disabled={!cryptoAmount || parseFloat(cryptoAmount) <= 0}
                  >
                    Continue
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetCryptoModal}
                    className="w-full h-11 sm:h-12 border-gray-300 dark:border-slate-600 text-black dark:text-white hover:bg-gray-50/80 dark:hover:bg-slate-700/80 backdrop-blur-sm rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md text-sm sm:text-base"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          
            {cryptoStep === "confirm" && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-gray-50/90 to-gray-100/90 dark:from-slate-800/90 dark:to-slate-700/90 backdrop-blur-sm rounded-xl p-5 border border-gray-200/60 dark:border-slate-600/60 shadow-lg space-y-4">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-slate-400">Amount:</span>
                    <span className="text-xl font-bold text-black dark:text-white bg-white/70 dark:bg-slate-900/70 px-4 py-2 rounded-lg shadow-sm">
                      {cryptoAmount} {selectedCrypto}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-slate-400">Recipient:</span>
                    <span className="text-sm font-semibold text-black dark:text-white bg-white/70 dark:bg-slate-900/70 px-3 py-2 rounded-lg shadow-sm">
                      {conversation.otherUser.displayName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-slate-400">Wallet Address:</span>
                    <span className="text-xs font-mono text-black dark:text-white bg-white/70 dark:bg-slate-900/70 px-3 py-2 rounded-lg shadow-sm">
                      {conversation.otherUser.walletAddress.slice(0, 6)}...{conversation.otherUser.walletAddress.slice(-4)}
                    </span>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-amber-50/90 to-yellow-50/90 dark:from-yellow-900/30 dark:to-amber-900/30 backdrop-blur-sm border border-amber-200/60 dark:border-yellow-700/60 rounded-xl p-4 shadow-sm">
                  <p className="text-sm text-amber-800 dark:text-yellow-200 leading-relaxed">
                    <strong className="font-semibold">⚠️ Important:</strong> This transaction cannot be reversed. Please verify all details before confirming.
                  </p>
                </div>
                
                <div className="flex space-x-3 pt-6">
                  <Button
                    onClick={handleSendConfirm}
                    disabled={sendCryptoMutation.isPending}
                    className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 dark:from-cyan-500 dark:to-cyan-600 dark:hover:from-cyan-600 dark:hover:to-cyan-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {sendCryptoMutation.isPending ? (
                      <span className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Sending...</span>
                      </span>
                    ) : (
                      `Send ${selectedCrypto}`
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCryptoStep("amount")}
                    disabled={sendCryptoMutation.isPending}
                    className="flex-1 h-12 border-gray-300 dark:border-slate-600 text-black dark:text-white hover:bg-gray-50/80 dark:hover:bg-slate-700/80 backdrop-blur-sm rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    Back
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showUserProfile}
        onClose={() => setShowUserProfile(false)}
        user={conversation.otherUser}
        onStartCall={() => {
          setShowUserProfile(false);
          // Phone call functionality can be added here
        }}
        onStartVideoCall={() => {
          setShowUserProfile(false);
          setShowVideoCall(true);
        }}
        onSendMessage={() => {
          setShowUserProfile(false);
          // Focus on message input - can be enhanced later
        }}
      />

      {/* Voice Call Modal */}
      <VoiceCallModal
        isOpen={showVoiceCall}
        onClose={() => setShowVoiceCall(false)}
        onHide={() => setShowVoiceCall(false)}
        onCallStart={() => setIsVoiceCallActive(true)}
        onCallEnd={() => setIsVoiceCallActive(false)}
        user={conversation.otherUser}
        isCallActive={isVoiceCallActive}
        onSwitchToVideo={() => {
          setShowVoiceCall(false);
          setShowVideoCall(true);
        }}
      />

      {/* Video Call Modal */}
      <VideoCallModal
        isOpen={showVideoCall}
        onClose={() => setShowVideoCall(false)}
        onHide={() => setShowVideoCall(false)}
        onCallStart={() => setIsVideoCallActive(true)}
        onCallEnd={() => setIsVideoCallActive(false)}
        user={conversation.otherUser}
        isCallActive={isVideoCallActive}
      />

      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          isOpen={showImagePreview}
          onClose={() => setShowImagePreview(false)}
          imageUrl={previewImage.url}
          imageName={previewImage.name}
          imageSize={previewImage.size}
        />
      )}
    </div>
  );
}
