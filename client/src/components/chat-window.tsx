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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import EscrowModal from "@/components/escrow-modal";
import type { User, Conversation, Message } from "@shared/schema";
import { ArrowLeft, Phone, Video, MoreVertical, Plus, Send, Smile, X, Coins, Trash2, Shield, Home } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ChatWindowProps {
  conversation: Conversation & { otherUser: User };
  onOpenVideoCall: () => void;
  onToggleSidebar: () => void;
}

export default function ChatWindow({ conversation, onOpenVideoCall, onToggleSidebar }: ChatWindowProps) {
  const [message, setMessage] = useState("");
  const [showCryptoSend, setShowCryptoSend] = useState(false);
  const [cryptoAmount, setCryptoAmount] = useState("");
  const [showEscrowModal, setShowEscrowModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversation.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balances"] });
      setCryptoAmount("");
      setShowCryptoSend(false);
      toast({
        title: "Crypto sent successfully",
        description: `${cryptoAmount} COYN sent to ${conversation.otherUser.displayName}`,
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

  const handleSendCrypto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cryptoAmount || parseFloat(cryptoAmount) <= 0) return;

    sendCryptoMutation.mutate({
      toUserId: conversation.otherUser.id,
      currency: "COYN",
      amount: cryptoAmount,
    });
  };

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Chat Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-slate-400 mr-2"
            onClick={onToggleSidebar}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarImage src={conversation.otherUser.profilePicture || ""} />
            <AvatarFallback>{conversation.otherUser.displayName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold">{conversation.otherUser.displayName}</h2>
            <p className="text-xs text-slate-400">{conversation.otherUser.walletAddress}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="text-cyan-400 hover:bg-slate-700">
            <Phone className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-cyan-400 hover:bg-slate-700"
            onClick={onOpenVideoCall}
          >
            <Video className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:bg-slate-700">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
              <DropdownMenuItem
                onClick={() => setShowEscrowModal(true)}
                className="text-slate-300 hover:text-slate-100 hover:bg-slate-700"
              >
                🛡️ Manage Escrow
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-slate-900">
        <div className="space-y-4 min-h-full">
          {messages.map((msg) => (
            <div key={msg.id}>
              {msg.messageType === "text" ? (
                msg.senderId === 5 ? (
                  // Sent message (current user) - with delete option
                  <div className="flex justify-end items-start group">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-slate-400 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity mr-2 mt-2"
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                        <DropdownMenuItem
                          onClick={() => deleteMessageMutation.mutate(msg.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-950"
                          disabled={deleteMessageMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Message
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="bg-cyan-500 text-slate-900 rounded-2xl rounded-tr-md px-4 py-3 max-w-xs lg:max-w-md relative">
                      <p className="text-sm font-medium break-words">{msg.content}</p>
                      <span className="text-xs text-slate-700 mt-1 block">
                        {formatTimestamp(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                ) : (
                  // Received message
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={msg.sender.profilePicture || ""} />
                      <AvatarFallback>{msg.sender.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="bg-slate-700 rounded-2xl rounded-tl-md px-4 py-3 max-w-xs lg:max-w-md">
                      <p className="text-sm break-words">{msg.content}</p>
                      <span className="text-xs text-slate-400 mt-1 block">
                        {formatTimestamp(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                )
              ) : msg.messageType === "crypto" ? (
                // Crypto transaction message
                <div className="flex justify-center group">
                  {msg.senderId === 5 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-slate-400 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity mr-2"
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                        <DropdownMenuItem
                          onClick={() => deleteMessageMutation.mutate(msg.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-950"
                          disabled={deleteMessageMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Transaction
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
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
                </div>
              ) : null}
            </div>
          ))}
          <div ref={messagesEndRef} className="h-2" />
        </div>
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
      <div className="border-t border-slate-700 bg-slate-800 p-4">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="pr-12 bg-slate-700 border-slate-600 focus:border-cyan-500"
            />
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-cyan-400"
                >
                  <Smile className="h-4 w-4" />
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
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-900"
            disabled={sendMessageMutation.isPending || !message.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Escrow Modal */}
      <EscrowModal
        isOpen={showEscrowModal}
        onClose={() => setShowEscrowModal(false)}
        conversationId={conversation.id}
        otherUser={conversation.otherUser}
      />
    </div>
  );
}
