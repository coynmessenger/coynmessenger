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

  // Get connected user ID from localStorage
  const connectedUserId = localStorage.getItem('connectedUserId');
  
  const { data: user } = useQuery<UserType>({
    queryKey: ["/api/user", connectedUserId],
    queryFn: async () => {
      const response = await fetch(`/api/user?userId=${connectedUserId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      return response.json();
    },
    enabled: !!connectedUserId,
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
      queryClient.invalidateQueries({ queryKey: ["/api/user", connectedUserId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", connectedUserId] });
      setIsEditing(false);
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      // Set flag to prevent wallet event handlers from interfering during upload
      localStorage.setItem('fileUploadInProgress', 'true');
      
      // Store authentication state before upload to prevent loss
      const authBackup = {
        walletConnected: localStorage.getItem('walletConnected'),
        connectedUser: localStorage.getItem('connectedUser'),
        connectedUserId: localStorage.getItem('connectedUserId')
      };
      
      const formData = new FormData();
      formData.append('profileImage', file);
      
      try {
        const response = await fetch(`/api/user/upload-avatar?userId=${user?.id}`, {
          method: 'POST',
          body: formData,
        });
        
        // Restore authentication state if it was cleared during upload
        const currentAuth = {
          walletConnected: localStorage.getItem('walletConnected'),
          connectedUser: localStorage.getItem('connectedUser'),
          connectedUserId: localStorage.getItem('connectedUserId')
        };
        
        if (!currentAuth.walletConnected && authBackup.walletConnected) {
          localStorage.setItem('walletConnected', authBackup.walletConnected);
          localStorage.setItem('connectedUser', authBackup.connectedUser!);
          localStorage.setItem('connectedUserId', authBackup.connectedUserId!);
        }
        
        if (!response.ok) {
          throw new Error('Upload failed');
        }
        
        return response.json();
      } catch (error) {
        // Restore authentication state if it was cleared during upload
        const currentAuth = {
          walletConnected: localStorage.getItem('walletConnected'),
          connectedUser: localStorage.getItem('connectedUser'),
          connectedUserId: localStorage.getItem('connectedUserId')
        };
        
        if (!currentAuth.walletConnected && authBackup.walletConnected) {
          localStorage.setItem('walletConnected', authBackup.walletConnected);
          localStorage.setItem('connectedUser', authBackup.connectedUser!);
          localStorage.setItem('connectedUserId', authBackup.connectedUserId!);
        }
        
        throw error;
      } finally {
        // Clear the upload flag
        localStorage.removeItem('fileUploadInProgress');
      }
    },
    onSuccess: (data) => {
      setProfilePicture(data.profilePicture);
      queryClient.invalidateQueries({ queryKey: ["/api/user", connectedUserId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", connectedUserId] });
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
      <DialogContent hideCloseButton className="sm:max-w-[380px] p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 overflow-hidden rounded-2xl gap-0 shadow-2xl">
        <div className="relative px-6 pt-8 pb-6 text-center bg-gradient-to-b from-orange-50 dark:from-orange-950/30 to-transparent">
          <div className="flex flex-col items-center">
            <Avatar className="h-20 w-20 mb-3 ring-4 ring-orange-100 dark:ring-orange-900/50">
              <AvatarImage src={isEditing ? profilePicture : user.profilePicture || ""} />
              <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white font-bold text-2xl">
                {(isEditing ? displayName : user.displayName).charAt(0)}
              </AvatarFallback>
            </Avatar>
            {!isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/30 text-xs font-medium"
              >
                <Edit3 className="h-3 w-3 mr-1" />
                Edit Profile
              </Button>
            )}
          </div>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Profile</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 dark:text-gray-400">Your account details</p>
        </div>

        <div className="px-6 pb-2 space-y-3">
          {isEditing && (
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setUploadMethod('file')}
                  className={uploadMethod === 'file' 
                    ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-sm' 
                    : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}
                >
                  <Camera className="h-3.5 w-3.5 mr-1.5" />
                  Upload Photo
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setUploadMethod('url')}
                  className={uploadMethod === 'url' 
                    ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-sm' 
                    : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}
                >
                  URL
                </Button>
              </div>

              {uploadMethod === 'file' ? (
                <div className="space-y-2">
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
                    variant="ghost"
                    onClick={triggerFileSelect}
                    disabled={uploadImageMutation.isPending}
                    className="w-full h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm"
                  >
                    <Upload className="h-4 w-4 mr-2 text-orange-500" />
                    {uploadImageMutation.isPending ? 'Uploading...' : 'Select Image from Device'}
                  </Button>
                  <p className="text-[11px] text-gray-400 text-center">
                    JPEG, PNG, or GIF • Max 5MB
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="profilePicture" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Profile Picture URL
                  </Label>
                  <Input
                    id="profilePicture"
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    value={profilePicture}
                    onChange={(e) => setProfilePicture(e.target.value)}
                    className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 h-10 rounded-lg text-sm"
                  />
                </div>
              )}
            </div>
          )}

          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="displayName" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Display Name
              </Label>
              {isEditing ? (
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 h-10 rounded-lg text-sm"
                  placeholder="Your display name"
                />
              ) : (
                <div className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100">
                  {user.displayName}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Wallet Address</Label>
              <div className="p-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-500 dark:text-gray-400 font-mono break-all">
                {user.walletAddress}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-5 pt-3 space-y-2">
          {isEditing ? (
            <>
              <Button
                onClick={handleSave}
                disabled={updateProfileMutation.isPending || !displayName.trim()}
                className="w-full h-12 rounded-xl font-semibold text-sm shadow-lg transition-all bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 shadow-orange-300/30 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="ghost"
                onClick={handleCancel}
                disabled={updateProfileMutation.isPending}
                className="w-full h-10 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium text-sm"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full h-10 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium text-sm"
            >
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}