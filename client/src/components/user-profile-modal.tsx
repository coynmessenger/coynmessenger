import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, MessageCircle, Phone, Video, Wallet, Trash2 } from "lucide-react";
import { UserAvatarIcon } from "@/components/ui/user-avatar-icon";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onStartCall?: () => void;
  onStartVideoCall?: () => void;
  onSendMessage?: () => void;
}

export default function UserProfileModal({ 
  isOpen, 
  onClose, 
  user, 
  onStartCall,
  onStartVideoCall,
  onSendMessage 
}: UserProfileModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Invalidate user cache when modal opens to ensure fresh data
  useEffect(() => {
    if (isOpen) {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    }
  }, [isOpen, queryClient]);

  // Early return if user is null
  if (!user) {
    return null;
  }

  const copyWalletAddress = () => {
    navigator.clipboard.writeText(user.walletAddress);
    toast({
      title: "Copied!",
      description: "Wallet address copied to clipboard",
      duration: 2000,
    });
  };

  const deleteContactMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/users/${user.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Contact deleted",
        description: "The contact and all conversations have been deleted",
        duration: 2000,
      });
      onClose();
    },
    onError: (error) => {
      console.error("Delete contact error:", error);
      toast({
        title: "Failed to delete contact",
        description: "Please try again",
        variant: "destructive"
      });
    }
  });

  const handleDeleteContact = () => {
    if (window.confirm(`Are you sure you want to delete ${user.displayName}? This will also delete all conversations with this contact.`)) {
      deleteContactMutation.mutate();
    }
  };

  return (
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
              <h2 className="text-lg sm:text-xl font-semibold text-black dark:text-foreground">{user.displayName}</h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-muted-foreground">@{user.walletAddress?.replace(/^0x/, '').slice(-6) || user.username}</p>
              <Badge 
                variant={user.isOnline ? "default" : "secondary"} 
                className={`mt-1 text-xs ${user.isOnline ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500'}`}
              >
                {user.isOnline ? "Online" : "Offline"}
              </Badge>
            </div>
          </div>

          {/* Wallet Information */}
          <div className="space-y-2">
            <h3 className="font-medium text-black dark:text-foreground flex items-center text-sm">
              <Wallet className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
              Wallet Address
            </h3>
            <div className="bg-gray-50 dark:bg-muted rounded-lg p-2 sm:p-3 border border-border">
              <div className="flex items-center justify-between gap-2">
                <code className="text-xs text-gray-700 dark:text-muted-foreground font-mono break-all flex-1 min-w-0">
                  {user.walletAddress}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyWalletAddress}
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0 flex-shrink-0 hover:bg-gray-200 dark:hover:bg-muted"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {onSendMessage && (
              <Button 
                onClick={onSendMessage}
                className="w-full h-9 sm:h-10 bg-orange-500 hover:bg-orange-600 text-white"
              >
                <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                <span className="text-sm">Send Message</span>
              </Button>
            )}
            
            <div className="grid grid-cols-2 gap-2">
              {onStartCall && (
                <Button 
                  onClick={onStartCall}
                  variant="outline"
                  className="h-9 sm:h-10 bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted border-border text-black dark:text-foreground"
                >
                  <Phone className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span className="text-xs sm:text-sm">Call</span>
                </Button>
              )}
              
              {onStartVideoCall && (
                <Button 
                  onClick={onStartVideoCall}
                  variant="outline"
                  className="h-9 sm:h-10 bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted border-border text-black dark:text-foreground"
                >
                  <Video className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span className="text-xs sm:text-sm">Video</span>
                </Button>
              )}
            </div>
            
            {/* Delete Contact Button */}
            <Button 
              onClick={() => handleDeleteContact()}
              variant="outline"
              className="w-full h-9 sm:h-10 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
            >
              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
              <span className="text-sm">Delete Contact</span>
            </Button>
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
  );
}