import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Search, Check, MessageCircle, Share2 } from 'lucide-react';
import sendIconPath from "@assets/SENDICON_1769058532502.png";

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

  const filteredConversations = conversations.filter((conversation: { id: number; otherUser?: { displayName?: string; username?: string; profilePicture?: string } }) => {
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
      <DialogContent hideCloseButton className="sm:max-w-[380px] p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 overflow-hidden rounded-2xl gap-0 shadow-2xl">
        {/* Top Header Section */}
        <div className="relative px-6 pt-8 pb-6 text-center bg-gradient-to-b from-orange-50 dark:from-orange-950/30 to-transparent">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-orange-100 dark:bg-orange-900/50 shadow-lg shadow-orange-200/50 dark:shadow-orange-900/30 border border-orange-200 dark:border-orange-700">
            <Share2 className="w-8 h-8 text-orange-500" />
          </div>
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Share Product
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            Share with your contacts
          </DialogDescription>
        </div>

        {/* Content Area */}
        <div className="px-6 pb-2">
          {/* Product Preview */}
          {product && (
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 mb-3">
              <div className="flex items-center gap-3">
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  className="w-12 h-12 object-cover rounded-lg shadow-sm"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                    {product.title}
                  </h4>
                  <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                    ${formatPrice(product.price)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative mb-3">
            <Input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 text-sm border-gray-200 dark:border-gray-700 focus:border-orange-500 bg-white dark:bg-gray-800 dark:text-gray-100"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>

          {/* Contacts List */}
          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {filteredConversations.length > 0 ? (
              <div>
                {filteredConversations.map((conversation: { id: number; otherUser?: { displayName?: string; username?: string; profilePicture?: string } }) => (
                  <div
                    key={conversation.id}
                    onClick={() => toggleConversationSelection(conversation.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                      selectedConversations.has(conversation.id)
                        ? 'bg-orange-50 dark:bg-orange-900/20 ring-1 ring-orange-200 dark:ring-orange-700'
                        : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={conversation.otherUser?.profilePicture || undefined} />
                      <AvatarFallback className="bg-orange-500 text-white text-xs font-medium">
                        {conversation.otherUser?.displayName?.charAt(0) || conversation.otherUser?.username?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {conversation.otherUser?.displayName || conversation.otherUser?.username || 'Unknown User'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight truncate">
                        {conversation.otherUser?.username && conversation.otherUser?.displayName !== conversation.otherUser?.username 
                          ? `@${conversation.otherUser.username}` 
                          : 'COYN Contact'}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {selectedConversations.has(conversation.id) ? (
                        <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center shadow-sm">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-full"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-2">
                  <MessageCircle className="h-5 w-5 text-gray-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">No contacts found</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'Try a different search term' : 'Start chatting to see contacts here'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-5 space-y-3">
          <Button
            onClick={handleShare}
            disabled={selectedConversations.size === 0 || isSharing}
            className="w-full h-12 rounded-xl font-semibold text-sm shadow-lg transition-all bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 shadow-orange-300/30 text-white disabled:opacity-50"
          >
            {isSharing ? (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Sending...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <img src={sendIconPath} alt="Send" className="h-4 w-4" />
                <span>Send to {selectedConversations.size} {selectedConversations.size === 1 ? 'Chat' : 'Chats'}</span>
              </div>
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full h-10 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium text-sm"
            disabled={isSharing}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}