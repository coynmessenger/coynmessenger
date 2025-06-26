import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, MessageCircle, Phone, Video, Wallet } from "lucide-react";
import { UserAvatarIcon } from "@/components/ui/user-avatar-icon";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

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

  const copyWalletAddress = () => {
    navigator.clipboard.writeText(user.walletAddress);
    toast({
      title: "Copied!",
      description: "Wallet address copied to clipboard",
      duration: 2000,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-card border border-border">
        <div className="py-2 bg-white dark:bg-card">
        </div>
        
        <div className="space-y-6">
          {/* Profile Picture and Basic Info */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user.profilePicture || ""} />
                <AvatarFallback className="bg-gray-200 dark:bg-gray-700">
                  <UserAvatarIcon className="w-12 h-12 text-gray-500 dark:text-gray-400" />
                </AvatarFallback>
              </Avatar>
              {user.isOnline && (
                <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 border-3 border-white dark:border-card rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
              )}
            </div>
            
            <div className="text-center">
              <h2 className="text-xl font-semibold text-black dark:text-foreground">{user.displayName}</h2>
              <p className="text-sm text-gray-600 dark:text-muted-foreground">@{user.username}</p>
              <Badge 
                variant={user.isOnline ? "default" : "secondary"} 
                className={`mt-2 ${user.isOnline ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500'}`}
              >
                {user.isOnline ? "Online" : "Offline"}
              </Badge>
            </div>
          </div>

          {/* Wallet Information */}
          <div className="space-y-3">
            <h3 className="font-medium text-black dark:text-foreground flex items-center">
              <Wallet className="h-4 w-4 mr-2" />
              Wallet Address
            </h3>
            <div className="bg-gray-50 dark:bg-muted rounded-lg p-3 border border-border">
              <div className="flex items-center justify-between">
                <code className="text-xs text-gray-700 dark:text-muted-foreground font-mono break-all">
                  {user.walletAddress}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyWalletAddress}
                  className="ml-2 h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-muted"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 gap-3">
            {onSendMessage && (
              <Button 
                onClick={onSendMessage}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              {onStartCall && (
                <Button 
                  onClick={onStartCall}
                  variant="outline"
                  className="bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted border-border text-black dark:text-foreground"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
              )}
              
              {onStartVideoCall && (
                <Button 
                  onClick={onStartVideoCall}
                  variant="outline"
                  className="bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted border-border text-black dark:text-foreground"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Video
                </Button>
              )}
            </div>
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