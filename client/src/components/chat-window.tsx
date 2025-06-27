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
import type { User, Conversation, Message } from "@shared/schema";
import { ArrowLeft, Phone, Video, MoreVertical, Plus, Send, Smile, X, Coins, Trash2, Home, ArrowUp, Reply, Share, Users } from "lucide-react";
import { FaBitcoin } from "react-icons/fa";
import { SiBinance, SiTether } from "react-icons/si";
import { UserAvatarIcon } from "@/components/ui/user-avatar-icon";
import coynLogoPath from "@assets/COYN-symbol-square_1750891892214.png";
import { formatDistanceToNow } from "date-fns";

interface ChatWindowProps {
  conversation: Conversation & { otherUser: User };
  onOpenVideoCall: () => void;
  onToggleSidebar: () => void;
  onBack?: () => void;
  searchQuery?: string;
}

export default function ChatWindow({ conversation, onOpenVideoCall, onToggleSidebar, onBack, searchQuery }: ChatWindowProps) {
  const [message, setMessage] = useState("");
  const [showCryptoSend, setShowCryptoSend] = useState(false);
  const [cryptoAmount, setCryptoAmount] = useState("");
  const [selectedCrypto, setSelectedCrypto] = useState<string>("");
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const [cryptoStep, setCryptoStep] = useState<"amount" | "confirm">("amount");

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<Set<number>>(new Set());
  const [showShareModal, setShowShareModal] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [searchResultCount, setSearchResultCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Popular emojis for quick access
  const popularEmojis = [
    "😀", "😂", "😍", "😎", "😊", "😔", "😮", "😤",
    "👍", "👎", "👏", "🙏", "💪", "✌️", "🤝", "👋",
    "❤️", "💙", "💚", "💛", "🧡", "💜", "🖤", "🤍",
    "🔥", "💎", "⚡", "⭐", "🌟", "💯", "🎉", "🚀",
    "💰", "💸", "🪙", "📈", "📉", "💳", "🏦", "🎯"
  ];

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

    sendMessageMutation.mutate({
      content: message,
      messageType: "text",
    });

    setMessage("");
    setShowEmojiPicker(false);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
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
      const isScrolledUp = scrollTop < scrollHeight - clientHeight - 100;
      setShowBackToTop(isScrolledUp);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isScrolledUp = scrollTop < scrollHeight - clientHeight - 100;
      setShowBackToTop(isScrolledUp);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    messagesContainerRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Function to highlight search text
  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm || !text) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-300 dark:bg-yellow-600 text-black dark:text-white px-1 rounded-md font-semibold">
          {part}
        </mark>
      ) : part
    );
  };

  // Auto-scroll to first search result and update count
  useEffect(() => {
    if (searchQuery && searchQuery.length >= 2 && messages?.length) {
      const searchResults = messages.filter(msg => 
        msg.content?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      setSearchResultCount(searchResults.length);
      
      if (searchResults.length > 0) {
        // Use setTimeout to ensure DOM is updated after highlighting
        setTimeout(() => {
          const firstResultElement = document.querySelector(`[data-message-id="${searchResults[0].id}"]`);
          if (firstResultElement) {
            firstResultElement.scrollIntoView({ 
              behavior: 'smooth',
              block: 'center'
            });
            
            // Add a temporary highlight animation to the scrolled-to message
            firstResultElement.classList.add('search-highlight-pulse');
            setTimeout(() => {
              firstResultElement.classList.remove('search-highlight-pulse');
            }, 2000);
          }
        }, 100);
      }
    } else {
      setSearchResultCount(0);
    }
  }, [searchQuery, messages]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat Header */}
      <div className="bg-white dark:bg-card border-b border-border p-4 flex items-center justify-between">
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
              <AvatarImage src={conversation.otherUser.profilePicture || ""} />
              <AvatarFallback className="bg-gray-200 dark:bg-gray-700">
                <UserAvatarIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <h2 className="font-semibold text-foreground">{conversation.otherUser.displayName}</h2>
              <div className="flex items-center space-x-2">
                <p className="text-xs text-muted-foreground">{conversation.otherUser.walletAddress}</p>
                {searchQuery && searchResultCount > 0 && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                    {searchResultCount} {searchResultCount === 1 ? 'match' : 'matches'}
                  </Badge>
                )}
              </div>
            </div>
          </Button>
        </div>

      </div>

      {/* Chat Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto bg-white dark:bg-background px-4 relative"
      >

        
        {messages.map((msg, index) => (
          <div key={msg.id} className={`${index > 0 ? 'mt-3' : 'mt-1'}`}>
            {msg.messageType === "text" ? (
                msg.senderId === 5 ? (
                  // Sent message (current user) - with delete option
                  <div className="flex justify-end group" data-message-id={msg.id}>
                    <div className="relative">
                      <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-3 max-w-xs lg:max-w-md shadow-sm">
                        <p className="text-sm font-medium break-words">{highlightText(msg.content || "", searchQuery || "")}</p>
                        <span className="text-xs text-primary-foreground/80 mt-1 block">
                          {formatTimestamp(msg.timestamp)}
                        </span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute -top-1 -left-8 h-6 w-6 text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity bg-transparent hover:bg-gray-100 dark:hover:bg-slate-700/20 rounded-full"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                          <DropdownMenuItem
                            onClick={() => deleteMessageMutation.mutate(msg.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950 justify-center"
                            disabled={deleteMessageMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ) : (
                  // Received message
                  <div className="flex items-start space-x-3" data-message-id={msg.id}>
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={msg.sender.profilePicture || ""} />
                      <AvatarFallback>{msg.sender.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="bg-white dark:bg-muted rounded-2xl rounded-tl-md px-4 py-3 max-w-xs lg:max-w-md shadow-sm border border-border/50">
                      <p className="text-sm break-words text-foreground">{highlightText(msg.content || "", searchQuery || "")}</p>
                      <span className="text-xs text-muted-foreground mt-1 block">
                        {formatTimestamp(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                )
              ) : msg.messageType === "crypto" ? (
                // Crypto transaction message
                <div className="flex justify-center group">
                  <div className="relative">
                    <Card className="bg-gradient-to-r from-cyan-600/20 to-cyan-500/20 border-cyan-500/30 max-w-sm">
                      <CardContent className="p-4">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <Coins className="h-4 w-4 text-cyan-400" />
                        <span className="text-sm font-medium text-cyan-400">Crypto Transaction</span>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-cyan-400">
                          {msg.senderId === 5 ? '-' : '+'}{msg.cryptoAmount} {msg.cryptoCurrency}
                        </div>
                        <div className="text-xs text-slate-400 break-all">
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
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950 justify-center"
                          disabled={deleteMessageMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        <div ref={messagesEndRef} className="h-4" />

        {/* Back to Top Button */}
        {showBackToTop && (
          <Button
            onClick={scrollToTop}
            className="fixed bottom-24 right-6 z-50 w-12 h-12 rounded-full bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white shadow-lg transition-all duration-300 ease-in-out transform hover:scale-110"
            size="sm"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
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
      <div className="border-t border-border bg-white dark:bg-card p-4">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-cyan-400 hover:bg-slate-700"
              >
                <Plus className="h-4 w-4" />
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
                  />
                  <span>Send COYN</span>
                </div>
              </DropdownMenuItem>
              <div className="px-2 py-1">
                <div className="h-px bg-gray-200 dark:bg-slate-600" />
              </div>

            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="pr-12 h-12 sm:h-10 text-base sm:text-sm bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 focus:border-primary dark:focus:border-cyan-500 text-black dark:text-white placeholder-gray-500 dark:placeholder-slate-400 touch-manipulation"
            />
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-slate-400 hover:text-primary dark:hover:text-cyan-400 h-10 w-10 sm:h-8 sm:w-8 touch-manipulation"
                >
                  <Smile className="h-5 w-5 sm:h-4 sm:w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 bg-slate-800 border-slate-700" align="end">
                <div className="space-y-3">
                  <h3 className="font-medium text-slate-200">Popular Emojis</h3>
                  <div className="grid grid-cols-8 gap-2">
                    {popularEmojis.map((emoji, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleEmojiSelect(emoji)}
                        className="text-xl hover:bg-slate-700 rounded p-2 transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-slate-700">
                    <p className="text-xs text-slate-400">
                      Tip: You can also type emojis directly or copy-paste them!
                    </p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <Button 
            type="submit"
            size="icon"
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 h-12 w-12 sm:h-10 sm:w-10 touch-manipulation"
            disabled={sendMessageMutation.isPending || !message.trim()}
          >
            <Send className="h-5 w-5 sm:h-4 sm:w-4" />
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
        <DialogContent className="w-[90vw] sm:w-[85vw] max-w-md max-h-[90vh] m-4 sm:m-6 p-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-gray-200/60 dark:border-slate-700/60 flex flex-col rounded-2xl shadow-2xl">
          <DialogHeader className="p-6 pb-0 bg-gradient-to-r from-gray-50/50 to-white/50 dark:from-slate-800/50 dark:to-slate-900/50 rounded-t-2xl border-b border-gray-200/30 dark:border-slate-700/30">
            <DialogTitle className="text-black dark:text-white text-lg font-bold bg-gradient-to-r from-orange-600 to-orange-500 dark:from-cyan-400 dark:to-cyan-300 bg-clip-text text-transparent">
              {cryptoStep === "amount" ? `Send ${selectedCrypto}` : `Confirm ${selectedCrypto} Transfer`}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 pt-4 backdrop-blur-sm">
            {cryptoStep === "amount" && (
              <div className="space-y-6">
                <div className="relative">
                  <Label htmlFor="crypto-amount" className="text-black dark:text-white text-sm font-medium mb-3 block">
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
                      className="h-14 text-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-gray-200 dark:border-slate-600 focus:border-orange-400 dark:focus:border-cyan-400 focus:ring-2 focus:ring-orange-100 dark:focus:ring-cyan-900/50 text-black dark:text-white placeholder-gray-400 dark:placeholder-slate-500 pr-28 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                      <span className="text-sm font-semibold text-gray-700 dark:text-slate-300 bg-gray-100/80 dark:bg-slate-700/80 px-2 py-1 rounded-md">
                        {selectedCrypto}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 dark:from-slate-800/80 dark:to-slate-700/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-slate-600/50 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-slate-400">Recipient:</span>
                    <span className="text-sm font-semibold text-black dark:text-white bg-white/60 dark:bg-slate-900/60 px-3 py-1 rounded-lg">
                      {conversation.otherUser.displayName}
                    </span>
                  </div>
                </div>
                
                <div className="flex space-x-3 pt-6">
                  <Button
                    onClick={handleAmountConfirm}
                    className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 dark:from-cyan-500 dark:to-cyan-600 dark:hover:from-cyan-600 dark:hover:to-cyan-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    disabled={!cryptoAmount || parseFloat(cryptoAmount) <= 0}
                  >
                    Continue
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetCryptoModal}
                    className="flex-1 h-12 border-gray-300 dark:border-slate-600 text-black dark:text-white hover:bg-gray-50/80 dark:hover:bg-slate-700/80 backdrop-blur-sm rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md"
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
          onOpenVideoCall();
        }}
        onSendMessage={() => {
          setShowUserProfile(false);
          // Focus on message input - can be enhanced later
        }}
      />
    </div>
  );
}
