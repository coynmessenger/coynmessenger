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
        <DialogContent className="w-[85vw] max-w-sm bg-gradient-to-br from-white via-orange-50/30 to-pink-50/20 dark:from-slate-900 dark:via-orange-900/10 dark:to-pink-900/10 border-2 border-orange-200/50 dark:border-orange-800/30 p-0 overflow-hidden backdrop-blur-md shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>View user profile information and manage contact options</DialogDescription>
          </DialogHeader>
          
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-20 dark:opacity-10">
            <div className="absolute top-2 left-2 w-16 h-16 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute bottom-2 right-2 w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur-lg animate-ping delay-1000"></div>
            <div className="absolute top-1/2 right-4 w-8 h-8 bg-gradient-to-r from-green-400 to-cyan-400 rounded-full blur-md animate-bounce delay-500"></div>
          </div>
          
          <div className="relative z-10 p-4 space-y-4">
            {/* Profile Picture and Basic Info */}
            <div className="flex flex-col items-center space-y-2">
              <div className="relative group">
                {/* Animated Rings around Avatar */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 animate-spin-slow opacity-50 blur-sm scale-110"></div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 animate-spin-reverse opacity-30 blur-md scale-125"></div>
                
                <Avatar className="h-16 w-16 relative z-10 ring-4 ring-white/50 dark:ring-slate-800/50 shadow-xl group-hover:scale-110 transition-all duration-500 ease-out">
                  <AvatarImage 
                    src={user.profilePicture || ""} 
                    className="group-hover:brightness-110 transition-all duration-300"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-orange-100 to-pink-100 dark:from-orange-900/50 dark:to-pink-900/50">
                    <UserAvatarIcon className="w-8 h-8 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform duration-300" />
                  </AvatarFallback>
                </Avatar>
                
                {user.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full flex items-center justify-center animate-pulse shadow-lg">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                  </div>
                )}
              </div>
              
              <div className="text-center space-y-1">
                <h3 className="text-base font-bold bg-gradient-to-r from-gray-900 via-orange-700 to-pink-700 dark:from-white dark:via-orange-300 dark:to-pink-300 bg-clip-text text-transparent animate-gradient-x">
                  {getEffectiveDisplayName(user)}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono tracking-wide">
                  @{user.walletAddress ? user.walletAddress.slice(-6) : 'unknown'}
                </p>
                <div className="flex justify-center space-x-1">
                  {isOwnProfile && (
                    <Badge className="bg-gradient-to-r from-orange-100 to-pink-100 dark:from-orange-900/30 dark:to-pink-900/30 text-orange-700 dark:text-orange-400 text-xs border-0 shadow-md animate-bounce">
                      You ✨
                    </Badge>
                  )}
                  {user.isOnline && !isOwnProfile && (
                    <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-400 text-xs border-0 shadow-md animate-pulse">
                      Online 🟢
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Compact Wallet Address */}
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-3 border border-orange-200/50 dark:border-orange-800/30 shadow-inner hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Wallet</p>
                  <code className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate block">
                    {user.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : 'Unknown'}
                  </code>
                </div>
                <Button
                  onClick={copyWalletAddress}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:scale-110 transition-all duration-200 rounded-full"
                >
                  <Copy className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                </Button>
              </div>
            </div>

            {/* Compact Action Buttons */}
            <div className="space-y-2">
              {isOwnProfile ? (
                <>
                  {onSendMessage && (
                    <Button 
                      onClick={onSendMessage}
                      className="w-full h-9 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-medium text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 border-0"
                    >
                      <MessageCircle className="h-4 w-4 mr-2 animate-bounce" />
                      Chat with Me
                    </Button>
                  )}
                </>
              ) : (
                <>
                  {onSendMessage && (
                    <Button 
                      onClick={onSendMessage}
                      className="w-full h-9 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-medium text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 border-0"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  )}
                  
                  {(onStartCall || onStartVideoCall) && (
                    <div className="grid grid-cols-2 gap-2">
                      {onStartCall && (
                        <Button 
                          onClick={onStartCall}
                          variant="outline"
                          className="h-9 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:scale-105 transition-all duration-300 text-sm"
                        >
                          <Phone className="h-3 w-3 mr-1" />
                          Call
                        </Button>
                      )}
                      {onStartVideoCall && (
                        <Button 
                          onClick={onStartVideoCall}
                          variant="outline"
                          className="h-9 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:scale-105 transition-all duration-300 text-sm"
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
                      className="w-full h-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:scale-105 transition-all duration-300 text-xs"
                    >
                      <UserMinus className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Playful Last Seen */}
            {user.lastSeen && (
              <div className="text-center py-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 animate-fade-in">
                  👀 Last seen: {new Date(user.lastSeen).toLocaleDateString()}
                </p>
              </div>
            )}
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