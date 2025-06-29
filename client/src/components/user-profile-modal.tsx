import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, MessageCircle, Phone, Video, Wallet, UserMinus, AlertTriangle } from "lucide-react";
import { UserAvatarIcon } from "@/components/ui/user-avatar-icon";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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
        <DialogContent className="sm:max-w-md bg-white dark:bg-card border border-border p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-6">
            {/* Profile Picture and Basic Info */}
            <div className="flex flex-col items-center space-y-3">
              <div className="relative">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                  <AvatarImage src={user.profilePicture || ""} />
                  <AvatarFallback className="bg-gray-200 dark:bg-gray-700">
                    <UserAvatarIcon className="w-10 h-10 sm:w-12 sm:h-12 text-gray-500 dark:text-gray-400" />
                  </AvatarFallback>
                </Avatar>
                {user.isOnline && (
                  <div className="absolute bottom-0 right-0 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 border-2 border-white dark:border-card rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full"></div>
                  </div>
                )}
              </div>
              
              <div className="text-center space-y-1">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                  {user.displayName}
                </h3>
                <p className="text-sm text-gray-500 dark:text-muted-foreground">
                  @{user.walletAddress ? user.walletAddress.slice(-6) : 'unknown'}
                </p>
                {user.isOnline && (
                  <Badge className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs">
                    Online
                  </Badge>
                )}
              </div>
            </div>

            {/* Wallet Address */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                Wallet Address
              </label>
              <div className="flex items-center space-x-2 p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <code className="flex-1 text-xs font-mono text-gray-600 dark:text-gray-300 break-all">
                  {user.walletAddress}
                </code>
                <Button
                  onClick={copyWalletAddress}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 sm:h-8 sm:w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Row 1: Send Message (Orange, Full Width) */}
              {onSendMessage && (
                <Button 
                  onClick={onSendMessage}
                  className="w-full h-10 sm:h-12 bg-orange-500 hover:bg-orange-600 text-white font-medium"
                >
                  <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Send Message
                </Button>
              )}
              
              {/* Row 2: Call and Video (Side by Side) */}
              {(onStartCall || onStartVideoCall) && (
                <div className="grid grid-cols-2 gap-3">
                  {onStartCall && (
                    <Button 
                      onClick={onStartCall}
                      variant="outline"
                      className="h-10 sm:h-12 flex items-center justify-center bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <Phone className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      Call
                    </Button>
                  )}
                  {onStartVideoCall && (
                    <Button 
                      onClick={onStartVideoCall}
                      variant="outline"
                      className="h-10 sm:h-12 flex items-center justify-center bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <Video className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      Video
                    </Button>
                  )}
                </div>
              )}
              
              {/* Row 3: Delete Contact (Full Width) */}
              {onDeleteContact && (
                <Button 
                  onClick={handleDeleteContactClick}
                  variant="outline"
                  className="w-full h-10 sm:h-12 bg-white dark:bg-card hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  <UserMinus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Delete Contact
                </Button>
              )}
            </div>

            {/* Additional Info */}
            {user.lastSeen && (
              <div className="text-center pt-4 border-t border-border">
                <p className="text-xs text-gray-500 dark:text-muted-foreground">
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