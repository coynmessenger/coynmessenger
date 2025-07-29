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
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900 dark:via-blue-900/20 dark:to-indigo-900/10 border-2 border-blue-400 dark:border-blue-500 shadow-2xl backdrop-blur-sm p-0 overflow-hidden">
          {/* Dostoevsky-inspired Eastern pattern background */}
          <div className="absolute inset-0 opacity-10 dark:opacity-5">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-indigo-600/20 to-purple-600/20"></div>
            <div 
              className="absolute inset-0 bg-repeat" 
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23334155' fill-opacity='0.1' fill-rule='evenodd'%3E%3Cpath d='M20 20c0 11.046-8.954 20-20 20s-20-8.954-20-20 8.954-20 20-20 20 8.954 20 20zm-15-7c0 3.314-2.686 6-6 6s-6-2.686-6-6 2.686-6 6-6 6 2.686 6 6z'/%3E%3C/g%3E%3C/svg%3E")`,
                backgroundSize: '40px 40px'
              }}
            ></div>
          </div>
          
          <div className="relative z-10 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="sr-only">
              <DialogTitle>User Profile</DialogTitle>
              <DialogDescription>View user profile information and manage contact options</DialogDescription>
            </DialogHeader>
            
            {/* Sophisticated Profile Section with Darling Blue Outlines */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative group touch-manipulation active:scale-95 transition-transform duration-200">
                {/* Ornate frame with darling blue outline - Eastern inspired */}
                <div className="absolute -inset-3 bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-500 rounded-full opacity-75 group-hover:opacity-90 group-active:opacity-100 transition-all duration-300 animate-pulse"></div>
                <div className="absolute -inset-2 bg-gradient-to-r from-white via-blue-50 to-white dark:from-slate-800 dark:via-blue-900/50 dark:to-slate-800 rounded-full border-2 border-blue-400 dark:border-blue-500"></div>
                
                {/* Profile avatar with sophisticated styling */}
                <Avatar className="h-24 w-24 sm:h-28 sm:w-28 relative z-10 border-3 border-blue-300 dark:border-blue-400 shadow-xl ring-2 ring-blue-400/30 dark:ring-blue-500/30 transition-all duration-300 hover:scale-105 active:scale-95 touch-manipulation">
                  <AvatarImage 
                    src={user.profilePicture || ""} 
                    className="filter contrast-110 saturate-110 hover:contrast-125 hover:saturate-125 transition-all duration-300"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 dark:from-blue-800 dark:via-indigo-800 dark:to-purple-800 border-2 border-blue-400 dark:border-blue-500">
                    <UserAvatarIcon className="w-12 h-12 sm:w-14 sm:h-14 text-blue-600 dark:text-blue-300" />
                  </AvatarFallback>
                </Avatar>
                
                {/* Elegant online indicator */}
                {user.isOnline && (
                  <div className="absolute bottom-1 right-1 w-6 h-6 bg-gradient-to-r from-emerald-400 to-green-500 border-2 border-blue-400 dark:border-blue-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                )}
              </div>
              
              {/* Sophisticated name display with Eastern calligraphy inspiration */}
              <div className="text-center space-y-2">
                <div className="relative">
                  <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 dark:from-slate-100 dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent relative z-10 touch-manipulation active:scale-95 transition-transform duration-200">
                    {getEffectiveDisplayName(user)}
                  </h3>
                  {/* Subtle darling blue text shadow */}
                  <h3 className="absolute top-0 left-0 text-xl sm:text-2xl font-bold text-blue-400/40 dark:text-blue-500/40 transform translate-x-0.5 translate-y-0.5">
                    {getEffectiveDisplayName(user)}
                  </h3>
                </div>
                
                <p className="text-sm font-mono text-slate-600 dark:text-slate-300 bg-blue-50/50 dark:bg-blue-900/20 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-700 touch-manipulation active:scale-95 transition-transform duration-200">
                  @{user.walletAddress ? user.walletAddress.slice(-6) : 'unknown'}
                </p>
                
                {/* Refined status badges */}
                <div className="flex justify-center gap-2">
                  {isOwnProfile && (
                    <Badge className="bg-gradient-to-r from-orange-400 to-amber-500 text-white border border-blue-300 dark:border-blue-500 shadow-sm touch-manipulation active:scale-95 transition-transform duration-200">
                      You
                    </Badge>
                  )}
                  {user.isOnline && !isOwnProfile && (
                    <Badge className="bg-gradient-to-r from-emerald-400 to-green-500 text-white border border-blue-300 dark:border-blue-500 shadow-sm touch-manipulation active:scale-95 transition-transform duration-200">
                      Online
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Elegant Wallet Address Section */}
            <div className="space-y-3">
              <label className="text-sm font-medium bg-gradient-to-r from-slate-700 via-blue-700 to-indigo-700 dark:from-slate-300 dark:via-blue-300 dark:to-indigo-300 bg-clip-text text-transparent">
                Wallet Address
              </label>
              <div className="relative group">
                {/* Darling blue outline container */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-indigo-400/20 to-blue-400/20 rounded-xl border-2 border-blue-400 dark:border-blue-500 shadow-lg"></div>
                <div className="relative bg-gradient-to-r from-blue-50/80 via-white to-blue-50/80 dark:from-blue-900/30 dark:via-slate-800 dark:to-blue-900/30 p-3 rounded-xl border border-blue-200 dark:border-blue-700 backdrop-blur-sm">
                  <div className="flex items-center space-x-3">
                    <code className="flex-1 text-xs font-mono text-slate-700 dark:text-slate-300 break-all selection:bg-blue-200 dark:selection:bg-blue-800">
                      {user.walletAddress}
                    </code>
                    <Button
                      onClick={copyWalletAddress}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-300 dark:border-blue-600 rounded-lg touch-manipulation active:scale-95 transition-all duration-200 group"
                    >
                      <Copy className="h-4 w-4 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sophisticated Action Buttons with Eastern Aesthetics */}
            <div className="space-y-4">
              {/* For own profile, only show Send Message */}
              {isOwnProfile ? (
                <>
                  {onSendMessage && (
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 rounded-xl opacity-90 group-hover:opacity-100 group-active:opacity-100 transition-all duration-300 shadow-lg"></div>
                      <Button 
                        onClick={onSendMessage}
                        className="relative w-full h-12 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:via-amber-600 hover:to-orange-700 text-white font-semibold border-2 border-blue-400 dark:border-blue-500 rounded-xl shadow-xl touch-manipulation active:scale-95 transition-all duration-200"
                      >
                        <MessageCircle className="h-5 w-5 mr-2" />
                        Message Yourself
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Row 1: Send Message (Orange, Full Width) */}
                  {onSendMessage && (
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 rounded-xl opacity-90 group-hover:opacity-100 group-active:opacity-100 transition-all duration-300 shadow-lg"></div>
                      <Button 
                        onClick={onSendMessage}
                        className="relative w-full h-12 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:via-amber-600 hover:to-orange-700 text-white font-semibold border-2 border-blue-400 dark:border-blue-500 rounded-xl shadow-xl touch-manipulation active:scale-95 transition-all duration-200"
                      >
                        <MessageCircle className="h-5 w-5 mr-2" />
                        Send Message
                      </Button>
                    </div>
                  )}
                  
                  {/* Row 2: Call and Video (Side by Side) */}
                  {(onStartCall || onStartVideoCall) && (
                    <div className="grid grid-cols-2 gap-4">
                      {onStartCall && (
                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-300 via-indigo-300 to-blue-400 rounded-xl opacity-70 group-hover:opacity-90 group-active:opacity-100 transition-all duration-300 shadow-lg"></div>
                          <Button 
                            onClick={onStartCall}
                            variant="outline"
                            className="relative h-12 w-full bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-100 dark:from-blue-900/50 dark:via-indigo-900/50 dark:to-blue-900/50 hover:from-blue-100 hover:via-indigo-100 hover:to-blue-200 dark:hover:from-blue-800/50 dark:hover:via-indigo-800/50 dark:hover:to-blue-800/50 border-2 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300 font-medium rounded-xl shadow-lg touch-manipulation active:scale-95 transition-all duration-200"
                          >
                            <Phone className="h-5 w-5 mr-2" />
                            Call
                          </Button>
                        </div>
                      )}
                      {onStartVideoCall && (
                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-300 via-indigo-300 to-purple-400 rounded-xl opacity-70 group-hover:opacity-90 group-active:opacity-100 transition-all duration-300 shadow-lg"></div>
                          <Button 
                            onClick={onStartVideoCall}
                            variant="outline"
                            className="relative h-12 w-full bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-100 dark:from-purple-900/50 dark:via-indigo-900/50 dark:to-purple-900/50 hover:from-purple-100 hover:via-indigo-100 hover:to-purple-200 dark:hover:from-purple-800/50 dark:hover:via-indigo-800/50 dark:hover:to-purple-800/50 border-2 border-blue-400 dark:border-blue-500 text-purple-700 dark:text-purple-300 font-medium rounded-xl shadow-lg touch-manipulation active:scale-95 transition-all duration-200"
                          >
                            <Video className="h-5 w-5 mr-2" />
                            Video
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Row 3: Delete Contact (Full Width) */}
                  {onDeleteContact && (
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-300 via-rose-300 to-red-400 rounded-xl opacity-70 group-hover:opacity-90 group-active:opacity-100 transition-all duration-300 shadow-lg"></div>
                      <Button 
                        onClick={handleDeleteContactClick}
                        variant="outline"
                        className="relative w-full h-12 bg-gradient-to-r from-red-50 via-rose-50 to-red-100 dark:from-red-900/50 dark:via-rose-900/50 dark:to-red-900/50 hover:from-red-100 hover:via-rose-100 hover:to-red-200 dark:hover:from-red-800/50 dark:hover:via-rose-800/50 dark:hover:to-red-800/50 border-2 border-blue-400 dark:border-blue-500 text-red-700 dark:text-red-300 font-medium rounded-xl shadow-lg touch-manipulation active:scale-95 transition-all duration-200"
                      >
                        <UserMinus className="h-5 w-5 mr-2" />
                        Delete Contact
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Elegant Last Seen Section */}
            {user.lastSeen && (
              <div className="text-center pt-4 border-t-2 border-blue-200/50 dark:border-blue-700/50">
                <p className="text-sm font-medium bg-gradient-to-r from-slate-600 via-blue-600 to-indigo-600 dark:from-slate-400 dark:via-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  Last seen: {new Date(user.lastSeen).toLocaleString()}
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