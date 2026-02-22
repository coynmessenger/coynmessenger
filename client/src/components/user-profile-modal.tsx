import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Copy, MessageCircle, Phone, Video, UserMinus, AlertTriangle, Wallet, Clock } from "lucide-react";
import { UserAvatarIcon } from "@/components/ui/user-avatar-icon";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

function getEffectiveDisplayName(user: User): string {
  if (user.displayName && !user.displayName.startsWith('@')) {
    return user.displayName;
  }
  if (user.signInName) {
    return user.signInName;
  }
  if (user.walletAddress) {
    return `@${user.walletAddress.slice(-6)}`;
  }
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
  
  const connectedUser = localStorage.getItem('connectedUser');
  const currentUserId = connectedUser ? JSON.parse(connectedUser).id : null;
  const isOwnProfile = currentUserId === user.id;

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
        <DialogContent className="sm:max-w-[380px] p-0 bg-gradient-to-b from-[#1a1a2e] via-[#16162a] to-[#111127] border border-orange-500/20 text-white overflow-hidden rounded-2xl gap-0 shadow-2xl shadow-orange-500/5 [&>button[class*='absolute']]:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>View user profile information and manage contact options</DialogDescription>
          </DialogHeader>

          <div className="relative px-6 pt-8 pb-5 text-center bg-gradient-to-b from-orange-500/10 to-transparent">
            <div className="relative inline-block mb-4">
              <Avatar className="h-20 w-20 border-2 border-orange-500/30 shadow-lg shadow-orange-500/10">
                <AvatarImage src={user.profilePicture || ""} />
                <AvatarFallback className="bg-[#1e1e3a]">
                  <UserAvatarIcon className="w-10 h-10 text-slate-400" />
                </AvatarFallback>
              </Avatar>
              {user.isOnline && (
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 border-2 border-[#1a1a2e] rounded-full" />
              )}
            </div>
            
            <h3 className="text-lg font-semibold text-white mb-0.5">
              {getEffectiveDisplayName(user)}
            </h3>
            <p className="text-sm text-slate-400 mb-2">
              @{user.walletAddress ? user.walletAddress.slice(-6) : 'unknown'}
            </p>
            {isOwnProfile && (
              <span className="inline-block text-xs px-2.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/20">
                You
              </span>
            )}
            {user.isOnline && !isOwnProfile && (
              <span className="inline-block text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                Online
              </span>
            )}
          </div>

          <div className="px-6 pb-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-orange-500/10">
                <Wallet className="w-[18px] h-[18px] text-orange-400/70" />
              </div>
              <code className="flex-1 text-xs font-mono text-slate-300 break-all leading-relaxed">
                {user.walletAddress}
              </code>
              <button
                onClick={copyWalletAddress}
                className="p-1.5 rounded-lg text-slate-400 hover:text-orange-400 hover:bg-white/5 transition-colors"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="px-6 pb-5 pt-3 space-y-2">
            {isOwnProfile ? (
              <>
                {onSendMessage && (
                  <Button 
                    onClick={onSendMessage}
                    className="w-full h-12 rounded-xl font-semibold text-sm shadow-lg transition-all bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 shadow-orange-600/25 text-white"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message Yourself
                  </Button>
                )}
              </>
            ) : (
              <>
                {onSendMessage && (
                  <Button 
                    onClick={onSendMessage}
                    className="w-full h-12 rounded-xl font-semibold text-sm shadow-lg transition-all bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 shadow-orange-600/25 text-white"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                )}
                
                {(onStartCall || onStartVideoCall) && (
                  <div className="grid grid-cols-2 gap-2">
                    {onStartCall && (
                      <Button 
                        onClick={onStartCall}
                        variant="ghost"
                        className="h-11 rounded-xl bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 hover:text-white font-medium text-sm"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Call
                      </Button>
                    )}
                    {onStartVideoCall && (
                      <Button 
                        onClick={onStartVideoCall}
                        variant="ghost"
                        className="h-11 rounded-xl bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 hover:text-white font-medium text-sm"
                      >
                        <Video className="h-4 w-4 mr-2" />
                        Video
                      </Button>
                    )}
                  </div>
                )}
                
                {onDeleteContact && (
                  <Button 
                    onClick={handleDeleteContactClick}
                    variant="ghost"
                    className="w-full h-11 rounded-xl bg-red-500/5 border border-red-500/15 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-medium text-sm"
                  >
                    <UserMinus className="h-4 w-4 mr-2" />
                    Delete Contact
                  </Button>
                )}
              </>
            )}

            {user.lastSeen && (
              <div className="flex items-center justify-center gap-1.5 pt-2">
                <Clock className="w-3 h-3 text-slate-500" />
                <p className="text-[11px] text-slate-500">
                  Last seen: {new Date(user.lastSeen).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <DialogContent className="sm:max-w-[380px] p-0 bg-gradient-to-b from-[#1a1a2e] via-[#16162a] to-[#111127] border border-red-500/20 text-white overflow-hidden rounded-2xl gap-0 shadow-2xl [&>button[class*='absolute']]:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>Confirm deletion of contact and conversation history</DialogDescription>
          </DialogHeader>
          
          <div className="relative px-6 pt-8 pb-5 text-center bg-gradient-to-b from-red-500/10 to-transparent">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-red-500/15 shadow-lg shadow-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Delete Contact</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Are you sure you want to delete <span className="text-red-300 font-medium">{getEffectiveDisplayName(user)}</span>? This will also remove your conversation history.
            </p>
          </div>

          <div className="px-6 pb-5 pt-2 space-y-2">
            <Button
              onClick={handleConfirmDelete}
              className="w-full h-12 rounded-xl font-semibold text-sm shadow-lg bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-red-600/25 text-white"
            >
              Delete Contact
            </Button>
            <Button
              onClick={handleCancelDelete}
              variant="ghost"
              className="w-full h-10 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium text-sm"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
