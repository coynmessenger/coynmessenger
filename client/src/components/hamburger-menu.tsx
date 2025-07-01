import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MoreVertical, Settings, Star, MessageCircle, UserPlus, Receipt, Trash2 } from "lucide-react";
import type { User, Message } from "@shared/schema";
import AddContactModal from "./add-contact-modal";

interface HamburgerMenuProps {
  onOpenSettings: () => void;
}

interface StarredMessage extends Message {
  sender: User;
  conversationId: number;
}

// Utility function to get effective display name (mirrors backend logic)
function getEffectiveDisplayName(user: User): string {
  // Priority: 1. Profile display name (most recent), 2. Sign-in name, 3. @id format
  if (user.displayName && !user.displayName.startsWith('@')) {
    return user.displayName;
  }
  if (user.signInName) {
    return user.signInName;
  }
  // Fallback to @id format using last 6 characters of wallet address
  if (user.walletAddress) {
    return `@${user.walletAddress.slice(-6)}`;
  }
  // Ultimate fallback
  return user.displayName || user.username || "Unknown User";
}

export default function HamburgerMenu({ onOpenSettings }: HamburgerMenuProps) {
  const [showStarredMessages, setShowStarredMessages] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [messageToUnstar, setMessageToUnstar] = useState<StarredMessage | null>(null);
  const [showUnstarConfirm, setShowUnstarConfirm] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<StarredMessage | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get connected user ID from localStorage
  const getConnectedUserId = () => {
    const storedUser = localStorage.getItem('connectedUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        return parsedUser.id;
      } catch (e) {
        console.error('Failed to parse stored user:', e);
      }
    }
    return null;
  };

  const connectedUserId = getConnectedUserId();

  // Fetch starred messages
  const { data: starredMessages = [] } = useQuery<StarredMessage[]>({
    queryKey: ["/api/messages/starred", connectedUserId],
    queryFn: async () => {
      const url = connectedUserId ? `/api/messages/starred?userId=${connectedUserId}` : "/api/messages/starred";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch starred messages');
      }
      return response.json();
    },
    enabled: showStarredMessages,
  });

  // Fetch transaction history
  const { data: transactionHistory = [] } = useQuery<StarredMessage[]>({
    queryKey: ["/api/transactions/history", connectedUserId],
    queryFn: async () => {
      const url = connectedUserId ? `/api/transactions/history?userId=${connectedUserId}` : "/api/transactions/history";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch transaction history');
      }
      return response.json();
    },
    enabled: showTransactionHistory,
  });

  const formatTimestamp = (timestamp: string | Date | null) => {
    if (!timestamp) return "";
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleStarMessage = async (message: StarredMessage) => {
    // If message is starred and we're trying to unstar, show confirmation
    if (message.isStarred) {
      setMessageToUnstar(message);
      setShowUnstarConfirm(true);
      return;
    }
    
    // If message is not starred, star it directly
    try {
      const url = connectedUserId ? `/api/messages/${message.id}/star?userId=${connectedUserId}` : `/api/messages/${message.id}/star`;
      await apiRequest("PATCH", url, { 
        isStarred: true 
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/messages/starred", connectedUserId] });
      
      toast({
        title: "Message starred",
        description: "Message added to starred messages",
      });
    } catch (error) {
      toast({
        title: "Failed to star message",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const confirmUnstarMessage = async () => {
    if (!messageToUnstar) return;
    
    try {
      const url = connectedUserId ? `/api/messages/${messageToUnstar.id}/star?userId=${connectedUserId}` : `/api/messages/${messageToUnstar.id}/star`;
      await apiRequest("PATCH", url, { 
        isStarred: false 
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/messages/starred", connectedUserId] });
      
      toast({
        title: "Message unstarred",
        description: "Message removed from starred messages",
      });
    } catch (error) {
      toast({
        title: "Failed to unstar message",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setShowUnstarConfirm(false);
      setMessageToUnstar(null);
    }
  };

  const cancelUnstarMessage = () => {
    setShowUnstarConfirm(false);
    setMessageToUnstar(null);
  };

  const handleDeleteTransaction = (transaction: StarredMessage) => {
    setTransactionToDelete(transaction);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTransaction = async () => {
    if (!transactionToDelete) return;
    
    try {
      await apiRequest("DELETE", `/api/messages/${transactionToDelete.id}`, { 
        userId: connectedUserId 
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/transactions/history", connectedUserId] });
      
      toast({
        title: "Transaction deleted",
        description: "Transaction has been removed from your history",
      });
    } catch (error) {
      toast({
        title: "Failed to delete transaction",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setShowDeleteConfirm(false);
      setTransactionToDelete(null);
    }
  };

  const cancelDeleteTransaction = () => {
    setShowDeleteConfirm(false);
    setTransactionToDelete(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-10 w-10 hover:bg-accent"
            title="Menu"
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setShowAddContact(true)}>
            <UserPlus className="h-4 w-4 mr-3" />
            Add Contact
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowStarredMessages(true)}>
            <Star className="h-4 w-4 mr-3" />
            Starred Messages
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowTransactionHistory(true)}>
            <Receipt className="h-4 w-4 mr-3" />
            Transaction History
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onOpenSettings}>
            <Settings className="h-4 w-4 mr-3" />
            Settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Starred Messages Modal */}
      <Dialog open={showStarredMessages} onOpenChange={setShowStarredMessages}>
        <DialogContent className="w-[95vw] sm:w-[500px] max-h-[85vh] p-0 overflow-hidden bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-orange-200/30 dark:border-orange-800/30 shadow-2xl rounded-2xl">
          <div className="p-6 border-b border-orange-100 dark:border-orange-800 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20">
            <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-full">
                <Star className="h-5 w-5 text-orange-600 dark:text-orange-400 fill-current" />
              </div>
              Starred Messages
              {starredMessages.length > 0 && (
                <Badge variant="secondary" className="ml-auto bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
                  {starredMessages.length}
                </Badge>
              )}
            </DialogTitle>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {starredMessages.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-orange-100 dark:bg-orange-900 rounded-full w-fit mx-auto mb-4">
                  <Star className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No starred messages</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Star important messages to find them easily later
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {starredMessages.map((message) => (
                  <div 
                    key={message.id} 
                    className="group p-4 bg-gradient-to-r from-white to-orange-50/30 dark:from-gray-900 dark:to-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-800/30 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-orange-200 dark:ring-orange-800">
                        <AvatarImage src={message.sender.profilePicture || ""} />
                        <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white font-semibold">
                          {getEffectiveDisplayName(message.sender).charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {getEffectiveDisplayName(message.sender)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded-full">
                            {formatTimestamp(message.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 break-words leading-relaxed">
                          {message.content || `${message.cryptoAmount} ${message.cryptoCurrency}`}
                        </p>
                        {message.messageType === "crypto_transfer" && (
                          <Badge variant="secondary" className="mt-3 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
                            <MessageCircle className="h-3 w-3 mr-1" />
                            Crypto Transaction
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-70 group-hover:opacity-100 p-2 h-9 w-9 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-full transition-all duration-200 hover:scale-110"
                        onClick={() => handleStarMessage(message)}
                        title="Unstar message"
                      >
                        <Star className="h-4 w-4 text-orange-500 dark:text-orange-400 fill-current" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Contact Modal */}
      <AddContactModal
        isOpen={showAddContact}
        onClose={() => setShowAddContact(false)}
      />

      {/* Unstar Confirmation Dialog */}
      <AlertDialog open={showUnstarConfirm} onOpenChange={setShowUnstarConfirm}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from starred messages?</AlertDialogTitle>
            <AlertDialogDescription>
              This message will be removed from your starred messages. You can star it again anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelUnstarMessage}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmUnstarMessage}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transaction History Modal */}
      <Dialog open={showTransactionHistory} onOpenChange={setShowTransactionHistory}>
        <DialogContent className="w-[95vw] sm:w-[600px] max-h-[90vh] p-0 overflow-hidden bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-orange-200/30 dark:border-orange-800/30 shadow-2xl rounded-2xl">
          <div className="sticky top-0 z-10 p-6 border-b border-orange-100 dark:border-orange-800 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-lg font-semibold">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-full">
                  <Receipt className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                Transaction History
              </div>
              {transactionHistory.length > 0 && (
                <Badge variant="outline" className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700">
                  {transactionHistory.length} {transactionHistory.length === 1 ? 'transaction' : 'transactions'}
                </Badge>
              )}
            </DialogTitle>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {transactionHistory.length === 0 ? (
              <div className="text-center py-16">
                <div className="p-6 bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/50 dark:to-orange-800/30 rounded-2xl w-fit mx-auto mb-6">
                  <Receipt className="h-12 w-12 text-orange-600 dark:text-orange-400 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">No transactions yet</h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
                  Your crypto transactions will appear here once you start sending or receiving digital currencies
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactionHistory.map((transaction) => (
                  <div 
                    key={transaction.id} 
                    className="group relative p-5 bg-gradient-to-r from-white via-orange-50/20 to-white dark:from-gray-900 dark:via-orange-900/10 dark:to-gray-900 rounded-2xl border border-orange-100/60 dark:border-orange-800/40 hover:shadow-xl hover:border-orange-200 dark:hover:border-orange-700 transition-all duration-300 hover:scale-[1.01]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-12 w-12 ring-2 ring-orange-200 dark:ring-orange-800/50">
                          <AvatarImage src={transaction.sender.profilePicture || ""} />
                          <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white font-semibold text-sm">
                            {getEffectiveDisplayName(transaction.sender).charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          transaction.senderId === connectedUserId 
                            ? 'bg-red-500' 
                            : 'bg-green-500'
                        }`}>
                          {transaction.senderId === connectedUserId ? '−' : '+'}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {getEffectiveDisplayName(transaction.sender)}
                          </span>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${
                              transaction.senderId === connectedUserId 
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            }`}
                          >
                            {transaction.senderId === connectedUserId ? 'Sent' : 'Received'}
                          </Badge>
                          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                            {formatTimestamp(transaction.timestamp)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`text-xl font-bold ${
                            transaction.senderId === connectedUserId 
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-green-600 dark:text-green-400'
                          }`}>
                            {transaction.senderId === connectedUserId ? '−' : '+'}{transaction.cryptoAmount} {transaction.cryptoCurrency}
                          </div>
                        </div>
                        
                        {transaction.content && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                            "{transaction.content}"
                          </p>
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 p-2 h-10 w-10 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-all duration-200 hover:scale-110"
                        onClick={() => handleDeleteTransaction(transaction)}
                        title="Delete transaction"
                      >
                        <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Transaction Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-white dark:bg-black border border-orange-200/30 dark:border-orange-800/30 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This transaction will be permanently removed from your history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteTransaction}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteTransaction}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}