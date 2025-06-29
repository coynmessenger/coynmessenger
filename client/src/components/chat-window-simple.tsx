import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Send, Plus, ArrowLeft, Coins, Copy, Trash2, Phone, Video
} from "lucide-react";
import { FaBitcoin } from "react-icons/fa";
import { SiBinance } from "react-icons/si";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Message, Conversation, User } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface ChatWindowProps {
  conversation: Conversation & { otherUser: User };
  onToggleSidebar: () => void;
  onBack?: () => void;
  searchQuery?: string;
}

function getEffectiveDisplayName(user: User): string {
  if (user.signInName) return user.signInName;
  if (user.displayName && user.displayName !== "COYNUSER") return user.displayName;
  if (user.walletAddress) {
    const address = user.walletAddress.toLowerCase();
    return `@${address.slice(-6)}`;
  }
  return user.username || "Unknown";
}

export default function ChatWindow({ conversation, onToggleSidebar, onBack, searchQuery }: ChatWindowProps) {
  const [message, setMessage] = useState("");
  const [hoveredMessage, setHoveredMessage] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Messages query
  const { data: messages = [] } = useQuery<(Message & { sender: User })[]>({
    queryKey: ["/api/conversations", conversation.id, "messages"],
    staleTime: 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; messageType: string }) => {
      return apiRequest("POST", `/api/conversations/${conversation.id}/messages`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversation.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (error) => {
      console.error("Send message error:", error);
      toast({
        title: "Failed to send message",
        description: "Please try again",
        variant: "destructive"
      });
    },
  });

  // Send crypto mutation
  const sendCryptoMutation = useMutation({
    mutationFn: async (data: { 
      amount: string; 
      currency: string; 
      recipient: string; 
      conversationId: number;
    }) => {
      return apiRequest("POST", "/api/wallet/send", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversation.id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balances"] });
      toast({
        title: "Crypto sent successfully",
        description: "Transaction completed",
      });
    },
    onError: (error) => {
      console.error("Send crypto error:", error);
      toast({
        title: "Failed to send crypto",
        description: "Please try again",
        variant: "destructive"
      });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    sendMessageMutation.mutate({
      content: message,
      messageType: "text"
    });

    setMessage("");
  };

  const handleQuickSend = (currency: string) => {
    const amount = "0.01";
    sendCryptoMutation.mutate({
      amount,
      currency,
      recipient: conversation.otherUser.walletAddress,
      conversationId: conversation.id
    });
  };

  const handleCopyMessage = (message: Message) => {
    const textToCopy = message.content || `${message.cryptoAmount} ${message.cryptoCurrency}`;
    navigator.clipboard.writeText(textToCopy);
    toast({
      title: "Message copied",
      description: "Message copied to clipboard",
      duration: 1500,
    });
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string | Date | null) => {
    try {
      if (!timestamp) return "No date";
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid date";
    }
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-white/95 to-gray-50/95 dark:from-slate-900/95 dark:to-slate-800/95 backdrop-blur-xl relative">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/20 dark:border-slate-700/50 bg-gradient-to-r from-white/90 to-gray-50/90 dark:from-slate-800/90 dark:to-slate-700/90 backdrop-blur-xl shadow-lg">
        <div className="flex items-center space-x-3">
          {onBack && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onBack}
              className="h-8 w-8 hover:bg-white/20 dark:hover:bg-slate-700/50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 dark:from-cyan-400 dark:to-cyan-500 flex items-center justify-center text-white font-semibold shadow-lg">
              {getEffectiveDisplayName(conversation.otherUser).charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                {getEffectiveDisplayName(conversation.otherUser)}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono max-w-24 truncate">
                {conversation.otherUser.walletAddress ? 
                  `${conversation.otherUser.walletAddress.slice(0, 6)}...${conversation.otherUser.walletAddress.slice(-4)}` : 
                  "No address"
                }
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-white/20 dark:hover:bg-slate-700/50"
          >
            <Phone className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-white/20 dark:hover:bg-slate-700/50"
          >
            <Video className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 bg-gradient-to-br from-white/40 to-gray-50/40 dark:from-slate-900/40 dark:to-slate-800/40 backdrop-blur-sm"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.1) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(120, 219, 255, 0.1) 0%, transparent 50%)`
        }}
      >
        {messages.map((msg, index) => {
          const isCurrentUser = msg.senderId === 5;
          
          return (
            <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} group mb-4`}>
              <div className="relative max-w-xs sm:max-w-md lg:max-w-lg">
                {msg.messageType === "text" ? (
                  <div
                    className={`relative ${isCurrentUser ? 'ml-8' : 'mr-8'}`}
                    onMouseEnter={() => setHoveredMessage(msg.id)}
                    onMouseLeave={() => setHoveredMessage(null)}
                  >
                    <div className={`${isCurrentUser 
                      ? 'bg-gradient-to-br from-orange-500/90 to-orange-600/90 dark:from-cyan-500/90 dark:to-cyan-600/90 text-white rounded-2xl rounded-tr-md' 
                      : 'bg-white/80 dark:bg-slate-800/80 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tl-md'} px-4 py-3 shadow-lg hover:shadow-xl transition-shadow duration-300 backdrop-blur-xl border border-gray-200/50 dark:border-slate-600/50`}>
                      <p className="text-sm break-words">{msg.content}</p>
                      <span className={`text-xs ${isCurrentUser ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'} mt-1 block`}>
                        {formatTimestamp(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                ) : msg.messageType === "crypto" ? (
                  // Crypto transaction message
                  <div className="flex justify-center group mb-4" data-message-id={msg.id}>
                    <div className="relative">
                      <Card className="bg-gradient-to-br from-cyan-100/90 to-blue-100/90 dark:from-cyan-900/40 dark:to-blue-900/40 border border-cyan-200/50 dark:border-cyan-600/30 max-w-sm w-full shadow-lg rounded-3xl">
                        <CardContent className="p-6 text-center">
                          <div className="flex items-center justify-center space-x-2 mb-4">
                            <Coins className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                            <span className="text-sm font-medium text-cyan-600 dark:text-cyan-400">Crypto Transaction</span>
                          </div>
                          <div className="text-center space-y-3">
                            <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">
                              {msg.senderId === 5 ? '-' : '+'}{msg.cryptoAmount} {msg.cryptoCurrency}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 break-all px-2">
                              To: {msg.senderId === 5 ? conversation.otherUser.walletAddress : msg.sender.walletAddress}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              {formatTimestamp(msg.timestamp)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : null}

                {/* Message options for sent messages */}
                {isCurrentUser && hoveredMessage === msg.id && (
                  <div className="absolute right-full top-1/2 transform -translate-y-1/2 mr-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopyMessage(msg)}
                      className="h-7 w-7 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 shadow-md"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 shadow-md"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {/* Message options for received messages */}
                {!isCurrentUser && hoveredMessage === msg.id && (
                  <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopyMessage(msg)}
                      className="h-7 w-7 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 shadow-md"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-white/20 dark:border-slate-700/50 bg-gradient-to-r from-white/90 to-gray-50/90 dark:from-slate-900/90 dark:to-slate-800/90 backdrop-blur-xl p-3 sm:p-4 shadow-lg">
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
                onClick={() => handleQuickSend('BTC')}
                className="text-black dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <FaBitcoin className="w-4 h-4 text-orange-500" />
                  <span>Send BTC</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleQuickSend('BNB')}
                className="text-black dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <SiBinance className="w-4 h-4 text-yellow-500" />
                  <span>Send BNB</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleQuickSend('USDT')}
                className="text-black dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">T</div>
                  <span>Send USDT</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleQuickSend('COYN')}
                className="text-black dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold">C</div>
                  <span>Send COYN</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="bg-white/90 dark:bg-slate-800/90 border-gray-300/50 dark:border-slate-600/50 focus:border-orange-400 dark:focus:border-cyan-400 backdrop-blur-sm transition-all duration-300 focus:shadow-lg hover:bg-white dark:hover:bg-slate-800 h-10 sm:h-12 text-sm sm:text-base"
            />
          </div>

          <Button 
            type="submit" 
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="bg-gradient-to-r from-orange-500 to-orange-600 dark:from-cyan-500 dark:to-cyan-600 hover:from-orange-600 hover:to-orange-700 dark:hover:from-cyan-600 dark:hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 backdrop-blur-sm h-8 w-8 sm:h-10 sm:w-10"
            size="icon"
          >
            <Send className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}