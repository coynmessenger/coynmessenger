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
import { Moon, Sun, Monitor, User as UserIcon, Bell, Shield, Palette, Database, Info } from "lucide-react";
import type { User } from "@shared/schema";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [displayName, setDisplayName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [autoConnect, setAutoConnect] = useState(true);
  const [messagePreview, setMessagePreview] = useState(true);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // Update local state when user data changes
  React.useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setWalletAddress(user.walletAddress);
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: { displayName?: string; walletAddress?: string }) => {
      if (!user) throw new Error("No user data");
      return apiRequest(`/api/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveProfile = () => {
    const updates: any = {};
    if (displayName !== user?.displayName) updates.displayName = displayName;
    if (walletAddress !== user?.walletAddress) updates.walletAddress = walletAddress;
    
    if (Object.keys(updates).length > 0) {
      updateProfileMutation.mutate(updates);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-100 flex items-center">
            <UserIcon className="h-5 w-5 mr-2" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Settings */}
          <Card className="bg-slate-700/50 border-slate-600">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center">
                <UserIcon className="h-4 w-4 mr-2" />
                Profile
              </CardTitle>
              <CardDescription className="text-slate-400">
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-slate-300">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-slate-600 border-slate-500 text-slate-100"
                  placeholder="Your display name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="walletAddress" className="text-slate-300">COYN Address</Label>
                <Input
                  id="walletAddress"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  className="bg-slate-600 border-slate-500 text-slate-100 font-mono text-sm"
                  placeholder="0x..."
                />
              </div>
              <Button
                onClick={handleSaveProfile}
                disabled={updateProfileMutation.isPending}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-900"
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </CardContent>
          </Card>

          {/* Appearance Settings */}
          <Card className="bg-slate-700/50 border-slate-600">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center">
                <Palette className="h-4 w-4 mr-2" />
                Appearance
              </CardTitle>
              <CardDescription className="text-slate-400">
                Customize how the app looks and feels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-slate-300">Theme</Label>
                  <p className="text-sm text-slate-400">Choose your preferred theme</p>
                </div>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="w-32 bg-slate-600 border-slate-500">
                    <SelectValue>
                      <div className="flex items-center">
                        {getThemeIcon()}
                        <span className="ml-2 capitalize">{theme}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="light" className="text-slate-100">
                      <div className="flex items-center">
                        <Sun className="h-4 w-4 mr-2" />
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value="dark" className="text-slate-100">
                      <div className="flex items-center">
                        <Moon className="h-4 w-4 mr-2" />
                        Dark
                      </div>
                    </SelectItem>
                    <SelectItem value="system" className="text-slate-100">
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
          <Card className="bg-slate-700/50 border-slate-600">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </CardTitle>
              <CardDescription className="text-slate-400">
                Control how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-slate-300">Push Notifications</Label>
                  <p className="text-sm text-slate-400">Receive notifications for new messages</p>
                </div>
                <ToggleButton
                  variant={notifications ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNotifications(!notifications)}
                  className={notifications ? "bg-cyan-500 hover:bg-cyan-400" : "border-slate-600"}
                >
                  {notifications ? "On" : "Off"}
                </ToggleButton>
              </div>
              <Separator className="bg-slate-600" />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-slate-300">Message Preview</Label>
                  <p className="text-sm text-slate-400">Show message content in notifications</p>
                </div>
                <ToggleButton
                  variant={messagePreview ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMessagePreview(!messagePreview)}
                  className={messagePreview ? "bg-cyan-500 hover:bg-cyan-400" : "border-slate-600"}
                >
                  {messagePreview ? "On" : "Off"}
                </ToggleButton>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card className="bg-slate-700/50 border-slate-600">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                Privacy & Security
              </CardTitle>
              <CardDescription className="text-slate-400">
                Manage your privacy and security preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-slate-300">Auto-connect Wallet</Label>
                  <p className="text-sm text-slate-400">Automatically connect to COYN network</p>
                </div>
                <ToggleButton
                  variant={autoConnect ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAutoConnect(!autoConnect)}
                  className={autoConnect ? "bg-cyan-500 hover:bg-cyan-400" : "border-slate-600"}
                >
                  {autoConnect ? "On" : "Off"}
                </ToggleButton>
              </div>
              <Separator className="bg-slate-600" />
              <div className="space-y-2">
                <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-600">
                  <Database className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
                <Button variant="outline" className="w-full border-red-600 text-red-400 hover:bg-red-600 hover:text-white">
                  Clear All Data
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card className="bg-slate-700/50 border-slate-600">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center">
                <Info className="h-4 w-4 mr-2" />
                About
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Version</span>
                <span className="text-slate-300">1.0.0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Network</span>
                <span className="text-slate-300">COYN Network</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Build</span>
                <span className="text-slate-300">Production</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose} variant="outline" className="border-slate-600 text-slate-300">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}