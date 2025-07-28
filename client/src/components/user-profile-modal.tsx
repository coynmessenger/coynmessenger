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
        <DialogContent className="w-[85vw] max-w-xs bg-gradient-to-br from-white/90 via-blue-50/90 to-indigo-100/90 dark:from-blue-950/90 dark:via-blue-900/90 dark:to-indigo-900/90 backdrop-blur-xl border-2 border-blue-300/40 dark:border-blue-700/40 p-0 overflow-hidden shadow-2xl transform rotate-1 hover:rotate-0 transition-all duration-500">
          <DialogHeader className="sr-only">
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>View user profile information and manage contact options</DialogDescription>
          </DialogHeader>
          
          {/* Picasso-inspired abstract header */}
          <div className="relative h-32 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 dark:from-blue-800 dark:via-indigo-900 dark:to-purple-950 overflow-hidden">
            {/* Abstract geometric shapes */}
            <div className="absolute top-0 left-0 w-16 h-16 bg-orange-400/30 transform rotate-45 -translate-x-2 -translate-y-2"></div>
            <div className="absolute top-3 right-2 w-12 h-12 bg-yellow-300/40 rounded-full"></div>
            <div className="absolute bottom-2 left-4 w-8 h-16 bg-red-400/25 transform -rotate-12"></div>
            <div className="absolute bottom-0 right-0 w-20 h-8 bg-green-400/20 transform rotate-12 translate-x-4"></div>
            
            {/* Profile picture with artistic frame */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-sm opacity-60 scale-125 animate-pulse"></div>
                <Avatar className="h-16 w-16 relative border-3 border-white/40 shadow-xl transform -rotate-3">
                  <AvatarImage src={user.profilePicture || ""} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-200 to-purple-300 dark:from-blue-800 dark:to-purple-900">
                    <UserAvatarIcon className="w-8 h-8 text-blue-700 dark:text-blue-300" />
                  </AvatarFallback>
                </Avatar>
                {user.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full animate-bounce">
                    <div className="w-2 h-2 bg-green-300 rounded-full m-0.5"></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Compact content with artistic layout */}
          <div className="p-4 space-y-3 bg-white/70 dark:bg-blue-950/70 backdrop-blur-sm">
            {/* Name section with artistic typography */}
            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-blue-900 dark:text-blue-100 transform -rotate-1 drop-shadow-sm">
                {getEffectiveDisplayName(user)}
              </h3>
              <p className="text-xs text-blue-600/80 dark:text-blue-300/80 font-mono transform rotate-1">
                @{user.walletAddress ? user.walletAddress.slice(-6) : 'unknown'}
              </p>
              {isOwnProfile && (
                <Badge className="bg-orange-500/90 text-white text-xs px-2 py-0.5 transform -rotate-2">
                  You
                </Badge>
              )}
              {user.isOnline && !isOwnProfile && (
                <Badge className="bg-green-500/90 text-white text-xs px-2 py-0.5 transform rotate-2">
                  Online
                </Badge>
              )}
            </div>

            {/* Minimalist wallet display */}
            <div className="bg-gradient-to-r from-blue-100/60 to-indigo-100/60 dark:from-blue-900/30 dark:to-indigo-900/30 p-2 rounded-lg border border-blue-200/40 dark:border-blue-700/40 transform rotate-0.5">
              <div className="flex items-center gap-2">
                <Wallet className="h-3 w-3 text-blue-600 dark:text-blue-300" />
                <code className="text-xs font-mono text-blue-800 dark:text-blue-200 truncate">
                  {user.walletAddress?.slice(0, 8)}...{user.walletAddress?.slice(-4)}
                </code>
                <Button
                  onClick={copyWalletAddress}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-blue-200 dark:hover:bg-blue-800/50 rounded transform hover:rotate-12 transition-all duration-200"
                >
                  <Copy className="h-3 w-3 text-blue-600 dark:text-blue-300" />
                </Button>
              </div>
            </div>

            {/* Artistic action buttons */}
            <div className="space-y-2">
              {isOwnProfile ? (
                <>
                  {onSendMessage && (
                    <Button 
                      onClick={onSendMessage}
                      className="w-full h-9 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-xs rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-rotate-1"
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Message
                    </Button>
                  )}
                </>
              ) : (
                <>
                  {onSendMessage && (
                    <Button 
                      onClick={onSendMessage}
                      className="w-full h-9 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-xs rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-rotate-1"
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Message
                    </Button>
                  )}
                  
                  {(onStartCall || onStartVideoCall) && (
                    <div className="grid grid-cols-2 gap-2">
                      {onStartCall && (
                        <Button 
                          onClick={onStartCall}
                          variant="outline"
                          className="h-9 bg-white/80 dark:bg-blue-900/40 border border-blue-300/60 dark:border-blue-600/60 text-blue-700 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-800/60 rounded-lg text-xs font-medium transform hover:rotate-1 transition-all duration-300"
                        >
                          <Phone className="h-3 w-3 mr-1" />
                          Call
                        </Button>
                      )}
                      {onStartVideoCall && (
                        <Button 
                          onClick={onStartVideoCall}
                          variant="outline"
                          className="h-9 bg-white/80 dark:bg-blue-900/40 border border-blue-300/60 dark:border-blue-600/60 text-blue-700 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-800/60 rounded-lg text-xs font-medium transform hover:-rotate-1 transition-all duration-300"
                        >
                          <Video className="h-3 w-3 mr-1" />
                          Video
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {onDeleteContact && (
                    <Button 
                      onClick={handleDeleteContactClick}
                      variant="outline"
                      className="w-full h-8 bg-white/80 dark:bg-red-950/40 border border-red-300/60 dark:border-red-700/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/60 rounded-lg text-xs font-medium transform hover:rotate-2 transition-all duration-300"
                    >
                      <UserMinus className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Minimalist last seen */}
            {user.lastSeen && (
              <div className="text-center pt-2 border-t border-blue-200/30 dark:border-blue-700/30">
                <p className="text-xs text-blue-600/60 dark:text-blue-300/60 transform rotate-0.5">
                  {new Date(user.lastSeen).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Artistic Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <DialogContent className="w-[80vw] max-w-sm p-0 bg-gradient-to-br from-white/90 via-red-50/90 to-orange-100/90 dark:from-red-950/90 dark:via-red-900/90 dark:to-orange-900/90 backdrop-blur-xl border-2 border-red-300/40 dark:border-red-700/40 overflow-hidden shadow-2xl transform -rotate-1 hover:rotate-0 transition-all duration-500">
          <DialogHeader className="p-4 pb-3 bg-gradient-to-br from-red-500 via-red-600 to-orange-600 dark:from-red-700 dark:via-red-800 dark:to-orange-800 relative overflow-hidden">
            {/* Abstract warning shapes */}
            <div className="absolute top-0 right-0 w-8 h-8 bg-yellow-400/40 transform rotate-45"></div>
            <div className="absolute bottom-0 left-0 w-6 h-12 bg-orange-400/30 transform -rotate-12"></div>
            
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-white/30 backdrop-blur-sm rounded-full shadow-lg transform rotate-3">
              <AlertTriangle className="w-6 h-6 text-white drop-shadow-lg" />
            </div>
            <DialogTitle className="text-center text-lg font-black text-white pt-2 drop-shadow-lg transform -rotate-1">
              Delete Contact
            </DialogTitle>
            <DialogDescription className="sr-only">
              Confirm deletion of contact and conversation history
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 space-y-4 bg-white/70 dark:bg-red-950/70 backdrop-blur-sm">
            <p className="text-center text-sm text-red-800 dark:text-red-200 leading-relaxed transform rotate-0.5">
              Delete <span className="font-black text-red-900 dark:text-red-100">{getEffectiveDisplayName(user)}</span>?
              <br />
              <span className="text-xs text-red-600 dark:text-red-300 transform -rotate-0.5 inline-block mt-1">
                This cannot be undone.
              </span>
            </p>
            
            <div className="flex gap-2">
              <Button
                onClick={handleCancelDelete}
                variant="outline"
                className="flex-1 h-9 bg-white/80 dark:bg-red-900/40 border border-red-300/60 dark:border-red-600/60 text-red-700 dark:text-red-200 hover:bg-red-50 dark:hover:bg-red-800/60 rounded-lg text-xs font-medium transform hover:rotate-1 transition-all duration-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                className="flex-1 h-9 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-lg text-xs shadow-md hover:shadow-lg transition-all duration-300 transform hover:-rotate-1"
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}