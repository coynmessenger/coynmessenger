import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, MessageCircle, Phone, Video, Wallet, UserX, AlertTriangle } from "lucide-react";
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
        <DialogContent className="w-[90vw] max-w-[320px] sm:max-w-xs bg-gradient-to-br from-white/95 via-blue-50/90 to-blue-100/95 dark:from-blue-900/95 dark:via-blue-800/90 dark:to-slate-900/95 backdrop-blur-xl border-4 border-blue-600/60 dark:border-blue-400/60 shadow-2xl p-4 sm:p-4 max-h-[85vh] sm:max-h-[80vh] overflow-y-auto transform -rotate-1 relative touch-manipulation">
          {/* Airplane Background Pattern */}
          <div className="absolute inset-0 opacity-10 dark:opacity-20 pointer-events-none">
            <div className="absolute top-2 left-2 transform rotate-45">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-blue-800 dark:text-blue-300">
                <path d="M20.56 3.44l-2 2-5.5 5.5-1.06-1.06 5.5-5.5 2-2 1.06 1.06zM8.5 11.5l-2 2-3.5-3.5L1 12l4 4 2-2 3.5-3.5-2-2zM12 15l-4 4h8l-4-4z"/>
              </svg>
            </div>
            <div className="absolute top-6 right-4 transform -rotate-12">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-blue-700 dark:text-blue-400">
                <path d="M20.56 3.44l-2 2-5.5 5.5-1.06-1.06 5.5-5.5 2-2 1.06 1.06zM8.5 11.5l-2 2-3.5-3.5L1 12l4 4 2-2 3.5-3.5-2-2zM12 15l-4 4h8l-4-4z"/>
              </svg>
            </div>
            <div className="absolute bottom-4 left-4 transform rotate-12">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-blue-600 dark:text-blue-200">
                <path d="M20.56 3.44l-2 2-5.5 5.5-1.06-1.06 5.5-5.5 2-2 1.06 1.06zM8.5 11.5l-2 2-3.5-3.5L1 12l4 4 2-2 3.5-3.5-2-2zM12 15l-4 4h8l-4-4z"/>
              </svg>
            </div>
            <div className="absolute bottom-2 right-2 transform -rotate-45">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-blue-800 dark:text-blue-300">
                <path d="M20.56 3.44l-2 2-5.5 5.5-1.06-1.06 5.5-5.5 2-2 1.06 1.06zM8.5 11.5l-2 2-3.5-3.5L1 12l4 4 2-2 3.5-3.5-2-2zM12 15l-4 4h8l-4-4z"/>
              </svg>
            </div>
          </div>
          <DialogHeader className="sr-only">
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>View user profile information and manage contact options</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 sm:space-y-3 transform rotate-1">
            {/* Profile Picture and Basic Info - Picassoesque */}
            <div className="flex flex-col items-center space-y-2 relative">
              {/* Geometric background shapes - dark blue, white, orange */}
              <div className="absolute -top-2 -left-2 w-8 h-8 bg-blue-800/60 dark:bg-blue-600/40 transform rotate-45 rounded-lg"></div>
              <div className="absolute -top-1 -right-3 w-6 h-6 bg-orange-400/60 dark:bg-orange-300/40 transform -rotate-12 rounded-full"></div>
              <div className="absolute -bottom-1 -left-3 w-4 h-8 bg-white/80 dark:bg-white/20 transform rotate-12 rounded-lg border border-blue-600/30"></div>
              
              <div className="relative transform rotate-2">
                <Avatar className="h-20 w-20 sm:h-16 sm:w-16 border-3 border-blue-800/70 dark:border-blue-400/70 shadow-lg ring-2 ring-orange-300/50 dark:ring-orange-400/50">
                  <AvatarImage src={user.profilePicture || ""} className="contrast-125 saturate-110" />
                  <AvatarFallback className="bg-gradient-to-br from-white to-blue-100 dark:from-blue-800 dark:to-blue-700">
                    <UserAvatarIcon className="w-10 h-10 sm:w-8 sm:h-8 text-blue-800 dark:text-white" />
                  </AvatarFallback>
                </Avatar>
                {user.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-3 border-white dark:border-slate-900 rounded-full transform rotate-12 shadow-lg"></div>
                )}
              </div>
              
              <div className="text-center space-y-2 sm:space-y-1 transform -rotate-1">
                <h3 className="text-lg sm:text-base font-bold text-blue-900 dark:text-white transform skew-x-3 text-shadow-lg shadow-blue-800/30">
                  {getEffectiveDisplayName(user)}
                </h3>
                <p className="text-sm sm:text-xs text-blue-700 dark:text-blue-200 transform -skew-x-2 font-mono">
                  @{user.walletAddress ? user.walletAddress.slice(-6) : 'unknown'}
                </p>
                {isOwnProfile && (
                  <Badge className="bg-gradient-to-r from-orange-100 to-white dark:from-orange-900/30 dark:to-blue-900/30 text-orange-700 dark:text-orange-400 text-xs px-2 py-0.5 border-2 border-orange-300/60 dark:border-orange-500/60 transform rotate-3 shadow-md">
                    You
                  </Badge>
                )}
              </div>
            </div>

            {/* Wallet Address - dark blue, white, orange palette */}
            <div className="space-y-2 sm:space-y-1 relative">
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400/60 dark:bg-orange-300/40 transform rotate-45 rounded"></div>
              <label className="text-sm sm:text-xs font-medium text-blue-800 dark:text-white transform skew-x-1">
                Wallet Address
              </label>
              <div className="flex items-center space-x-2 sm:space-x-1 p-3 sm:p-2 bg-gradient-to-r from-white/90 to-blue-50/80 dark:from-blue-800/40 dark:to-blue-900/40 rounded-lg border-2 border-blue-600/50 dark:border-blue-400/50 transform -rotate-1 shadow-md">
                <code className="flex-1 text-sm sm:text-xs font-mono text-blue-800 dark:text-white break-all leading-tight transform skew-x-1">
                  {user.walletAddress}
                </code>
                <Button
                  onClick={copyWalletAddress}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 sm:h-6 sm:w-6 p-0 hover:bg-orange-200/60 dark:hover:bg-orange-700/60 transform rotate-12 text-blue-700 dark:text-orange-300 touch-manipulation"
                >
                  <Copy className="h-4 w-4 sm:h-3 sm:w-3" />
                </Button>
              </div>
            </div>

            {/* Action Buttons - dark blue, white, orange palette */}
            <div className="space-y-3 sm:space-y-2 relative">
              <div className="absolute -top-1 -left-1 w-4 h-4 bg-white/80 dark:bg-white/20 transform -rotate-12 rounded-full border border-blue-600/30"></div>
              {/* For own profile, only show Send Message */}
              {isOwnProfile ? (
                <>
                  {onSendMessage && (
                    <Button 
                      onClick={onSendMessage}
                      className="w-full h-10 sm:h-8 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-base sm:text-sm border-2 border-orange-400/60 shadow-lg transform rotate-1 touch-manipulation"
                    >
                      <MessageCircle className="h-4 w-4 sm:h-3 sm:w-3 mr-1 transform -rotate-6" />
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
                      className="w-full h-10 sm:h-8 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-base sm:text-sm border-2 border-orange-400/60 shadow-lg transform rotate-1 touch-manipulation"
                    >
                      <MessageCircle className="h-4 w-4 sm:h-3 sm:w-3 mr-1 transform -rotate-6" />
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
                          className="h-10 sm:h-8 text-sm sm:text-xs bg-gradient-to-br from-white to-blue-50 dark:from-blue-800 dark:to-blue-700 hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-700 dark:hover:to-blue-600 border-2 border-blue-600/60 dark:border-blue-400/60 shadow-md transform -rotate-1 text-blue-800 dark:text-white touch-manipulation"
                        >
                          <Phone className="h-4 w-4 sm:h-3 sm:w-3 mr-2 sm:mr-1 transform rotate-12" />
                          <span className="transform -skew-x-1">Call</span>
                        </Button>
                      )}
                      {onStartVideoCall && (
                        <Button 
                          onClick={onStartVideoCall}
                          variant="outline"
                          className="h-10 sm:h-8 text-sm sm:text-xs bg-gradient-to-br from-white to-orange-50 dark:from-blue-800 dark:to-orange-800/30 hover:from-orange-50 hover:to-orange-100 dark:hover:from-orange-700/30 dark:hover:to-orange-600/30 border-2 border-orange-400/60 dark:border-orange-500/60 shadow-md transform rotate-2 text-blue-800 dark:text-white touch-manipulation"
                        >
                          <Video className="h-4 w-4 sm:h-3 sm:w-3 mr-2 sm:mr-1 transform -rotate-6" />
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
                      className="w-full h-10 sm:h-8 bg-gradient-to-br from-white to-red-50 dark:from-blue-900/30 dark:to-red-900/30 text-red-600 dark:text-red-400 border-2 border-red-400/60 dark:border-red-500/60 hover:from-red-50 hover:to-red-100 dark:hover:from-red-800/40 dark:hover:to-red-700/40 font-medium text-base sm:text-sm shadow-md transform -rotate-1 touch-manipulation"
                    >
                      <UserX className="h-4 w-4 sm:h-3 sm:w-3 mr-2 sm:mr-1 transform rotate-6" />
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
        <DialogContent className="w-[90vw] sm:w-[400px] p-6 bg-white dark:bg-card touch-manipulation">
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
                className="flex-1 h-12 sm:h-10 bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 touch-manipulation text-base sm:text-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                className="flex-1 h-12 sm:h-10 bg-red-600 hover:bg-red-700 text-white touch-manipulation text-base sm:text-sm"
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