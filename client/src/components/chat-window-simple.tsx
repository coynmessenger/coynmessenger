import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import type { User, Conversation, Message } from "@shared/schema";
import { 
  Send, 
  ArrowLeft, 
  Phone, 
  Video, 
  MoreVertical,
  Search,
  Plus,
  Paperclip,
  Smile,
  ArrowDown,
  Copy,
  Star,
  Share2,
  Trash2
} from "lucide-react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { UserAvatarIcon } from "@/components/ui/user-avatar-icon";
import { cn } from "@/lib/utils";
import { EmojiPicker } from "@/components/emoji-picker";
import { GifPicker } from "@/components/gif-picker";
import { FaBitcoin } from "react-icons/fa";
import { SiBinance, SiTether } from "react-icons/si";
import coynLogoPath from "@assets/COYN-symbol-square_1750808237977.png";

function getEffectiveDisplayName(user: User): string {
  if (user.displayName) return user.displayName;
  if (user.signInName) return user.signInName;
  return `@${user.id}`;
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);

  // Get connected user ID from localStorage
  const getConnectedUserId = () => {
    const storedUser = localStorage.getItem('connectedUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        return parsedUser.id;
      } catch (e) {
        console.error('Error parsing connected user:', e);
      }
    }
    return null;
  };

  const connectedUserId = getConnectedUserId();
  
  // Check if this is a self-conversation (messaging yourself)
  const isSelfConversation = connectedUserId === conversation.otherUser.id;

  // Fetch messages for this conversation
  const { data: messages = [] } = useQuery<(Message & { sender: User })[]>({
    queryKey: ['/api/conversations', conversation.id, 'messages'],
    enabled: !!conversation.id,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { content: string; type: string }) => {
      if (!connectedUserId) {
        throw new Error('No connected user found');
      }
      
      return apiRequest(`/api/conversations/${conversation.id}/messages`, {
        method: 'POST',
        body: {
          content: messageData.content,
          type: messageData.type,
          senderId: connectedUserId,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/conversations', conversation.id, 'messages'] 
      });
      setMessage("");
      scrollToBottom();
    },
    onError: (error) => {
      console.error('Send message error:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle sending messages
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    sendMessageMutation.mutate({
      content: message,
      type: 'text',
    });
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Handle GIF selection
  const handleGifSelect = (gif: { id: string; url: string; title: string }) => {
    sendMessageMutation.mutate({
      content: gif.url,
      type: 'gif',
    });
    setShowGifPicker(false);
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Format message timestamp
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, (Message & { sender: User })[]>);

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, 'MMMM d, yyyy');
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border bg-card">
        <div className="flex items-center space-x-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-8 w-8 sm:h-10 sm:w-10"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}
          
          <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
            <AvatarImage src={conversation.otherUser.profilePicture} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              <UserAvatarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm sm:text-base truncate">
              {getEffectiveDisplayName(conversation.otherUser)}
              {isSelfConversation && " (You)"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {isSelfConversation ? "Message yourself" : "Online"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messageContainerRef}
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4"
      >
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex items-center justify-center my-4">
              <div className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">
                {formatDateHeader(date)}
              </div>
            </div>

            {/* Messages for this date */}
            {dateMessages.map((msg) => {
              const isOwnMessage = msg.senderId === connectedUserId;
              
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex mb-4",
                    isOwnMessage ? "justify-end" : "justify-start"
                  )}
                >
                  {!isOwnMessage && (
                    <Avatar className="h-8 w-8 mr-2 flex-shrink-0">
                      <AvatarImage src={msg.sender.profilePicture} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        <UserAvatarIcon className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={cn(
                      "max-w-[70%] rounded-lg p-3 relative group",
                      isOwnMessage
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {/* Message content */}
                    {msg.type === 'text' && (
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                    )}
                    
                    {msg.type === 'gif' && (
                      <div className="rounded-lg overflow-hidden">
                        <img
                          src={msg.content}
                          alt="GIF"
                          className="max-w-full h-auto"
                          style={{ maxHeight: '200px' }}
                        />
                      </div>
                    )}
                    
                    {msg.type === 'crypto_transfer' && (
                      <div className="flex items-center space-x-2 p-2 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 rounded-lg">
                        <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-xs">₿</span>
                        </div>
                        <div>
                          <p className="font-semibold text-sm">
                            {msg.cryptoAmount} {msg.cryptoType}
                          </p>
                          <p className="text-xs opacity-75">
                            Crypto Transfer
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {msg.type === 'product_share' && (
                      <div className="border rounded-lg p-3 bg-card cursor-pointer hover:bg-accent transition-colors">
                        <div className="flex items-center space-x-3">
                          <img
                            src={msg.productImage}
                            alt={msg.productTitle}
                            className="w-12 h-12 rounded-md object-cover"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-sm line-clamp-2">
                              {msg.productTitle}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              ${msg.productPrice}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Timestamp */}
                    <div
                      className={cn(
                        "text-xs mt-1 opacity-70",
                        isOwnMessage ? "text-right" : "text-left"
                      )}
                    >
                      {formatMessageTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-3 sm:p-4 border-t border-border bg-card">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          {/* Attachment Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* Message Input */}
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={sendMessageMutation.isPending}
            />
            

          </div>

          {/* Send Button */}
          <Button
            type="submit"
            size="icon"
            className="h-8 w-8"
            disabled={sendMessageMutation.isPending || !message.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>

        {/* Emoji Picker */}
        <div className="relative">
          <EmojiPicker
            onEmojiSelect={handleEmojiSelect}
            isOpen={showEmojiPicker}
            onOpenChange={setShowEmojiPicker}
          />
        </div>

        {/* GIF Picker */}
        <div className="relative">
          <GifPicker
            onGifSelect={handleGifSelect}
            isOpen={showGifPicker}
            onOpenChange={setShowGifPicker}
          />
        </div>
      </div>
    </div>
  );
}