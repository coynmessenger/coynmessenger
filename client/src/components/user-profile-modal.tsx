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
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-white/95 via-blue-50/95 to-slate-100/95 dark:from-blue-950/95 dark:via-blue-900/95 dark:to-slate-900/95 backdrop-blur-xl border border-blue-200/50 dark:border-blue-800/50 p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>View user profile information and manage contact options</DialogDescription>
          </DialogHeader>
          
          {/* Blue gradient header background */}
          <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 dark:from-blue-800 dark:via-blue-900 dark:to-blue-950 p-6 pb-16">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-transparent to-blue-900/30 pointer-events-none"></div>
            <div className="absolute top-2 right-2 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-300/15 rounded-full blur-xl"></div>
            
            {/* Profile section centered in header */}
            <div className="relative flex flex-col items-center space-y-3 pt-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full blur-md opacity-50 scale-110"></div>
                <Avatar className="h-24 w-24 sm:h-28 sm:w-28 relative border-4 border-white/20 shadow-2xl">
                  <AvatarImage src={user.profilePicture || ""} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-900">
                    <UserAvatarIcon className="w-12 h-12 sm:w-14 sm:h-14 text-blue-600 dark:text-blue-300" />
                  </AvatarFallback>
                </Avatar>
                {user.isOnline && (
                  <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 border-3 border-white dark:border-blue-950 rounded-full flex items-center justify-center shadow-lg">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
                  {getEffectiveDisplayName(user)}
                </h3>
                <p className="text-sm text-blue-100/90 font-medium">
                  @{user.walletAddress ? user.walletAddress.slice(-6) : 'unknown'}
                </p>
                <div className="flex items-center justify-center gap-2">
                  {isOwnProfile && (
                    <Badge className="bg-orange-500/90 text-white text-xs font-semibold px-3 py-1 shadow-lg backdrop-blur-sm">
                      You
                    </Badge>
                  )}
                  {user.isOnline && !isOwnProfile && (
                    <Badge className="bg-green-500/90 text-white text-xs font-semibold px-3 py-1 shadow-lg backdrop-blur-sm">
                      Online
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content section with glassmorphism effect */}
          <div className="relative p-6 space-y-5 bg-white/60 dark:bg-blue-950/60 backdrop-blur-sm">
            {/* Wallet Address with modern styling */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Wallet Address
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-xl blur-sm group-hover:blur-none transition-all duration-300"></div>
                <div className="relative flex items-center space-x-3 p-4 bg-white/80 dark:bg-blue-900/40 backdrop-blur-sm border border-blue-200/50 dark:border-blue-700/50 rounded-xl shadow-lg">
                  <code className="flex-1 text-xs font-mono text-blue-800 dark:text-blue-200 break-all select-all">
                    {user.walletAddress}
                  </code>
                  <Button
                    onClick={copyWalletAddress}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded-lg transition-all duration-200 hover:scale-110"
                  >
                    <Copy className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Action Buttons with glassmorphism */}
            <div className="space-y-3">
              {isOwnProfile ? (
                <>
                  {onSendMessage && (
                    <Button 
                      onClick={onSendMessage}
                      className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] backdrop-blur-sm border border-orange-400/30"
                    >
                      <MessageCircle className="h-5 w-5 mr-2" />
                      Message Yourself
                    </Button>
                  )}
                </>
              ) : (
                <>
                  {onSendMessage && (
                    <Button 
                      onClick={onSendMessage}
                      className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] backdrop-blur-sm border border-orange-400/30"
                    >
                      <MessageCircle className="h-5 w-5 mr-2" />
                      Send Message
                    </Button>
                  )}
                  
                  {(onStartCall || onStartVideoCall) && (
                    <div className="grid grid-cols-2 gap-3">
                      {onStartCall && (
                        <Button 
                          onClick={onStartCall}
                          variant="outline"
                          className="h-12 bg-white/80 dark:bg-blue-900/40 backdrop-blur-sm border border-blue-300/50 dark:border-blue-600/50 text-blue-700 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-800/60 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] font-medium"
                        >
                          <Phone className="h-5 w-5 mr-2" />
                          Call
                        </Button>
                      )}
                      {onStartVideoCall && (
                        <Button 
                          onClick={onStartVideoCall}
                          variant="outline"
                          className="h-12 bg-white/80 dark:bg-blue-900/40 backdrop-blur-sm border border-blue-300/50 dark:border-blue-600/50 text-blue-700 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-800/60 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] font-medium"
                        >
                          <Video className="h-5 w-5 mr-2" />
                          Video
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {onDeleteContact && (
                    <Button 
                      onClick={handleDeleteContactClick}
                      variant="outline"
                      className="w-full h-12 bg-white/80 dark:bg-red-950/40 backdrop-blur-sm border border-red-300/50 dark:border-red-700/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/60 hover:border-red-400 dark:hover:border-red-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] font-medium"
                    >
                      <UserMinus className="h-5 w-5 mr-2" />
                      Delete Contact
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Last seen with elegant styling */}
            {user.lastSeen && (
              <div className="text-center pt-4 border-t border-blue-200/30 dark:border-blue-700/30">
                <p className="text-xs text-blue-600/80 dark:text-blue-300/80 font-medium">
                  Last seen: {new Date(user.lastSeen).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog with modern styling */}
      <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <DialogContent className="w-[90vw] sm:w-[400px] p-0 bg-gradient-to-br from-white/95 via-red-50/95 to-slate-100/95 dark:from-red-950/95 dark:via-red-900/95 dark:to-slate-900/95 backdrop-blur-xl border border-red-200/50 dark:border-red-800/50 overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-red-500 to-red-600 dark:from-red-700 dark:to-red-800">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-white/20 backdrop-blur-sm rounded-full shadow-lg">
              <AlertTriangle className="w-8 h-8 text-white drop-shadow-lg" />
            </div>
            <DialogTitle className="text-center text-xl font-bold text-white pt-3 drop-shadow-lg">
              Delete Contact
            </DialogTitle>
            <DialogDescription className="sr-only">
              Confirm deletion of contact and conversation history
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-6 space-y-6 bg-white/60 dark:bg-red-950/60 backdrop-blur-sm">
            <p className="text-center text-sm text-red-800 dark:text-red-200 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-red-900 dark:text-red-100">{getEffectiveDisplayName(user)}</span> from your contacts? 
              <br /><br />
              <span className="text-xs text-red-600 dark:text-red-300">This will also remove your conversation history and cannot be undone.</span>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleCancelDelete}
                variant="outline"
                className="flex-1 h-11 bg-white/80 dark:bg-red-900/40 backdrop-blur-sm border border-red-300/50 dark:border-red-600/50 text-red-700 dark:text-red-200 hover:bg-red-50 dark:hover:bg-red-800/60 rounded-xl font-medium transition-all duration-300 hover:scale-[1.02]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                className="flex-1 h-11 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
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