import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MoreVertical, Settings, Star, Users, Plus, Search, MessageCircle, Crown, Shield, Check } from "lucide-react";
import type { User, Message } from "@shared/schema";

interface HamburgerMenuProps {
  onOpenSettings: () => void;
  onGroupCreated?: (conversationId: number) => void;
  externalGroupCreate?: boolean;
  onExternalGroupCreateClose?: () => void;
}

interface StarredMessage extends Message {
  sender: User;
  conversationId: number;
}

export default function HamburgerMenu({ onOpenSettings, onGroupCreated, externalGroupCreate, onExternalGroupCreateClose }: HamburgerMenuProps) {
  const [showStarredMessages, setShowStarredMessages] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);

  // Effect to handle external group creation trigger
  useEffect(() => {
    if (externalGroupCreate) {
      setShowNewGroup(true);
    }
  }, [externalGroupCreate]);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageToUnstar, setMessageToUnstar] = useState<StarredMessage | null>(null);
  const [showUnstarConfirm, setShowUnstarConfirm] = useState(false);
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

  // Reset scroll position when search changes
  const userListRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (userListRef.current && searchQuery) {
      userListRef.current.scrollTop = 0;
    }
  }, [searchQuery]);

  const handleCreateGroup = async () => {
    console.log("Create Group clicked!", {
      groupName: groupName.trim(),
      selectedUsers,
      selectedUsersLength: selectedUsers.length
    });

    if (!groupName.trim()) {
      console.log("Group name validation failed");
      alert("Group name required");
      return;
    }

    if (selectedUsers.length < 2) {
      console.log("Member selection validation failed");
      alert("Please select at least 2 members for the group");
      return;
    }

    try {
      // Get current user ID from localStorage
      const connectedUser = JSON.parse(localStorage.getItem('connectedUser') || '{}');
      const currentUserId = connectedUser.id || 5;
      
      console.log("Sending group creation request:", {
        groupName: groupName.trim(),
        memberIds: selectedUsers,
        createdBy: currentUserId,
      });
      
      const response = await apiRequest("/api/groups", "POST", {
        groupName: groupName.trim(),
        memberIds: selectedUsers, // Don't duplicate current user
        createdBy: currentUserId,
      });
      
      console.log("Group creation response:", response);
      
      alert(`Successfully created group "${groupName}"`);
      
      // Refresh conversations list
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      
      // Navigate to the new group if callback provided
      if (onGroupCreated && response.id) {
        onGroupCreated(response.id);
      }
      
      // Reset form
      setGroupName("");
      setSelectedUsers([]);
      setShowNewGroup(false);
      
      // Close external trigger if active
      if (onExternalGroupCreateClose) {
        onExternalGroupCreateClose();
      }
    } catch (error) {
      console.error("Group creation error:", error);
      alert("Failed to create group. Please try again.");
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
    // If message is starred and we're trying to unstar, show confirmation
    if (message.isStarred) {
      setMessageToUnstar(message);
      setShowUnstarConfirm(true);
      return;
    }
    
    // If message is not starred, star it directly
    try {
      await apiRequest('PATCH', `/api/messages/${message.id}/star`, { isStarred: true });
      
      // Refresh starred messages list
      queryClient.invalidateQueries({ queryKey: ["/api/messages/starred"] });
      
      toast({
        title: "Message starred",
        description: "Added to starred messages",
      });
    } catch (error) {
      toast({
        title: "Failed to star message",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const confirmUnstarMessage = async () => {
    if (!messageToUnstar) return;
    
    try {
      console.log('Unstarring message:', messageToUnstar.id);
      await apiRequest('PATCH', `/api/messages/${messageToUnstar.id}/star`, { isStarred: false });
      
      // Refresh starred messages list
      queryClient.invalidateQueries({ queryKey: ["/api/messages/starred"] });
      
      toast({
        title: "Message unstarred",
        description: "Removed from starred messages",
      });
    } catch (error) {
      console.error('Error unstarring message:', error);
      toast({
        title: "Failed to unstar message",
        description: "Please try again",
        variant: "destructive",
      });
    }
    
    setShowUnstarConfirm(false);
    setMessageToUnstar(null);
  };

  const cancelUnstarMessage = () => {
    setShowUnstarConfirm(false);
    setMessageToUnstar(null);
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
        <DialogContent className="w-[95vw] sm:w-[500px] max-h-[85vh] p-0 overflow-hidden bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-orange-200/30 dark:border-orange-800/30 shadow-2xl rounded-2xl">
          <div className="p-6 border-b border-orange-100 dark:border-orange-800 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20">
            <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-full">
                <Star className="h-5 w-5 text-orange-600 dark:text-orange-400 fill-current" />
              </div>
              Starred Messages
              {starredMessages.length > 0 && (
                <Badge variant="secondary" className="ml-auto bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
                  {starredMessages.length}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              View and manage your starred messages
            </DialogDescription>
          </div>
          
          <div className="flex-1 overflow-hidden">
            {starredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="p-4 bg-orange-100 dark:bg-orange-900/30 rounded-full mb-4">
                  <Star className="h-12 w-12 text-orange-500 dark:text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No starred messages yet</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm">
                  Star important messages to save them here for quick access later
                </p>
              </div>
            ) : (
              <div 
                className="p-4 space-y-3 max-h-[calc(85vh-120px)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                {starredMessages.map((message) => (
                  <div key={message.id} className="group relative p-4 rounded-xl border border-orange-200 dark:border-orange-700 bg-gradient-to-r from-white to-orange-50/30 dark:from-gray-800 dark:to-orange-900/10 hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-orange-200 dark:ring-orange-800">
                        <AvatarImage src={message.sender.profilePicture || ""} />
                        <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white font-semibold">
                          {message.sender.displayName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {message.sender.displayName}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded-full">
                            {formatTimestamp(message.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 break-words leading-relaxed">
                          {message.content || `${message.cryptoAmount} ${message.cryptoCurrency}`}
                        </p>
                        {message.messageType === "crypto" && (
                          <Badge variant="secondary" className="mt-3 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
                            <MessageCircle className="h-3 w-3 mr-1" />
                            Crypto Transaction
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-70 group-hover:opacity-100 p-2 h-9 w-9 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-full transition-all duration-200 hover:scale-110"
                        onClick={() => handleStarMessage(message)}
                        title="Unstar message"
                      >
                        <Star className="h-4 w-4 text-orange-500 dark:text-orange-400 fill-current" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* New Group Modal */}
      <Dialog open={showNewGroup} onOpenChange={(open) => {
        setShowNewGroup(open);
        if (!open && onExternalGroupCreateClose) {
          onExternalGroupCreateClose();
        }
      }}>
        <DialogContent className="w-[95vw] sm:w-[450px] h-[95vh] sm:h-auto sm:max-h-[95vh] p-0 overflow-hidden bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-gray-200/20 dark:border-gray-800/20 shadow-2xl rounded-2xl flex flex-col max-h-[95vh] my-[2.5vh]">
          <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              Create New Group
            </DialogTitle>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden p-3 min-h-0">
            {/* Group Info */}
            <div className="mb-3 flex-shrink-0">
              <Label htmlFor="groupName" className="text-sm">Group Name</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                className="mt-1 h-9"
              />
            </div>

            <Separator className="mb-3" />

            {/* Member Selection */}
            <div className="flex-1 overflow-hidden min-h-0">
              <Label className="text-sm">Add Members</Label>
              <div className="mt-2 h-full flex flex-col min-h-0">
                {/* Search */}
                <div className="relative mb-2 flex-shrink-0">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users..."
                    className="pl-9 h-9"
                  />
                </div>

                {/* Selected count */}
                {selectedUsers.length > 0 && (
                  <div className="text-xs text-muted-foreground mb-2 flex-shrink-0">
                    {selectedUsers.length} member{selectedUsers.length !== 1 ? 's' : ''} selected
                  </div>
                )}

                {/* User list - takes remaining space */}
                <div 
                  ref={userListRef}
                  className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-gray-100 dark:scrollbar-track-gray-800 dark:scrollbar-thumb-orange-600 border border-gray-200 dark:border-gray-700 rounded-lg p-2 min-h-0"
                  style={{ 
                    WebkitOverflowScrolling: 'touch',
                    touchAction: 'pan-y',
                    overscrollBehavior: 'contain'
                  }}
                >
                  {filteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Users className="h-12 w-12 text-gray-400 mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">
                        {allUsers.length === 0 ? "Loading users..." : "No users found"}
                      </p>
                    </div>
                  ) : (
                    filteredUsers.map((user) => {
                      const isSelected = selectedUsers.includes(user.id);
                      return (<div
                        key={user.id}
                        className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 transform hover:scale-[1.02] ${
                        isSelected
                          ? "bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 shadow-md"
                          : "bg-white dark:bg-gray-800/50 hover:bg-orange-50 dark:hover:bg-orange-900/10 border border-gray-200 dark:border-gray-700 hover:border-orange-200 dark:hover:border-orange-800"
                      }`}
                      onClick={() => handleUserToggle(user.id)}
                    >
                      <Avatar className={`h-12 w-12 ring-2 transition-all duration-200 ${
                        isSelected
                          ? "ring-orange-300 dark:ring-orange-600"
                          : "ring-gray-200 dark:ring-gray-700"
                      }`}>
                        <AvatarImage src={user.profilePicture || ""} />
                        <AvatarFallback className={`font-bold text-lg transition-all duration-200 ${
                          isSelected
                            ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white"
                            : "bg-gradient-to-br from-gray-400 to-gray-500 text-white"
                        }`}>
                          {user.displayName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-white truncate text-base">
                          {user.displayName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          @{user.username}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="h-7 w-7 rounded-full bg-orange-500 flex items-center justify-center shrink-0 shadow-lg">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      )}
                      </div>
                    );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons - Fixed at bottom */}
          <div className="flex-shrink-0 p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-b-2xl">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-10 rounded-xl border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-all duration-200 text-sm"
                  onClick={() => {
                    // Reset form and close modal
                    setGroupName("");
                    setSelectedUsers([]);
                    setSearchQuery("");
                    setShowNewGroup(false);
                    if (onExternalGroupCreateClose) {
                      onExternalGroupCreateClose();
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none text-sm"
                  onClick={(e) => {
                    console.log("Button clicked!", e);
                    e.preventDefault();
                    e.stopPropagation();
                    handleCreateGroup();
                  }}
                  disabled={!groupName.trim() || selectedUsers.length < 2}
                >
                  Create Group
                </Button>
              </div>
            </div>
        </DialogContent>
      </Dialog>

      {/* Unstar Confirmation Dialog */}
      <AlertDialog open={showUnstarConfirm} onOpenChange={setShowUnstarConfirm}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from starred messages?</AlertDialogTitle>
            <AlertDialogDescription>
              This message will be removed from your starred messages. You can star it again anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelUnstarMessage}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmUnstarMessage}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}