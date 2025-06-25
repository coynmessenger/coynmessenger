import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button as ToggleButton } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/lib/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Moon, Sun, Monitor, User as UserIcon, Bell, Shield, Palette, Database, Info, Copy } from "lucide-react";
import type { User } from "@shared/schema";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  
  const [displayName, setDisplayName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
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
    if (user) {
      setDisplayName(user.displayName || "");
      setWalletAddress(user.walletAddress || "");
      // Set mailing address fields
      setFullName(user.fullName || "");
      setPhoneNumber(user.phoneNumber || "");
      setAddressLine1(user.addressLine1 || "");
      setAddressLine2(user.addressLine2 || "");
      setCity(user.city || "");
      setState(user.state || "");
      setZipCode(user.zipCode || "");
      setCountry(user.country || "");
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: { 
      displayName?: string; 
      walletAddress?: string;
      fullName?: string;
      phoneNumber?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    }) => {
      if (!user) throw new Error("No user data");
      console.log("Sending update request:", updates);
      const response = await apiRequest(`/api/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
        headers: { "Content-Type": "application/json" },
      });
      console.log("Update response:", response);
      return response;
    },
    onSuccess: (data) => {
      console.log("Update successful:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveProfile = () => {
    if (!user) {
      toast({
        title: "Error",
        description: "User data not available. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    const updates: any = {};
    if (displayName.trim() !== user.displayName) updates.displayName = displayName.trim();
    if (fullName.trim() !== (user.fullName || "")) updates.fullName = fullName.trim();
    if (phoneNumber.trim() !== (user.phoneNumber || "")) updates.phoneNumber = phoneNumber.trim();
    if (addressLine1.trim() !== (user.addressLine1 || "")) updates.addressLine1 = addressLine1.trim();
    if (addressLine2.trim() !== (user.addressLine2 || "")) updates.addressLine2 = addressLine2.trim();
    if (city.trim() !== (user.city || "")) updates.city = city.trim();
    if (state.trim() !== (user.state || "")) updates.state = state.trim();
    if (zipCode.trim() !== (user.zipCode || "")) updates.zipCode = zipCode.trim();
    if (country.trim() !== (user.country || "")) updates.country = country.trim();
    
    if (Object.keys(updates).length > 0) {
      console.log("Profile updates to send:", updates);
      updateProfileMutation.mutate(updates);
    } else {
      toast({
        title: "No Changes",
        description: "No changes detected to save.",
      });
    }
  };

  const getThemeIcon = () => {
    switch (theme) {
      case "light": return <Sun className="h-4 w-4" />;
      case "dark": return <Moon className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
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
                Profile & Shipping Information
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-slate-400">
                Update your personal information and shipping address for marketplace purchases
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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

              {/* Mailing Address Section */}
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

              <Button
                onClick={handleSaveProfile}
                disabled={updateProfileMutation.isPending}
                className="bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white"
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
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
                    <SelectItem value="system" className="text-foreground">
                      <div className="flex items-center">
                        <Monitor className="h-4 w-4 mr-2" />
                        System
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
                <ToggleButton
                  variant={notifications ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNotifications(!notifications)}
                  className={notifications ? "bg-primary hover:bg-primary/90" : "border-border"}
                >
                  {notifications ? "On" : "Off"}
                </ToggleButton>
              </div>
              <Separator className="bg-slate-600" />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-foreground">Message Preview</Label>
                  <p className="text-sm text-muted-foreground">Show message content in notifications</p>
                </div>
                <ToggleButton
                  variant={messagePreview ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMessagePreview(!messagePreview)}
                  className={messagePreview ? "bg-primary hover:bg-primary/90" : "border-border"}
                >
                  {messagePreview ? "On" : "Off"}
                </ToggleButton>
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
                <ToggleButton
                  variant={autoConnect ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAutoConnect(!autoConnect)}
                  className={autoConnect ? "bg-primary hover:bg-primary/90" : "border-border"}
                >
                  {autoConnect ? "On" : "Off"}
                </ToggleButton>
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