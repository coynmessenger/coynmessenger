import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Users, LogOut, Edit2, Camera, User as UserIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import UserProfileModal from "./user-profile-modal";

interface SimpleGroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: number;
  currentUserId: number;
}

export default function SimpleGroupInfoModal({ isOpen, onClose, conversationId, currentUserId }: SimpleGroupInfoModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [showMemberProfile, setShowMemberProfile] = useState(false);

  // Fetch conversations to get group info
  const { data: conversations = [] } = useQuery<any[]>({
    queryKey: ["/api/conversations"],
    enabled: isOpen,
  });

  // Find the group conversation
  const groupConversation = conversations.find((conv: any) => conv.id === conversationId && conv.isGroup);
  
  // Fetch group members - will return empty if no members in DB
  const { data: groupMembers = [] } = useQuery<any[]>({
    queryKey: [`/api/groups/${conversationId}/members`],
    enabled: isOpen && !!conversationId,
  });
  
  // Fetch all users as fallback if no members
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isOpen && groupMembers.length === 0,
  });

  // Use actual members if available, otherwise show demo users
  const members = groupMembers.length > 0 
    ? groupMembers.map((m: any) => m.user)
    : allUsers.filter((user: User) => user.isSetup);

  // Helper functions
  const handleMemberClick = (member: User) => {
    setSelectedMember(member);
    setShowMemberProfile(true);
  };

  const handleTitleEdit = () => {
    if (groupConversation) {
      setEditedTitle(groupConversation.groupName || "");
      setIsEditingTitle(true);
    }
  };

  const handleTitleSave = () => {
    if (editedTitle.trim()) {
      updateTitleMutation.mutate(editedTitle.trim());
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      uploadImageMutation.mutate(file);
    }
  };

  const getEffectiveDisplayName = (user: User): string => {
    return user.signInName || user.displayName || `@${user.walletAddress?.slice(-6) || 'user'}`;
  };

  // Update group title mutation
  const updateTitleMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      return apiRequest("PATCH", `/api/groups/${conversationId}`, { groupName: newTitle });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setIsEditingTitle(false);
      toast({
        title: "Group title updated",
        description: "The group title has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update group title.",
        variant: "destructive",
      });
    },
  });

  // Upload group image mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      return apiRequest("POST", `/api/groups/${conversationId}/upload-image`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Group image updated",
        description: "The group image has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload group image.",
        variant: "destructive",
      });
    },
  });

  // Leave group mutation
  const leaveGroupMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/groups/${conversationId}/leave`);
    },
    onSuccess: () => {
      toast({
        title: "Left group",
        description: "You have left the group",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${conversationId}/members`] });
      onClose();
      // Navigate back to messenger main page
      window.location.href = '/messenger';
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to leave group",
        variant: "destructive",
      });
    },
  });

  if (!isOpen) return null;

  const groupName = groupConversation?.groupName || "Group Chat";
  const createdDate = groupConversation?.createdAt 
    ? new Date(groupConversation.createdAt).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    : "Recently";

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/20 dark:border-slate-700/50">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Group Info</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center space-y-4 py-4">
            {/* Group Icon with Upload Option */}
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center overflow-hidden">
                {groupConversation?.groupIcon ? (
                  <img src={groupConversation.groupIcon} alt="Group" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-12 h-12 text-white" />
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadImageMutation.isPending}
              >
                <Camera className="w-4 h-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            
            {/* Editable Group Name */}
            <div className="text-center">
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-center"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTitleSave();
                      if (e.key === 'Escape') setIsEditingTitle(false);
                    }}
                  />
                  <Button size="sm" onClick={handleTitleSave} disabled={updateTitleMutation.isPending}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditingTitle(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{groupName}</h2>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleTitleEdit}
                    className="h-6 w-6 p-0"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
            
            {/* Created Date */}
            <p className="text-sm text-muted-foreground">Created {createdDate}</p>
          </div>

          {/* Members Section */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              {members.length} Members
            </h3>
            
            <div className="max-h-48 overflow-y-auto space-y-2">
              {members.map((member) => (
                <div 
                  key={member.id} 
                  className="flex items-center space-x-3 p-2 hover:bg-accent rounded-lg cursor-pointer transition-colors"
                  onClick={() => handleMemberClick(member)}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={member.profilePicture || ""} />
                    <AvatarFallback>
                      <UserIcon className="w-6 h-6 text-slate-500" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{getEffectiveDisplayName(member)}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.id === currentUserId ? "You" : member.isOnline ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Leave Group Button */}
          <Button
            variant="outline"
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/20"
            onClick={() => leaveGroupMutation.mutate()}
            disabled={leaveGroupMutation.isPending}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {leaveGroupMutation.isPending ? "Leaving..." : "Leave Group"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Member Profile Modal */}
      {selectedMember && (
        <UserProfileModal
          isOpen={showMemberProfile}
          onClose={() => {
            setShowMemberProfile(false);
            setSelectedMember(null);
          }}
          user={selectedMember}
        />
      )}
    </>
  );
}