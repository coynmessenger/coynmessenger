import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User, Conversation, Message } from "@shared/schema";
import { Search, Share2 } from "lucide-react";
import sendIconPath from "@assets/SENDICON_1769058532502.png";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMessages: Set<number>;
  currentConversationId: number;
  userId: number | null;
}

export default function ShareModal({ isOpen, onClose, selectedMessages, currentConversationId, userId }: ShareModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversations, setSelectedConversations] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: conversations = [] } = useQuery<(Conversation & { otherUser: User })[]>({
    queryKey: ["/api/conversations"],
    enabled: isOpen,
  });

  const { data: messages = [] } = useQuery<(Message & { sender: User })[]>({
    queryKey: ["/api/conversations", currentConversationId, "messages"],
    enabled: isOpen,
  });

  const shareMessagesMutation = useMutation({
    mutationFn: async (data: { 
      conversationIds: number[];
      messageIds: number[];
      userId: number;
    }) => {
      return apiRequest("POST", "/api/messages/share", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Messages shared successfully",
        description: `Shared to ${selectedConversations.size} conversation${selectedConversations.size > 1 ? 's' : ''}`,
      });
      onClose();
      setSelectedConversations(new Set());
    },
    onError: () => {
      toast({
        title: "Failed to share messages",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredConversations = conversations.filter(conv => 
    conv.id !== currentConversationId &&
    (conv.otherUser.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
     conv.otherUser.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedMessageObjects = messages.filter(msg => selectedMessages.has(msg.id));

  const handleShare = () => {
    if (selectedConversations.size === 0) {
      toast({
        title: "No conversations selected",
        description: "Please select conversations to share to.",
        variant: "destructive",
      });
      return;
    }

    if (!userId) {
      toast({
        title: "Not authenticated",
        description: "Please sign in to share messages.",
        variant: "destructive",
      });
      return;
    }

    shareMessagesMutation.mutate({
      conversationIds: Array.from(selectedConversations),
      messageIds: Array.from(selectedMessages),
      userId: userId,
    });
  };

  const toggleConversationSelection = (conversationId: number) => {
    const newSelected = new Set(selectedConversations);
    if (newSelected.has(conversationId)) {
      newSelected.delete(conversationId);
    } else {
      newSelected.add(conversationId);
    }
    setSelectedConversations(newSelected);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[380px] p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 overflow-hidden rounded-2xl gap-0 shadow-2xl [&>button[class*='absolute']]:hidden">
        {/* Top Header Section */}
        <div className="relative px-6 pt-8 pb-6 text-center bg-gradient-to-b from-orange-50 dark:from-orange-950/30 to-transparent">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-orange-100 dark:bg-orange-900/50 shadow-lg shadow-orange-200/50 dark:shadow-orange-900/30 border border-orange-200 dark:border-orange-700">
            <Share2 className="w-8 h-8 text-orange-500" />
          </div>
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Share Messages
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            Share {selectedMessages.size} message{selectedMessages.size > 1 ? 's' : ''} to conversations
          </DialogDescription>
        </div>

        {/* Content Area */}
        <div className="px-6 pb-2">
          {/* Messages Preview */}
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 max-h-32 overflow-y-auto mb-3">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-2">
              Message preview:
            </p>
            {selectedMessageObjects.slice(0, 3).map((message) => (
              <div key={message.id} className="text-xs text-gray-700 dark:text-gray-300 truncate">
                • {message.content}
              </div>
            ))}
            {selectedMessageObjects.length > 3 && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                +{selectedMessageObjects.length - 3} more...
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 text-sm border-gray-200 dark:border-gray-700 focus:border-orange-500 bg-white dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          {/* Conversation List */}
          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => toggleConversationSelection(conversation.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                  selectedConversations.has(conversation.id)
                    ? "bg-orange-50 dark:bg-orange-900/20 ring-1 ring-orange-200 dark:ring-orange-700"
                    : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                }`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={conversation.otherUser.profilePicture || undefined} />
                  <AvatarFallback className="bg-orange-500 text-white text-xs font-semibold">
                    {conversation.otherUser.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {conversation.otherUser.displayName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    @{conversation.otherUser.username}
                  </p>
                </div>
                {selectedConversations.has(conversation.id) && (
                  <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredConversations.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No conversations found</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-5 space-y-3">
          <Button
            onClick={handleShare}
            disabled={selectedConversations.size === 0 || shareMessagesMutation.isPending}
            className="w-full h-12 rounded-xl font-semibold text-sm shadow-lg transition-all bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 shadow-orange-300/30 text-white disabled:opacity-50"
          >
            <img src={sendIconPath} alt="Send" className="h-4 w-4 mr-2" />
            Share to {selectedConversations.size} {selectedConversations.size === 1 ? 'Chat' : 'Chats'}
          </Button>

          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full h-10 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium text-sm"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}