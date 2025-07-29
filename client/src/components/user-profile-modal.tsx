import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, MessageCircle, Phone, Video, Wallet, UserMinus, AlertTriangle } from "lucide-react";
import { UserAvatarIcon } from "@/components/ui/user-avatar-icon";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onStartCall?: () => void;
  onStartVideoCall?: () => void;
  onSendMessage?: () => void;
  onDeleteContact?: () => void;
}

export default function UserProfileModal({ 
  isOpen, 
  onClose, 
  user, 
  onStartCall,
  onStartVideoCall,
  onSendMessage,
  onDeleteContact 
}: UserProfileModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  // Get current user to check if viewing own profile
  const connectedUser = localStorage.getItem('connectedUser');
  const currentUserId = connectedUser ? JSON.parse(connectedUser).id : null;
  const isOwnProfile = currentUserId === user.id;

  // Invalidate user cache when modal opens to ensure fresh data
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
        <DialogContent className="w-[85vw] max-w-xs bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl razor-sharp-modal p-3 sm:p-4 max-h-[80vh] overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>View user profile information and manage contact options</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* Profile Picture and Basic Info - Compact */}
            <div className="flex flex-col items-center space-y-2">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user.profilePicture || ""} />
                  <AvatarFallback className="bg-gray-200 dark:bg-gray-700">
                    <UserAvatarIcon className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                  </AvatarFallback>
                </Avatar>
                {user.isOnline && (
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                )}
              </div>
              
              <div className="text-center space-y-1">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white blue-text-outline">
                  {getEffectiveDisplayName(user)}
                </h3>
                <p className="text-xs text-gray-500 dark:text-muted-foreground">
                  @{user.walletAddress ? user.walletAddress.slice(-6) : 'unknown'}
                </p>
                {isOwnProfile && (
                  <Badge className="bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-xs px-2 py-0.5">
                    You
                  </Badge>
                )}
              </div>
            </div>

            {/* Wallet Address - Compact */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Wallet Address
              </label>
              <div className="flex items-center space-x-1 p-2 bg-gray-50 dark:bg-gray-800 rounded-md dark-blue-outline">
                <code className="flex-1 text-xs font-mono text-gray-600 dark:text-gray-300 break-all leading-tight">
                  {user.walletAddress}
                </code>
                <Button
                  onClick={copyWalletAddress}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Action Buttons - Compact */}
            <div className="space-y-2">
              {/* For own profile, only show Send Message */}
              {isOwnProfile ? (
                <>
                  {onSendMessage && (
                    <Button 
                      onClick={onSendMessage}
                      className="w-full h-8 bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm dark-blue-outline"
                    >
                      <MessageCircle className="h-3 w-3 mr-1" />
                      Message Yourself
                    </Button>
                  )}
                </>
              ) : (
                <>
                  {/* Primary Action: Send Message */}
                  {onSendMessage && (
                    <Button 
                      onClick={onSendMessage}
                      className="w-full h-8 bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm dark-blue-outline"
                    >
                      <MessageCircle className="h-3 w-3 mr-1" />
                      Send Message
                    </Button>
                  )}
                  
                  {/* Secondary Actions: Call and Video (Side by Side) */}
                  {(onStartCall || onStartVideoCall) && (
                    <div className="grid grid-cols-2 gap-2">
                      {onStartCall && (
                        <Button 
                          onClick={onStartCall}
                          variant="outline"
                          className="h-8 text-xs bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 dark-blue-outline"
                        >
                          <Phone className="h-3 w-3 mr-1" />
                          Call
                        </Button>
                      )}
                      {onStartVideoCall && (
                        <Button 
                          onClick={onStartVideoCall}
                          variant="outline"
                          className="h-8 text-xs bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 dark-blue-outline"
                        >
                          <Video className="h-3 w-3 mr-1" />
                          Video
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <DialogContent className="w-[90vw] sm:w-[400px] p-6 bg-white dark:bg-card">
          <DialogHeader className="space-y-3">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle className="text-center text-lg font-semibold text-gray-900 dark:text-white">
              Delete Contact
            </DialogTitle>
            <DialogDescription className="sr-only">
              Confirm deletion of contact and conversation history
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-center text-sm text-gray-600 dark:text-gray-300">
              Are you sure you want to delete <span className="font-medium">{user.displayName}</span> from your contacts? 
              This will also remove your conversation history and cannot be undone.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={handleCancelDelete}
                variant="outline"
                className="flex-1 h-10 bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Contact
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}