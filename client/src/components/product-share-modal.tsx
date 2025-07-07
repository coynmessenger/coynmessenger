import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Send, Check, MessageCircle } from 'lucide-react';

interface Product {
  ASIN: string;
  title: string;
  price: string;
  currency: string;
  imageUrl: string;
  images?: string[];
  productUrl: string;
  rating: number;
  reviewCount: number;
  category: string;
  brand?: string;
  description?: string;
  affiliateInfo?: {
    associateTag: string;
    commissionRate: number;
    trackingId: string;
  };
}

interface ProductShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onShare: (conversationIds: number[]) => void;
  isSharing: boolean;
}

export function ProductShareModal({ isOpen, onClose, product, onShare, isSharing }: ProductShareModalProps) {
  const [selectedConversations, setSelectedConversations] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Get connected user from localStorage for conversation query
  const connectedUserString = localStorage.getItem('connectedUser');
  const connectedUser = connectedUserString ? JSON.parse(connectedUserString) : null;

  const conversationsQuery = useQuery({
    queryKey: ['/api/conversations', connectedUser?.id],
    queryFn: () => {
      if (!connectedUser?.id) return [];
      return fetch(`/api/conversations?userId=${connectedUser.id}`).then(res => res.json());
    },
    enabled: !!product && isOpen && !!connectedUser?.id
  });

  const conversations = conversationsQuery.data || [];

  const filteredConversations = conversations.filter(conversation => {
    if (!conversation.otherUser) return false;
    const searchText = searchQuery.toLowerCase();
    const displayName = conversation.otherUser.displayName?.toLowerCase() || '';
    const username = conversation.otherUser.username?.toLowerCase() || '';
    return displayName.includes(searchText) || username.includes(searchText);
  });

  const toggleConversationSelection = (conversationId: number) => {
    const newSelected = new Set(selectedConversations);
    if (newSelected.has(conversationId)) {
      newSelected.delete(conversationId);
    } else {
      newSelected.add(conversationId);
    }
    setSelectedConversations(newSelected);
  };

  const handleShare = async () => {
    if (selectedConversations.size === 0 || !product) return;
    const conversationIds = Array.from(selectedConversations);
    await onShare(conversationIds);
    setSelectedConversations(new Set());
    onClose();
  };

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return numPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-lg font-semibold">Share Product</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-6 pt-0">
          {/* Product Preview */}
          {product && (
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4 mb-4 border">
              <div className="flex items-center gap-3">
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  className="w-14 h-14 object-cover rounded-lg"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-foreground line-clamp-1 mb-1">
                    {product.title}
                  </h4>
                  <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                    ${formatPrice(product.price)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 border-gray-300 dark:border-slate-600 focus:border-orange-500"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            </div>
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto mb-4 min-h-0">
            {filteredConversations.length > 0 ? (
              <div className="space-y-2">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => toggleConversationSelection(conversation.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedConversations.has(conversation.id)
                        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-600'
                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={conversation.otherUser?.profilePicture || undefined} />
                      <AvatarFallback className="bg-orange-500 text-white text-sm font-medium">
                        {conversation.otherUser?.displayName?.charAt(0) || conversation.otherUser?.username?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {conversation.otherUser?.displayName || conversation.otherUser?.username || 'Unknown User'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {conversation.otherUser?.username && conversation.otherUser?.displayName !== conversation.otherUser?.username 
                          ? `@${conversation.otherUser.username}` 
                          : 'COYN Contact'}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {selectedConversations.has(conversation.id) ? (
                        <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 border-2 border-gray-300 dark:border-slate-600 rounded-full"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="bg-gray-100 dark:bg-slate-800 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1">No contacts found</h3>
                <p className="text-xs text-muted-foreground">
                  {searchQuery ? 'Try a different search term' : 'Start chatting to see contacts here'}
                </p>
              </div>
            )}
          </div>

          {/* Selected Count */}
          {selectedConversations.size > 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800 mb-4">
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300 text-center">
                {selectedConversations.size} contact{selectedConversations.size > 1 ? 's' : ''} selected
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="border-t p-6 pt-4 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-11"
            disabled={isSharing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={selectedConversations.size === 0 || isSharing}
            className="flex-1 h-11 bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isSharing ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Sending...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                <span>Send</span>
              </div>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}