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
        <DialogContent className="sm:max-w-[380px] p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 overflow-hidden rounded-2xl gap-0 shadow-2xl [&>button[class*='absolute']]:hidden">
          <div className="relative px-6 pt-8 pb-6 text-center bg-gradient-to-b from-orange-50 dark:from-orange-950/30 to-transparent">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-orange-100 dark:bg-orange-900/50 shadow-lg shadow-orange-200/50 dark:shadow-orange-900/30 border border-orange-200 dark:border-orange-700">
              <Star className="w-8 h-8 text-orange-500 fill-current" />
            </div>
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Starred Messages
            </DialogTitle>
            {starredMessages.length > 0 && (
              <Badge className="mt-2 bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300">
                {starredMessages.length} message{starredMessages.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-4 max-h-[400px]">
            {starredMessages.length === 0 ? (
              <div className="text-center py-8">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">No starred messages</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Star important messages to find them easily later
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {starredMessages.map((message) => (
                  <div 
                    key={message.id} 
                    className="group p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9 ring-1 ring-gray-200 dark:ring-gray-700 flex-shrink-0">
                        <AvatarImage src={message.sender.profilePicture || ""} />
                        <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white font-semibold text-xs">
                          {getEffectiveDisplayName(message.sender).charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                            {getEffectiveDisplayName(message.sender)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full flex-shrink-0">
                            {formatTimestamp(message.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300 break-words leading-relaxed line-clamp-2">
                          {message.content || `${message.cryptoAmount} ${message.cryptoCurrency}`}
                        </p>
                        {message.messageType === "crypto_transfer" && (
                          <Badge variant="secondary" className="mt-2 bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 text-xs">
                            <MessageCircle className="h-2.5 w-2.5 mr-1" />
                            Crypto
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-70 group-hover:opacity-100 p-1.5 h-7 w-7 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-full transition-all duration-200 flex-shrink-0"
                        onClick={() => handleStarMessage(message)}
                        title="Unstar message"
                      >
                        <Star className="h-3.5 w-3.5 text-orange-500 fill-current" />
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
        <AlertDialogContent className="sm:max-w-[380px] p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 overflow-hidden rounded-2xl gap-0 shadow-2xl">
          <div className="relative px-6 pt-8 pb-6 text-center bg-gradient-to-b from-orange-50 dark:from-orange-950/30 to-transparent">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-orange-100 dark:bg-orange-900/50 shadow-lg shadow-orange-200/50 dark:shadow-orange-900/30 border border-orange-200 dark:border-orange-700">
              <Star className="w-8 h-8 text-orange-500" />
            </div>
            <AlertDialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Remove starred message?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500 dark:text-gray-400">
              This message will be removed from your starred messages. You can star it again anytime.
            </AlertDialogDescription>
          </div>
          <div className="px-6 pb-5 pt-4 space-y-3">
            <AlertDialogAction 
              onClick={confirmUnstarMessage}
              className="w-full h-12 rounded-xl font-semibold text-sm shadow-lg transition-all bg-gradient-to-r from-red-500 to-red-400 hover:from-red-400 hover:to-red-300 shadow-red-300/30 text-white"
            >
              Remove
            </AlertDialogAction>
            <AlertDialogCancel 
              onClick={cancelUnstarMessage}
              className="w-full h-10 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium text-sm border-0 bg-transparent"
            >
              Cancel
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transaction History Modal */}
      <Dialog open={showTransactionHistory} onOpenChange={setShowTransactionHistory}>
        <DialogContent className="sm:max-w-[380px] p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 overflow-hidden rounded-2xl gap-0 shadow-2xl [&>button[class*='absolute']]:hidden">
          <div className="relative px-6 pt-8 pb-6 text-center bg-gradient-to-b from-orange-50 dark:from-orange-950/30 to-transparent">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-orange-100 dark:bg-orange-900/50 shadow-lg shadow-orange-200/50 dark:shadow-orange-900/30 border border-orange-200 dark:border-orange-700">
              <Receipt className="w-8 h-8 text-orange-500" />
            </div>
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Transaction History
            </DialogTitle>
            {transactionHistory.length > 0 && (
              <Badge className="mt-2 bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300">
                {transactionHistory.length} transaction{transactionHistory.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-4 max-h-[400px]">
            {transactionHistory.length === 0 ? (
              <div className="text-center py-8">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">No transactions yet</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Your crypto transactions will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactionHistory.map((transaction) => (
                  <div 
                    key={transaction.id} 
                    className="group p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9 ring-1 ring-gray-200 dark:ring-gray-700 flex-shrink-0">
                        <AvatarImage src={transaction.sender.profilePicture || ""} />
                        <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white font-semibold text-xs">
                          {getEffectiveDisplayName(transaction.sender).charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                            {getEffectiveDisplayName(transaction.sender)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full flex-shrink-0">
                            {formatTimestamp(transaction.timestamp)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-sm font-bold text-orange-600 dark:text-orange-400">
                            {transaction.senderId === connectedUserId ? '-' : '+'}{transaction.cryptoAmount} {transaction.cryptoCurrency}
                          </div>
                          <Badge className="bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 text-xs px-1.5 py-0.5">
                            {transaction.senderId === connectedUserId ? 'Sent' : 'Received'}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-1">
                          {transaction.content}
                        </p>
                        {/* BSCScan transaction link */}
                        {transaction.transactionHash && (transaction.cryptoCurrency === 'BNB' || transaction.cryptoCurrency === 'USDT' || transaction.cryptoCurrency === 'COYN') && (
                          <div className="mt-2">
                            <a
                              href={`https://bscscan.com/tx/${transaction.transactionHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors duration-200 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full border border-blue-200 dark:border-blue-800"
                            >
                              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
                                <path d="M5 5a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2v-2a1 1 0 10-2 0v2H5V7h2a1 1 0 000-2H5z"/>
                              </svg>
                              <span>View on BSCScan</span>
                            </a>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-70 group-hover:opacity-100 p-1.5 h-7 w-7 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-all duration-200 flex-shrink-0"
                        onClick={() => handleDeleteTransaction(transaction)}
                        title="Delete transaction"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
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
        <AlertDialogContent className="sm:max-w-[380px] p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 overflow-hidden rounded-2xl gap-0 shadow-2xl">
          <div className="relative px-6 pt-8 pb-6 text-center bg-gradient-to-b from-orange-50 dark:from-orange-950/30 to-transparent">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-red-100 dark:bg-red-900/50 shadow-lg shadow-red-200/50 dark:shadow-red-900/30 border border-red-200 dark:border-red-800">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <AlertDialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Delete transaction?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500 dark:text-gray-400">
              This transaction will be permanently removed from your history. This action cannot be undone.
            </AlertDialogDescription>
          </div>
          <div className="px-6 pb-5 pt-4 space-y-3">
            <AlertDialogAction 
              onClick={confirmDeleteTransaction}
              className="w-full h-12 rounded-xl font-semibold text-sm shadow-lg transition-all bg-gradient-to-r from-red-500 to-red-400 hover:from-red-400 hover:to-red-300 shadow-red-300/30 text-white"
            >
              Delete
            </AlertDialogAction>
            <AlertDialogCancel 
              onClick={cancelDeleteTransaction}
              className="w-full h-10 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium text-sm border-0 bg-transparent"
            >
              Cancel
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>


    </>
  );
}