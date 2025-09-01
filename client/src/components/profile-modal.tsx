import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";
import { User, Edit3, Save, X, Upload, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User as UserType } from "@shared/schema";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('file');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      return apiRequest(`/api/users/${user?.id}`, "PUT", JSON.stringify(updates));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setIsEditing(false);
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('profileImage', file);
      
      const response = await fetch('/api/user/upload-avatar', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Include session cookies
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setProfilePicture(data.profilePicture);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Profile picture updated!",
        description: "Your new profile picture has been saved.",
      });
    },
    onError: (error: any) => {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload your profile picture. Please check your connection and try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!user) return;
    
    updateProfileMutation.mutate({
      displayName: displayName.trim(),
      profilePicture: profilePicture.trim() || undefined,
    });
  };

  const handleCancel = () => {
    if (user) {
      setDisplayName(user.displayName);
      setProfilePicture(user.profilePicture || "");
    }
    setIsEditing(false);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a JPEG, PNG, or GIF image.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      await uploadImageMutation.mutateAsync(file);
      event.target.value = ''; // Reset file input
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
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
              <div className="w-full space-y-4">
                {/* Upload Method Toggle */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={uploadMethod === 'file' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUploadMethod('file')}
                    className={uploadMethod === 'file' ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-900' : 'border-slate-600 hover:bg-slate-700'}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Upload Photo
                  </Button>
                  <Button
                    type="button"
                    variant={uploadMethod === 'url' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUploadMethod('url')}
                    className={uploadMethod === 'url' ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-900' : 'border-slate-600 hover:bg-slate-700'}
                  >
                    URL
                  </Button>
                </div>

                {uploadMethod === 'file' ? (
                  <div className="space-y-2">
                    <Label className="text-slate-300">
                      Choose Profile Picture
                    </Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={triggerFileSelect}
                      disabled={uploadImageMutation.isPending}
                      className="w-full border-slate-600 hover:bg-slate-700 min-h-[44px]"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadImageMutation.isPending ? 'Uploading...' : 'Select Image from Device'}
                    </Button>
                    <p className="text-xs text-slate-400 text-center">
                      JPEG, PNG, or GIF • Max 5MB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
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