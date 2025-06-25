import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";
import { User, Edit3, Save, X } from "lucide-react";
import type { User as UserType } from "@shared/schema";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  
  const queryClient = useQueryClient();

  const { data: user } = useQuery<UserType>({
    queryKey: ["/api/user"],
  });

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setProfilePicture(user.profilePicture || "");
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: { displayName?: string; profilePicture?: string }) => {
      return apiRequest(`/api/users/${user?.id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setIsEditing(false);
    },
  });

  const handleSave = () => {
    if (!user) return;
    
    updateProfileMutation.mutate({
      displayName: displayName.trim(),
      profilePicture: profilePicture.trim() || null,
    });
  };

  const handleCancel = () => {
    if (user) {
      setDisplayName(user.displayName);
      setProfilePicture(user.profilePicture || "");
    }
    setIsEditing(false);
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-50 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-cyan-400" />
              <span>Profile Settings</span>
            </div>
            {!isEditing && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                className="text-slate-400 hover:text-cyan-400"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Picture */}
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={isEditing ? profilePicture : user.profilePicture || ""} />
              <AvatarFallback className="text-2xl">
                {(isEditing ? displayName : user.displayName).charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            {isEditing && (
              <div className="w-full space-y-2">
                <Label htmlFor="profilePicture" className="text-slate-300">
                  Profile Picture URL
                </Label>
                <Input
                  id="profilePicture"
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={profilePicture}
                  onChange={(e) => setProfilePicture(e.target.value)}
                  className="bg-slate-700 border-slate-600 focus:border-cyan-500"
                />
              </div>
            )}
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-slate-300">
              Display Name
            </Label>
            {isEditing ? (
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-slate-700 border-slate-600 focus:border-cyan-500"
                placeholder="Your display name"
              />
            ) : (
              <div className="p-3 bg-slate-700 rounded-md text-slate-200">
                {user.displayName}
              </div>
            )}
          </div>

          {/* Wallet Address (Read-only) */}
          <div className="space-y-2">
            <Label className="text-slate-300">Wallet Address</Label>
            <div className="p-3 bg-slate-700 rounded-md text-slate-400 font-mono text-sm break-all">
              {user.walletAddress}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            {isEditing ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1 border-slate-600 hover:bg-slate-700"
                  disabled={updateProfileMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateProfileMutation.isPending || !displayName.trim()}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-900"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateProfileMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </>
            ) : (
              <Button
                onClick={onClose}
                className="flex-1 bg-slate-600 hover:bg-slate-500"
              >
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}