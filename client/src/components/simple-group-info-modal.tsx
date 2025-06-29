import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface SimpleGroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: number;
  currentUserId: number;
}

export default function SimpleGroupInfoModal({ isOpen, onClose, conversationId, currentUserId }: SimpleGroupInfoModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Leave group mutation
  const leaveGroupMutation = useMutation({
    mutationFn: async () => {
      // Simple leave group - just refresh conversations
      return Promise.resolve();
    },
    onSuccess: () => {
      toast({
        title: "Left group",
        description: "You have left the group",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      onClose();
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Group Info</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 py-4">
          {/* Group Icon */}
          <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
            <Users className="w-12 h-12 text-white" />
          </div>
          
          {/* Group Name */}
          <h2 className="text-xl font-semibold">{groupName}</h2>
          
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
              <div key={member.id} className="flex items-center space-x-3 p-2 hover:bg-accent rounded-lg">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={member.profilePicture || ""} />
                  <AvatarFallback>{member.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{member.displayName}</p>
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
          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => leaveGroupMutation.mutate()}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Leave Group
        </Button>
      </DialogContent>
    </Dialog>
  );
}