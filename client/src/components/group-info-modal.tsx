import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  Settings, 
  Edit, 
  UserPlus, 
  UserMinus, 
  Crown, 
  Shield, 
  LogOut,
  Camera,
  Check,
  X,
  MoreVertical
} from "lucide-react";
import type { User } from "@shared/schema";

interface GroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: number;
  currentUserId: number;
}

interface GroupMember {
  id: number;
  userId: number;
  user: User;
  role: string;
  joinedAt: string;
  addedBy?: number;
}

interface GroupInfo {
  id: number;
  groupName: string;
  groupDescription?: string;
  groupIcon?: string;
  createdBy: number;
  createdAt: string;
  memberCount: number;
}

export default function GroupInfoModal({ isOpen, onClose, conversationId, currentUserId }: GroupInfoModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch group info
  const { data: groupInfo, isLoading: infoLoading } = useQuery({
    queryKey: ["/api/groups", conversationId, "info"],
    enabled: isOpen && !!conversationId,
  });

  // Fetch group members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["/api/groups", conversationId, "members"],
    enabled: isOpen && !!conversationId,
  });

  // Type-safe access to data with proper validation
  const membersList: GroupMember[] = Array.isArray(members) ? members : [];
  const groupDetails: GroupInfo | null = groupInfo && typeof groupInfo === 'object' && 'id' in groupInfo ? groupInfo as GroupInfo : null;
  const currentUser = membersList.find((m: GroupMember) => m.userId === currentUserId);
  const isAdmin = currentUser?.role === "admin";
  const isCreator = groupDetails?.createdBy === currentUserId;

  useEffect(() => {
    if (groupDetails) {
      setGroupName(groupDetails.groupName || "");
      setGroupDescription(groupDetails.groupDescription || "");
    }
  }, [groupDetails]);

  // Update group info mutation
  const updateGroupMutation = useMutation({
    mutationFn: (data: { groupName: string; groupDescription: string }) =>
      apiRequest(`/api/groups/${conversationId}`, "PATCH", data),
    onSuccess: () => {
      toast({
        title: "Group updated",
        description: "Group information has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update group information",
        variant: "destructive",
      });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: (userId: number) =>
      apiRequest(`/api/groups/${conversationId}/members/${userId}`, "DELETE"),
    onSuccess: () => {
      toast({
        title: "Member removed",
        description: "Member has been removed from the group",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", conversationId, "members"] });
    },
    onError: () => {
      toast({
        title: "Remove failed",
        description: "Failed to remove member from group",
        variant: "destructive",
      });
    },
  });

  // Leave group mutation
  const leaveGroupMutation = useMutation({
    mutationFn: () => apiRequest(`/api/groups/${conversationId}/leave`, "DELETE"),
    onSuccess: () => {
      toast({
        title: "Left group",
        description: "You have left the group",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Leave failed",
        description: "Failed to leave group",
        variant: "destructive",
      });
    },
  });

  const handleSaveChanges = () => {
    if (!groupName.trim()) {
      toast({
        title: "Group name required",
        description: "Please enter a group name",
        variant: "destructive",
      });
      return;
    }

    updateGroupMutation.mutate({
      groupName: groupName.trim(),
      groupDescription: groupDescription.trim(),
    });
  };

  const handleRemoveMember = (userId: number) => {
    removeMemberMutation.mutate(userId);
  };

  const handleLeaveGroup = () => {
    leaveGroupMutation.mutate();
  };

  if (infoLoading || membersLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
            Group Info
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="space-y-6">
            {/* Group Header */}
            <div className="text-center space-y-4">
              <div className="relative inline-block">
                <Avatar className="h-24 w-24 ring-2 ring-orange-200 dark:ring-orange-600">
                  <AvatarImage src={groupDetails?.groupIcon || ""} />
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-2xl">
                    <Users className="h-10 w-10" />
                  </AvatarFallback>
                </Avatar>
                {isAdmin && (
                  <button className="absolute bottom-0 right-0 h-8 w-8 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center text-white shadow-lg transition-colors">
                    <Camera className="h-4 w-4" />
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <Input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Group name"
                    className="text-center font-semibold"
                  />
                  <Textarea
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="Group description (optional)"
                    className="text-center text-sm resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveChanges}
                      disabled={updateGroupMutation.isPending}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {groupDetails?.groupName}
                    </h3>
                    {isAdmin && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                      >
                        <Edit className="h-4 w-4 text-gray-500" />
                      </button>
                    )}
                  </div>
                  {groupDetails?.groupDescription && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {groupDetails.groupDescription}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Created {new Date(groupDetails?.createdAt || "").toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Members Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {membersList.length || 0} Members
                </h4>
                {isAdmin && (
                  <Button size="sm" variant="outline" className="text-orange-600 border-orange-200">
                    <UserPlus className="h-4 w-4 mr-1" />
                    Add Member
                  </Button>
                )}
              </div>

              <div className="space-y-1">
                {membersList.map((member: GroupMember) => (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.user.profilePicture || ""} />
                        <AvatarFallback className="bg-gradient-to-br from-gray-400 to-gray-500 text-white">
                          {member.user.displayName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {member.user.displayName}
                            {member.userId === currentUserId && " (You)"}
                          </p>
                          {member.role === "admin" && (
                            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                              <Crown className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {isAdmin && member.userId !== currentUserId && (
                      <button
                        onClick={() => handleRemoveMember(member.userId)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full text-red-500 hover:text-red-600 transition-colors"
                        title="Remove member"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Actions Section */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={handleLeaveGroup}
                disabled={leaveGroupMutation.isPending}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Leave Group
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}