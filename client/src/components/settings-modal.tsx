import React, { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/lib/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Moon, Sun, Monitor, User as UserIcon, Bell, Shield, Palette, Database, Info, Copy, Upload, Camera } from "lucide-react";
import type { User } from "@shared/schema";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showShipping?: boolean;
}

export default function SettingsModal({ isOpen, onClose, showShipping = false }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [displayName, setDisplayName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [autoConnect, setAutoConnect] = useState(true);
  const [messagePreview, setMessagePreview] = useState(true);
  
  // Mailing address state
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("");

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // Update local state when user data changes
  React.useEffect(() => {
    if (user && isOpen) {
      setDisplayName(user.displayName || "");
      setWalletAddress(user.walletAddress || "");
      setProfilePicture(user.profilePicture || "");
      setFullName(user.fullName || "");
      setPhoneNumber(user.phoneNumber || "");
      setAddressLine1(user.addressLine1 || "");
      setAddressLine2(user.addressLine2 || "");
      setCity(user.city || "");
      setState(user.state || "");
      setZipCode(user.zipCode || "");
      setCountry(user.country || "");
    }
  }, [user, isOpen]);

  const updateUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      return apiRequest("PATCH", "/api/user", userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Settings updated",
        description: "Your profile has been updated successfully."
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive"
      });
    }
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("profileImage", file);
      console.log("Uploading file:", file.name, file.size);
      return apiRequest("POST", "/api/user/upload-avatar", formData);
    },
    onSuccess: (response: { profilePicture: string }) => {
      console.log("Upload successful, response:", response);
      setProfilePicture(response.profilePicture);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been uploaded successfully.",
      });
      setUploadingImage(false);
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload profile picture. Please try again.",
        variant: "destructive",
      });
      setUploadingImage(false);
    },
  });

  const handleSave = () => {
    const updateData: any = {
      displayName,
      profilePicture,
    };

    if (showShipping) {
      updateData.fullName = fullName;
      updateData.phoneNumber = phoneNumber;
      updateData.addressLine1 = addressLine1;
      updateData.addressLine2 = addressLine2;
      updateData.city = city;
      updateData.state = state;
      updateData.zipCode = zipCode;
      updateData.country = country;
    }

    updateUserMutation.mutate(updateData);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);
    uploadImageMutation.mutate(file);
  };

  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  const getThemeIcon = () => {
    switch (theme) {
      case "light": return <Sun className="h-4 w-4" />;
      case "dark": return <Moon className="h-4 w-4" />;
      default: return <Sun className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center">
            <UserIcon className="h-5 w-5 mr-2" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Settings */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-black dark:text-slate-100 flex items-center">
                <UserIcon className="h-4 w-4 mr-2" />
                {showShipping ? "Profile & Shipping Information" : "Profile Information"}
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-slate-400">
                {showShipping 
                  ? "Update your personal information and shipping address for marketplace purchases"
                  : "Update your personal information and preferences"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture Section */}
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={profilePicture} />
                    <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 dark:from-cyan-400 dark:to-cyan-600 text-white font-bold text-lg">
                      {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    onClick={triggerImageUpload}
                    disabled={uploadingImage}
                    variant="outline"
                    size="sm"
                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full p-0 bg-white dark:bg-slate-800 border-2 border-background"
                  >
                    {uploadingImage ? (
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                    ) : (
                      <Camera className="h-3 w-3" />
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-black dark:text-foreground">{user?.displayName || 'User'}</h3>
                  <p className="text-sm text-gray-600 dark:text-muted-foreground">@{user?.username}</p>
                  <Button
                    onClick={triggerImageUpload}
                    disabled={uploadingImage}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingImage ? "Uploading..." : "Change Picture"}
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              {/* Basic Profile */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-foreground">Basic Information</h4>
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-foreground">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"
                    placeholder="Your display name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="walletAddress" className="text-foreground">Wallet Address</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="walletAddress"
                      value={walletAddress}
                      readOnly
                      className="bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 flex-1"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(walletAddress);
                        toast({
                          title: "Copied to clipboard",
                          description: "Wallet address copied successfully",
                        });
                      }}
                      variant="outline"
                      size="sm"
                      className="border-gray-300 dark:border-slate-600"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Your wallet address cannot be changed for security reasons</p>
                </div>
              </div>

              {/* Mailing Address Section - Only show on marketplace */}
              {showShipping && (
                <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
                  <h4 className="text-md font-medium text-foreground mb-3">Shipping Address</h4>
                  <p className="text-sm text-muted-foreground mb-4">Add your shipping address for marketplace purchases</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-foreground">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                      className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-foreground">Phone Number</Label>
                    <Input
                      id="phone"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address1" className="text-foreground">Address Line 1</Label>
                    <Input
                      id="address1"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      placeholder="123 Main Street"
                      className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address2" className="text-foreground">Address Line 2 (Optional)</Label>
                    <Input
                      id="address2"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      placeholder="Apt, Suite, Unit, etc."
                      className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-foreground">City</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="New York"
                      className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-foreground">State/Province</Label>
                    <Input
                      id="state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="NY"
                      className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="zipCode" className="text-foreground">ZIP/Postal Code</Label>
                    <Input
                      id="zipCode"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="10001"
                      className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-foreground">Country</Label>
                    <Input
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="United States"
                      className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"
                    />
                  </div>
                </div>
                </div>
              )}

              <Button
                onClick={handleSave}
                disabled={updateUserMutation.isPending}
                className="bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white"
              >
                {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>

          {/* Appearance Settings */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center">
                <Palette className="h-4 w-4 mr-2" />
                Appearance
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Customize how the app looks and feels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-foreground">Theme</Label>
                  <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                </div>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="w-32 bg-input border-border">
                    <SelectValue>
                      <div className="flex items-center">
                        {getThemeIcon()}
                        <span className="ml-2 capitalize">{theme}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="light" className="text-foreground">
                      <div className="flex items-center">
                        <Sun className="h-4 w-4 mr-2" />
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value="dark" className="text-foreground">
                      <div className="flex items-center">
                        <Moon className="h-4 w-4 mr-2" />
                        Dark
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notifications Settings */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-black dark:text-slate-100 flex items-center">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-slate-400">
                Control how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-foreground">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications for new messages</p>
                </div>
                <Switch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
              <Separator className="bg-slate-600" />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-foreground">Message Preview</Label>
                  <p className="text-sm text-muted-foreground">Show message content in notifications</p>
                </div>
                <Switch
                  checked={messagePreview}
                  onCheckedChange={setMessagePreview}
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card className="bg-slate-700/50 border-slate-600">
            <CardHeader>
              <CardTitle className="text-black dark:text-slate-100 flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                Privacy & Security
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-slate-400">
                Manage your privacy and security preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-foreground">Auto-connect Wallet</Label>
                  <p className="text-sm text-muted-foreground">Automatically connect to COYN network</p>
                </div>
                <Switch
                  checked={autoConnect}
                  onCheckedChange={setAutoConnect}
                />
              </div>
              <Separator className="bg-slate-600" />
              <div className="space-y-2">
                <Button variant="outline" className="w-full border-border text-foreground hover:bg-muted">
                  <Database className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
                <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
                  Clear All Data
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card className="bg-slate-700/50 border-slate-600">
            <CardHeader>
              <CardTitle className="text-black dark:text-slate-100 flex items-center">
                <Info className="h-4 w-4 mr-2" />
                About
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Version</span>
                <span className="text-foreground">1.0.0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Network</span>
                <span className="text-foreground">COYN Network</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Build</span>
                <span className="text-foreground">Production</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose} variant="outline" className="border-border text-foreground">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}