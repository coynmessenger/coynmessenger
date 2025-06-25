import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User, Conversation, Message } from "@shared/schema";
import { Search, Send } from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMessages: Set<number>;
  currentConversationId: number;
}

export default function ShareModal({ isOpen, onClose, selectedMessages, currentConversationId }: ShareModalProps) {
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

    shareMessagesMutation.mutate({
      conversationIds: Array.from(selectedConversations),
      messageIds: Array.from(selectedMessages),
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Messages</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Messages Preview */}
          <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 max-h-32 overflow-y-auto">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Sharing {selectedMessages.size} message{selectedMessages.size > 1 ? 's' : ''}:
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Conversation List */}
          <div className="max-h-48 overflow-y-auto space-y-2">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => toggleConversationSelection(conversation.id)}
                className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${
                  selectedConversations.has(conversation.id)
                    ? "bg-orange-100 dark:bg-cyan-900/30 border border-orange-300 dark:border-cyan-600"
                    : "hover:bg-gray-100 dark:hover:bg-slate-700"
                }`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 dark:from-cyan-400 dark:to-cyan-600 text-white text-xs font-semibold">
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
                  <div className="w-4 h-4 bg-orange-500 dark:bg-cyan-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
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

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {selectedConversations.size} conversation{selectedConversations.size !== 1 ? 's' : ''} selected
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleShare}
                disabled={selectedConversations.size === 0 || shareMessagesMutation.isPending}
                className="bg-orange-500 hover:bg-orange-600 dark:bg-cyan-600 dark:hover:bg-cyan-700"
              >
                <Send className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}