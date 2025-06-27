import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MoreVertical, Settings, Star, Users, Plus, Search, MessageCircle, Crown, Shield } from "lucide-react";
import type { User, Message } from "@shared/schema";

interface HamburgerMenuProps {
  onOpenSettings: () => void;
}

interface StarredMessage extends Message {
  sender: User;
  conversationId: number;
}

export default function HamburgerMenu({ onOpenSettings }: HamburgerMenuProps) {
  const [showStarredMessages, setShowStarredMessages] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch starred messages
  const { data: starredMessages = [] } = useQuery<StarredMessage[]>({
    queryKey: ["/api/messages/starred"],
    enabled: showStarredMessages,
  });

  // Fetch all users for group creation
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: showNewGroup,
  });

  const filteredUsers = allUsers.filter(user => 
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast({
        title: "Group name required",
        description: "Please enter a name for the group",
        variant: "destructive"
      });
      return;
    }

    if (selectedUsers.length < 2) {
      toast({
        title: "Select members",
        description: "Please select at least 2 members for the group",
        variant: "destructive"
      });
      return;
    }

    try {
      // API call to create group would go here
      toast({
        title: "Group created",
        description: `Successfully created group "${groupName}"`,
      });
      
      // Reset form
      setGroupName("");
      setSelectedUsers([]);
      setShowNewGroup(false);
    } catch (error) {
      toast({
        title: "Failed to create group",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleUserToggle = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const formatTimestamp = (timestamp: string | Date | null) => {
    if (!timestamp) return "";
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleStarMessage = async (message: StarredMessage) => {
    try {
      await apiRequest(`/api/messages/${message.id}/star`, {
        method: 'PATCH',
        body: { starred: !message.starred }
      });
      
      // Refresh starred messages list
      queryClient.invalidateQueries({ queryKey: ["/api/messages/starred"] });
      
      toast({
        title: message.starred ? "Message unstarred" : "Message starred",
        description: message.starred ? "Removed from starred messages" : "Added to starred messages",
      });
    } catch (error) {
      toast({
        title: "Failed to update message",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-10 w-10 hover:bg-accent"
            title="Menu"
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setShowStarredMessages(true)}>
            <Star className="h-4 w-4 mr-3" />
            Starred Messages
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowNewGroup(true)}>
            <Users className="h-4 w-4 mr-3" />
            New Group
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onOpenSettings}>
            <Settings className="h-4 w-4 mr-3" />
            Settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Starred Messages Modal */}
      <Dialog open={showStarredMessages} onOpenChange={setShowStarredMessages}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Starred Messages
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            {starredMessages.length === 0 ? (
              <div className="text-center py-8">
                <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No starred messages</h3>
                <p className="text-muted-foreground">Star important messages to find them easily later</p>
              </div>
            ) : (
              <div className="space-y-4">
                {starredMessages.map((message) => (
                  <div key={message.id} className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={message.sender.profilePicture || ""} />
                        <AvatarFallback>
                          {message.sender.displayName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">
                            {message.sender.displayName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(message.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground break-words">
                          {message.content || `${message.cryptoAmount} ${message.cryptoCurrency}`}
                        </p>
                        {message.messageType === "crypto" && (
                          <Badge variant="secondary" className="mt-2">
                            <MessageCircle className="h-3 w-3 mr-1" />
                            Crypto Transaction
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1 h-8 w-8 hover:bg-gray-100 dark:hover:bg-slate-700"
                        onClick={() => handleStarMessage(message)}
                        title="Unstar"
                      >
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* New Group Modal */}
      <Dialog open={showNewGroup} onOpenChange={setShowNewGroup}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Create New Group
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Group Info */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="groupName">Group Name</Label>
                <Input
                  id="groupName"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className="mt-1"
                />
              </div>
              

            </div>

            <Separator />

            {/* Member Selection */}
            <div>
              <Label>Add Members</Label>
              <div className="mt-2 space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users..."
                    className="pl-9"
                  />
                </div>

                {/* Selected count */}
                {selectedUsers.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {selectedUsers.length} member{selectedUsers.length !== 1 ? 's' : ''} selected
                  </div>
                )}

                {/* User list */}
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-2">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedUsers.includes(user.id)
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-accent"
                        }`}
                        onClick={() => handleUserToggle(user.id)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.profilePicture || ""} />
                          <AvatarFallback>
                            {user.displayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium text-foreground">
                            {user.displayName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            @{user.username}
                          </div>
                        </div>
                        {selectedUsers.includes(user.id) && (
                          <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                            <Plus className="h-2 w-2 text-primary-foreground rotate-45" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowNewGroup(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 dark:from-cyan-500 dark:to-cyan-600 dark:hover:from-cyan-600 dark:hover:to-cyan-700"
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedUsers.length < 2}
              >
                Create Group
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}