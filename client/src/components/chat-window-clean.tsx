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
  const [message, setMessage] = useState("");
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<number>>(new Set());
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    name?: string;
    size?: number;
  } | null>(null);
  const [quickSendModal, setQuickSendModal] = useState(false);
  const [sendAmount, setSendAmount] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [showStarredMessages, setShowStarredMessages] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [searchUsers, setSearchUsers] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<{
    id: number;
    content: string;
    sender: string;
  } | null>(null);

  // Simple clean swipe-to-reply functionality (no hover options)
  const [swipeState, setSwipeState] = useState({
    isDragging: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    messageId: null as number | null
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Add global mouse event listeners for swipe functionality
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (swipeState.isDragging) {
        handleSwipeMove(e);
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
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

  // Listen for profile updates and refresh conversation data
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      console.log("Chat window received profile update:", event.detail);
      // Invalidate queries to refresh conversation and user data
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversation.id}/messages`] });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);
      
      return () => {
        window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
      };
    }
  }, [queryClient, conversation.id]);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Clean message handlers without any hover functionality
  const handleImagePreview = (imageUrl: string, imageName?: string, imageSize?: number) => {
    setPreviewImage({ url: imageUrl, name: imageName, size: imageSize });
    setShowImagePreview(true);
  };

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest("DELETE", `/api/messages/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversation.id, "messages"] });
      toast({
        title: "Message deleted",
        description: "The message has been deleted",
        duration: 1500,
      });
    },
    onError: (error) => {
      console.error("Delete message error:", error);
      toast({
        title: "Failed to delete message",
        description: "Please try again",
        variant: "destructive"
      });
    }
  });

  const handleReplyCancel = () => {
    setReplyToMessage(null);
  };

  const handleQuickSend = (currency: string) => {
    // Set meaningful default amounts for each currency
    const defaultAmounts = {
      'BTC': '0.001',  // ~$100 worth
      'BNB': '0.2',    // ~$120 worth
      'USDT': '100',   // $100 worth
      'COYN': '150'    // ~$120 worth
    };
    
    setSelectedCrypto(currency);
    setSendAmount(defaultAmounts[currency as keyof typeof defaultAmounts] || '1');
    setQuickSendModal(true);
  };

  const sendCryptoMutation = useMutation({
    mutationFn: async (cryptoData: { amount: string; currency: string }) => {
      return apiRequest("POST", `/api/conversations/${conversation.id}/messages`, {
        content: `Sent ${cryptoData.amount} ${cryptoData.currency}`,
        messageType: "crypto",
        cryptoAmount: parseFloat(cryptoData.amount),
        cryptoCurrency: cryptoData.currency,
        conversationId: conversation.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversation.id, "messages"] });
      setQuickSendModal(false);
      setSendAmount('');
      toast({
        title: "Crypto sent",
        description: `${sendAmount} ${selectedCrypto} sent successfully`,
        duration: 2000,
      });
    },
    onError: (error) => {
      console.error("Send crypto error:", error);
      toast({
        title: "Failed to send crypto",
        description: "Please try again",
        variant: "destructive"
      });
    }
  });

  // Simple swipe handlers without hover options
  const handleSwipeStart = (e: React.TouchEvent | React.MouseEvent, messageId: number) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setSwipeState({
      isDragging: true,
      startX: clientX,
      startY: clientY,
      offsetX: 0,
      messageId
    });
  };

  const handleSwipeMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!swipeState.isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - swipeState.startX;
    
    if (deltaX > 0 && deltaX < 100) {
      setSwipeState(prev => ({ ...prev, offsetX: deltaX }));
    }
  };

  const handleSwipeEnd = () => {
    if (swipeState.offsetX > 80 && swipeState.messageId) {
      // Trigger reply
      const message = messages?.find(m => m.id === swipeState.messageId);
      if (message) {
        setReplyToMessage({
          id: message.id,
          content: message.content || `${message.cryptoAmount} ${message.cryptoCurrency}`,
          sender: getEffectiveDisplayName(message.sender)
        });
        toast({
          title: "Reply mode activated",
          description: `Replying to ${getEffectiveDisplayName(message.sender)}`,
          duration: 1500,
        });
      }
    }
    
    setSwipeState({
      isDragging: false,
      startX: 0,
      startY: 0,
      offsetX: 0,
      messageId: null
    });
  };

  // Fetch messages for this conversation
  const { data: messages } = useQuery({
    queryKey: ["/api/conversations", conversation.id, "messages"],
    enabled: !!conversation.id,
  });

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-slate-800">
      {/* Chat header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="lg:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Avatar className="h-10 w-10">
              <AvatarImage src={conversation.otherUser?.profilePicture || ""} />
              <AvatarFallback>
                <UserAvatarIcon />
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium text-foreground">
                {conversation.otherUser ? getEffectiveDisplayName(conversation.otherUser) : "Unknown User"}
              </h3>
              <p className="text-sm text-muted-foreground">Online</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVoiceCall(true)}
              className="h-10 w-10 p-0"
              title="Voice call"
            >
              <Phone className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVideoCall(true)}
              className="h-10 w-10 p-0"
              title="Video call"
            >
              <Video className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages?.map((msg) => (
          <div key={msg.id} className="flex items-start space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={msg.sender.profilePicture || ""} />
              <AvatarFallback>
                <UserAvatarIcon />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 max-w-xs lg:max-w-md">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
                <p className="text-sm">{msg.content}</p>
                <span className="text-xs text-muted-foreground mt-1 block">
                  {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl">
        <div className="flex items-center space-x-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                // Handle send message
              }
            }}
          />
          <Button size="sm" className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Modals */}
      {showVoiceCall && (
        <VoiceCallModal
          otherUser={conversation.otherUser}
          onClose={() => setShowVoiceCall(false)}
          onCallStart={() => setIsCallActive(true)}
          onCallEnd={() => setIsCallActive(false)}
        />
      )}

      {showVideoCall && (
        <VideoCallModal
          otherUser={conversation.otherUser}
          onClose={() => setShowVideoCall(false)}
          onCallStart={() => setIsCallActive(true)}
          onCallEnd={() => setIsCallActive(false)}
        />
      )}
    </div>
  );
}