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
        <DialogContent className="w-[85vw] max-w-xs bg-gradient-to-br from-white/95 via-orange-50/90 to-pink-50/95 dark:from-slate-900/95 dark:via-purple-900/90 dark:to-blue-900/95 backdrop-blur-xl border-4 border-orange-400/60 dark:border-purple-500/60 shadow-2xl p-3 sm:p-4 max-h-[80vh] overflow-hidden transform -rotate-1">
          <DialogHeader className="sr-only">
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>View user profile information and manage contact options</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 transform rotate-1">
            {/* Profile Picture and Basic Info - Picassoesque */}
            <div className="flex flex-col items-center space-y-2 relative">
              {/* Geometric background shapes */}
              <div className="absolute -top-2 -left-2 w-8 h-8 bg-yellow-400/60 dark:bg-yellow-300/40 transform rotate-45 rounded-lg"></div>
              <div className="absolute -top-1 -right-3 w-6 h-6 bg-purple-400/60 dark:bg-purple-300/40 transform -rotate-12 rounded-full"></div>
              <div className="absolute -bottom-1 -left-3 w-4 h-8 bg-orange-400/60 dark:bg-orange-300/40 transform rotate-12 rounded-lg"></div>
              
              <div className="relative transform rotate-2">
                <Avatar className="h-16 w-16 border-3 border-orange-400/70 dark:border-purple-400/70 shadow-lg ring-2 ring-pink-300/50 dark:ring-blue-300/50">
                  <AvatarImage src={user.profilePicture || ""} className="contrast-125 saturate-110" />
                  <AvatarFallback className="bg-gradient-to-br from-orange-200 to-pink-200 dark:from-purple-700 dark:to-blue-700">
                    <UserAvatarIcon className="w-8 h-8 text-orange-600 dark:text-purple-300" />
                  </AvatarFallback>
                </Avatar>
                {user.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-3 border-white dark:border-slate-900 rounded-full transform rotate-12 shadow-lg"></div>
                )}
              </div>
              
              <div className="text-center space-y-1 transform -rotate-1">
                <h3 className="text-base font-bold text-gray-900 dark:text-white transform skew-x-3 text-shadow-lg shadow-orange-500/30">
                  {getEffectiveDisplayName(user)}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 transform -skew-x-2 font-mono">
                  @{user.walletAddress ? user.walletAddress.slice(-6) : 'unknown'}
                </p>
                {isOwnProfile && (
                  <Badge className="bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 text-orange-700 dark:text-orange-400 text-xs px-2 py-0.5 border-2 border-orange-300/60 dark:border-orange-500/60 transform rotate-3 shadow-md">
                    You
                  </Badge>
                )}
              </div>
            </div>

            {/* Wallet Address - Picassoesque */}
            <div className="space-y-1 relative">
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-400/60 dark:bg-pink-300/40 transform rotate-45 rounded"></div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 transform skew-x-1">
                Wallet Address
              </label>
              <div className="flex items-center space-x-1 p-2 bg-gradient-to-r from-orange-50/80 to-yellow-50/80 dark:from-purple-800/40 dark:to-blue-800/40 rounded-lg border-2 border-orange-300/50 dark:border-purple-400/50 transform -rotate-1 shadow-md">
                <code className="flex-1 text-xs font-mono text-gray-700 dark:text-gray-200 break-all leading-tight transform skew-x-1">
                  {user.walletAddress}
                </code>
                <Button
                  onClick={copyWalletAddress}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-orange-200/60 dark:hover:bg-purple-700/60 transform rotate-12"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Action Buttons - Picassoesque */}
            <div className="space-y-2 relative">
              <div className="absolute -top-1 -left-1 w-4 h-4 bg-yellow-400/60 dark:bg-yellow-300/40 transform -rotate-12 rounded-full"></div>
              {/* For own profile, only show Send Message */}
              {isOwnProfile ? (
                <>
                  {onSendMessage && (
                    <Button 
                      onClick={onSendMessage}
                      className="w-full h-8 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold text-sm border-2 border-orange-300/60 shadow-lg transform rotate-1"
                    >
                      <MessageCircle className="h-3 w-3 mr-1 transform -rotate-6" />
                      <span className="transform skew-x-2">Message Yourself</span>
                    </Button>
                  )}
                </>
              ) : (
                <>
                  {/* Primary Action: Send Message */}
                  {onSendMessage && (
                    <Button 
                      onClick={onSendMessage}
                      className="w-full h-8 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold text-sm border-2 border-orange-300/60 shadow-lg transform rotate-1"
                    >
                      <MessageCircle className="h-3 w-3 mr-1 transform -rotate-6" />
                      <span className="transform skew-x-2">Send Message</span>
                    </Button>
                  )}
                  
                  {/* Secondary Actions: Call and Video (Side by Side) */}
                  {(onStartCall || onStartVideoCall) && (
                    <div className="grid grid-cols-2 gap-2">
                      {onStartCall && (
                        <Button 
                          onClick={onStartCall}
                          variant="outline"
                          className="h-8 text-xs bg-gradient-to-br from-white to-orange-50 dark:from-slate-800 dark:to-purple-800 hover:from-orange-50 hover:to-yellow-50 dark:hover:from-purple-700 dark:hover:to-blue-700 border-2 border-orange-300/60 dark:border-purple-400/60 shadow-md transform -rotate-1"
                        >
                          <Phone className="h-3 w-3 mr-1 transform rotate-12" />
                          <span className="transform -skew-x-1">Call</span>
                        </Button>
                      )}
                      {onStartVideoCall && (
                        <Button 
                          onClick={onStartVideoCall}
                          variant="outline"
                          className="h-8 text-xs bg-gradient-to-br from-white to-pink-50 dark:from-slate-800 dark:to-blue-800 hover:from-pink-50 hover:to-purple-50 dark:hover:from-blue-700 dark:hover:to-purple-700 border-2 border-pink-300/60 dark:border-blue-400/60 shadow-md transform rotate-2"
                        >
                          <Video className="h-3 w-3 mr-1 transform -rotate-6" />
                          <span className="transform skew-x-1">Video</span>
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {/* Delete Contact - Only for others, not own profile */}
                  {onDeleteContact && (
                    <Button 
                      onClick={handleDeleteContactClick}
                      variant="outline"
                      className="w-full h-8 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 text-red-600 dark:text-red-400 border-2 border-red-300/60 dark:border-red-500/60 hover:from-red-100 hover:to-pink-100 dark:hover:from-red-800/40 dark:hover:to-pink-800/40 font-medium text-sm shadow-md transform -rotate-1"
                    >
                      <UserX className="h-3 w-3 mr-1 transform rotate-6" />
                      <span className="transform -skew-x-1">Delete Contact</span>
                    </Button>
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