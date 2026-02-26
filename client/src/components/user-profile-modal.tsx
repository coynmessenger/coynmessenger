import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Copy, MessageCircle, UserMinus, AlertTriangle, Wallet, Clock } from "lucide-react";
import { UserAvatarIcon } from "@/components/ui/user-avatar-icon";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

function getEffectiveDisplayName(user: User): string {
  if (user.displayName && !user.displayName.startsWith('@')) {
    return user.displayName;
  }
  if (user.signInName) {
    return user.signInName;
  }
  if (user.walletAddress) {
    return `@${user.walletAddress.slice(-6)}`;
  }
  return user.displayName || user.username || "Unknown User";
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSendMessage?: () => void;
  onDeleteContact?: () => void;
}

export default function UserProfileModal({ 
  isOpen, 
  onClose, 
  user, 
  onSendMessage,
  onDeleteContact 
}: UserProfileModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  const connectedUser = localStorage.getItem('connectedUser');
  const currentUserId = connectedUser ? JSON.parse(connectedUser).id : null;
  const isOwnProfile = currentUserId === user.id;

  useEffect(() => {
    if (isOpen) {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    }
  }, [isOpen, queryClient]);

  const copyWalletAddress = () => {
    navigator.clipboard.writeText(user.walletAddress);
    toast({
      title: "Copied!",
      description: "Wallet address copied to clipboard",
      duration: 2000,
    });
  };

  const handleDeleteContactClick = () => {
    setShowDeleteConfirmation(true);
  };

  const handleConfirmDelete = () => {
    if (onDeleteContact) {
      onDeleteContact();
    }
    setShowDeleteConfirmation(false);
    onClose();
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent hideCloseButton className="sm:max-w-[380px] p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 overflow-hidden rounded-2xl gap-0 shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>View user profile information and manage contact options</DialogDescription>
          </DialogHeader>

          <div className="relative px-6 pt-8 pb-5 text-center bg-gradient-to-b from-orange-50 dark:from-orange-950/30 to-transparent">
            <div className="relative inline-block mb-4">
              <Avatar className="h-20 w-20 border-2 border-orange-200 dark:border-orange-700 shadow-lg shadow-orange-100 dark:shadow-orange-900/30">
                <AvatarImage src={user.profilePicture || ""} />
                <AvatarFallback className="bg-gray-100 dark:bg-gray-800">
                  <UserAvatarIcon className="w-10 h-10 text-gray-400" />
                </AvatarFallback>
              </Avatar>
              {user.isOnline && (
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full" />
              )}
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
              {getEffectiveDisplayName(user)}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              @{user.walletAddress ? user.walletAddress.slice(-6) : 'unknown'}
            </p>
            {isOwnProfile && (
              <span className="inline-block text-xs px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-700">
                You
              </span>
            )}
            {user.isOnline && !isOwnProfile && (
              <span className="inline-block text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700">
                Online
              </span>
            )}
          </div>

          <div className="px-6 pb-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-orange-50 dark:bg-orange-900/30">
                <Wallet className="w-[18px] h-[18px] text-orange-400" />
              </div>
              <code className="flex-1 text-xs font-mono text-gray-600 dark:text-gray-300 break-all leading-relaxed">
                {user.walletAddress}
              </code>
              <button
                onClick={copyWalletAddress}
                className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="px-6 pb-5 pt-3 space-y-2">
            {isOwnProfile ? (
              <>
                {onSendMessage && (
                  <Button 
                    onClick={onSendMessage}
                    className="w-full h-12 rounded-xl font-semibold text-sm shadow-lg transition-all bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 shadow-orange-300/30 text-white"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message Yourself
                  </Button>
                )}
              </>
            ) : (
              <>
                {onSendMessage && (
                  <Button 
                    onClick={onSendMessage}
                    className="w-full h-12 rounded-xl font-semibold text-sm shadow-lg transition-all bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 shadow-orange-300/30 text-white"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                )}
                
                
                {onDeleteContact && (
                  <Button 
                    onClick={handleDeleteContactClick}
                    variant="ghost"
                    className="w-full h-11 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-300 font-medium text-sm"
                  >
                    <UserMinus className="h-4 w-4 mr-2" />
                    Delete Contact
                  </Button>
                )}
              </>
            )}

            {user.lastSeen && (
              <div className="flex items-center justify-center gap-1.5 pt-2">
                <Clock className="w-3 h-3 text-gray-400" />
                <p className="text-[11px] text-gray-400">
                  Last seen: {new Date(user.lastSeen).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <DialogContent hideCloseButton className="sm:max-w-[380px] p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 overflow-hidden rounded-2xl gap-0 shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>Confirm deletion of contact and conversation history</DialogDescription>
          </DialogHeader>
          
          <div className="relative px-6 pt-8 pb-5 text-center bg-gradient-to-b from-red-50 dark:from-red-950/30 to-transparent">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-red-100 dark:bg-red-900/50 shadow-lg shadow-red-100 dark:shadow-red-900/30 border border-red-200 dark:border-red-800">
              <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Delete Contact</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Are you sure you want to delete <span className="text-red-500 dark:text-red-400 font-medium">{getEffectiveDisplayName(user)}</span>? This will also remove your conversation history.
            </p>
          </div>

          <div className="px-6 pb-5 pt-2 space-y-2">
            <Button
              onClick={handleConfirmDelete}
              className="w-full h-12 rounded-xl font-semibold text-sm shadow-lg bg-gradient-to-r from-red-500 to-red-400 hover:from-red-400 hover:to-red-300 shadow-red-300/30 text-white"
            >
              Delete Contact
            </Button>
            <Button
              onClick={handleCancelDelete}
              variant="ghost"
              className="w-full h-10 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium text-sm"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
