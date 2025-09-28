import React, { useState, useRef, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDisconnect, useActiveWallet } from "thirdweb/react";
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
import { Moon, Sun, Monitor, User as UserIcon, Bell, Shield, Palette, Info, Copy, Upload, Camera } from "lucide-react";
import type { User } from "@shared/schema";
import { NotificationService } from "@/lib/notification-service";

// Utility function to get effective display name (mirrors backend logic)
function getEffectiveDisplayName(user: User): string {
  // Priority: 1. Profile display name (most recent), 2. Sign-in name, 3. @id format
  if (user.displayName && !user.displayName.startsWith('@')) {
    return user.displayName;
  }
  if (user.signInName) {
    return user.signInName;
  }
  // Fallback to @id format using last 6 characters of wallet address
  if (user.walletAddress) {
    return `@${user.walletAddress.slice(-6)}`;
  }
  // Ultimate fallback
  return user.displayName || user.username || "Unknown User";
}

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "IE", name: "Ireland" },
  { code: "PT", name: "Portugal" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "CN", name: "China" },
  { code: "IN", name: "India" },
  { code: "SG", name: "Singapore" },
  { code: "HK", name: "Hong Kong" },
  { code: "NZ", name: "New Zealand" },
  { code: "MX", name: "Mexico" },
  { code: "BR", name: "Brazil" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "PE", name: "Peru" },
  { code: "ZA", name: "South Africa" },
  { code: "EG", name: "Egypt" },
  { code: "MA", name: "Morocco" },
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "IL", name: "Israel" },
  { code: "TR", name: "Turkey" },
  { code: "RU", name: "Russia" },
  { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czech Republic" },
  { code: "HU", name: "Hungary" },
  { code: "GR", name: "Greece" },
  { code: "RO", name: "Romania" },
  { code: "BG", name: "Bulgaria" },
  { code: "HR", name: "Croatia" },
  { code: "SI", name: "Slovenia" },
  { code: "SK", name: "Slovakia" },
  { code: "LT", name: "Lithuania" },
  { code: "LV", name: "Latvia" },
  { code: "EE", name: "Estonia" },
  { code: "TH", name: "Thailand" },
  { code: "VN", name: "Vietnam" },
  { code: "MY", name: "Malaysia" },
  { code: "ID", name: "Indonesia" },
  { code: "PH", name: "Philippines" },
  { code: "TW", name: "Taiwan" },
] as const;

const STATES_PROVINCES: Record<string, string[]> = {
  US: [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
    "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
    "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
    "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
    "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
    "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming", "District of Columbia"
  ],
  CA: [
    "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador",
    "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island",
    "Quebec", "Saskatchewan", "Yukon"
  ],
  GB: [
    "England", "Scotland", "Wales", "Northern Ireland"
  ],
  AU: [
    "Australian Capital Territory", "New South Wales", "Northern Territory", "Queensland",
    "South Australia", "Tasmania", "Victoria", "Western Australia"
  ],
  DE: [
    "Baden-Württemberg", "Bayern", "Berlin", "Brandenburg", "Bremen", "Hamburg", "Hessen",
    "Mecklenburg-Vorpommern", "Niedersachsen", "Nordrhein-Westfalen", "Rheinland-Pfalz",
    "Saarland", "Sachsen", "Sachsen-Anhalt", "Schleswig-Holstein", "Thüringen"
  ],
  FR: [
    "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Bretagne", "Centre-Val de Loire",
    "Corse", "Grand Est", "Hauts-de-France", "Île-de-France", "Normandie", "Nouvelle-Aquitaine",
    "Occitanie", "Pays de la Loire", "Provence-Alpes-Côte d'Azur"
  ],
  IT: [
    "Abruzzo", "Basilicata", "Calabria", "Campania", "Emilia-Romagna", "Friuli-Venezia Giulia",
    "Lazio", "Liguria", "Lombardia", "Marche", "Molise", "Piemonte", "Puglia", "Sardegna",
    "Sicilia", "Toscana", "Trentino-Alto Adige", "Umbria", "Valle d'Aosta", "Veneto"
  ],
  ES: [
    "Andalucía", "Aragón", "Asturias", "Baleares", "Canarias", "Cantabria", "Castilla-La Mancha",
    "Castilla y León", "Cataluña", "Ceuta", "Extremadura", "Galicia", "La Rioja", "Madrid",
    "Melilla", "Murcia", "Navarra", "País Vasco", "Valencia"
  ],
  NL: [
    "Drenthe", "Flevoland", "Friesland", "Gelderland", "Groningen", "Limburg", "Noord-Brabant",
    "Noord-Holland", "Overijssel", "Utrecht", "Zeeland", "Zuid-Holland"
  ],
  BE: [
    "Antwerpen", "Brussels", "Hainaut", "Limburg", "Liège", "Luxembourg", "Namur",
    "Oost-Vlaanderen", "Vlaams-Brabant", "West-Vlaanderen"
  ],
  CH: [
    "Aargau", "Appenzell Ausserrhoden", "Appenzell Innerrhoden", "Basel-Landschaft", "Basel-Stadt",
    "Bern", "Fribourg", "Geneva", "Glarus", "Graubünden", "Jura", "Lucerne", "Neuchâtel",
    "Nidwalden", "Obwalden", "Schaffhausen", "Schwyz", "Solothurn", "St. Gallen", "Thurgau",
    "Ticino", "Uri", "Valais", "Vaud", "Zug", "Zurich"
  ],
  IN: [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
    "West Bengal", "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry"
  ],
  JP: [
    "Hokkaido", "Aomori", "Iwate", "Miyagi", "Akita", "Yamagata", "Fukushima", "Ibaraki",
    "Tochigi", "Gunma", "Saitama", "Chiba", "Tokyo", "Kanagawa", "Niigata", "Toyama",
    "Ishikawa", "Fukui", "Yamanashi", "Nagano", "Gifu", "Shizuoka", "Aichi", "Mie",
    "Shiga", "Kyoto", "Osaka", "Hyogo", "Nara", "Wakayama", "Tottori", "Shimane",
    "Okayama", "Hiroshima", "Yamaguchi", "Tokushima", "Kagawa", "Ehime", "Kochi",
    "Fukuoka", "Saga", "Nagasaki", "Kumamoto", "Oita", "Miyazaki", "Kagoshima", "Okinawa"
  ],
  BR: [
    "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará", "Distrito Federal", "Espírito Santo",
    "Goiás", "Maranhão", "Mato Grosso", "Mato Grosso do Sul", "Minas Gerais", "Pará", "Paraíba",
    "Paraná", "Pernambuco", "Piauí", "Rio de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul",
    "Rondônia", "Roraima", "Santa Catarina", "São Paulo", "Sergipe", "Tocantins"
  ],
  MX: [
    "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua",
    "Coahuila", "Colima", "Durango", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "México",
    "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro",
    "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala",
    "Veracruz", "Yucatán", "Zacatecas", "Ciudad de México"
  ]
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showShipping?: boolean;
}

export default function SettingsModal({ isOpen, onClose, showShipping = false }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { disconnect } = useDisconnect();
  const activeWallet = useActiveWallet();
  const [activeTab, setActiveTab] = useState("profile");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [displayName, setDisplayName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  // Initialize notification service and load settings
  const notificationService = NotificationService.getInstance();
  const [notifications, setNotifications] = useState(true);
  const [autoConnect, setAutoConnect] = useState(true);
  const [messagePreview, setMessagePreview] = useState(true);

  // Load notification settings from service on mount
  useEffect(() => {
    const settings = notificationService.getSettings();
    setNotifications(settings.pushNotifications);
    setMessagePreview(settings.messagePreview);
    setAutoConnect(settings.autoConnectWallet);
  }, [notificationService]);

  // Handle notification settings changes
  const handleNotificationChange = async (checked: boolean) => {
    if (checked) {
      // Check if notifications are supported
      if (typeof window === 'undefined' || !window.Notification) {
        toast({
          title: "Not Supported",
          description: "Your browser doesn't support notifications.",
          variant: "destructive",
        });
        return;
      }
      
      try {
        // Request permission when enabling notifications
        const permission = await window.Notification.requestPermission();
        if (permission !== 'granted') {
          toast({
            title: "Permission Required",
            description: "Please allow notifications in your browser settings to receive push notifications.",
            variant: "destructive",
          });
          return;
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        toast({
          title: "Permission Error",
          description: "Unable to request notification permission. Please check your browser settings.",
          variant: "destructive",
        });
        return;
      }
    }
    
    setNotifications(checked);
    notificationService.updateSettings({ pushNotifications: checked });
    
    toast({
      title: checked ? "Notifications Enabled" : "Notifications Disabled",
      description: checked 
        ? "You'll now receive push notifications for new messages" 
        : "Push notifications have been turned off",
    });
  };

  const handleMessagePreviewChange = (checked: boolean) => {
    setMessagePreview(checked);
    notificationService.updateSettings({ messagePreview: checked });
    
    toast({
      title: checked ? "Message Preview Enabled" : "Message Preview Disabled", 
      description: checked
        ? "Notification content will show message previews"
        : "Notifications will not show message content",
    });
  };

  const handleAutoConnectChange = (checked: boolean) => {
    setAutoConnect(checked);
    notificationService.updateSettings({ autoConnectWallet: checked });
    
    toast({
      title: checked ? "Auto-connect Enabled" : "Auto-connect Disabled",
      description: checked
        ? "Wallet will automatically connect to COYN network"
        : "Manual wallet connection required",
    });
  };
  
  // Mailing address state
  const [fullName, setFullName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("");
  
  // Clear data confirmation state
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);
  const [clearDataConfirmText, setClearDataConfirmText] = useState("");

  // Get connected user ID from localStorage (memoized to prevent infinite re-renders)
  const connectedUserId = useMemo(() => {
    const storedUser = localStorage.getItem('connectedUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log('🔧 SETTINGS: Found connected user in localStorage:', { id: parsedUser.id, walletAddress: parsedUser.walletAddress });
        return parsedUser.id;
      } catch (e) {
        console.log('❌ SETTINGS: Error parsing connected user from localStorage:', e);
      }
    }
    console.log('❌ SETTINGS: No connected user found in localStorage');
    return null;
  }, [isOpen]); // Only re-evaluate when modal opens

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user", connectedUserId],
    queryFn: async () => {
      const url = connectedUserId ? `/api/user?userId=${connectedUserId}` : "/api/user";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      const userData = await response.json();
      return userData;
    },
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache for long
  });

  // Track if we've initialized to prevent overriding user changes
  const [hasInitialized, setHasInitialized] = React.useState(false);

  // Update local state when user data changes OR when localStorage changes
  React.useEffect(() => {
    if (user && isOpen && !hasInitialized) {
      console.log('🔧 SETTINGS: Initializing form with user data:', { 
        userId: user.id, 
        walletAddress: user.walletAddress,
        displayName: getEffectiveDisplayName(user) 
      });
      
      setDisplayName(getEffectiveDisplayName(user) || "");
      setWalletAddress(user.walletAddress || "");
      setProfilePicture(user.profilePicture || "");
      setFullName(user.fullName || "");
      setAddressLine1(user.addressLine1 || "");
      setAddressLine2(user.addressLine2 || "");
      setCity(user.city || "");
      setState(user.state || "");
      setZipCode(user.zipCode || "");
      setCountry(user.country || "");
      
      setHasInitialized(true);
    }
  }, [user, isOpen, hasInitialized]);

  // Also listen for localStorage changes to update wallet address immediately
  React.useEffect(() => {
    if (!isOpen) return;

    const handleStorageChange = () => {
      const storedUser = localStorage.getItem('connectedUser');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          console.log('🔧 SETTINGS: Storage change detected, updating wallet address:', parsedUser.walletAddress);
          setWalletAddress(parsedUser.walletAddress || "");
        } catch (e) {
          console.log('❌ SETTINGS: Error parsing storage change:', e);
        }
      }
    };

    // Listen for storage events (mobile wallet returns)
    window.addEventListener('storage', handleStorageChange);
    
    // Also check immediately when modal opens
    handleStorageChange();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isOpen]);

  // Reset initialization flag when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setHasInitialized(false);
    }
  }, [isOpen]);

  const updateUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const url = connectedUserId ? `/api/user?userId=${connectedUserId}` : "/api/user";
      return apiRequest("PATCH", url, userData);
    },
    onSuccess: (updatedUser) => {
      
      // Aggressively clear all cache to force fresh data
      queryClient.clear();
      
      // Immediately update all possible cache keys
      queryClient.setQueryData(["/api/user"], updatedUser);
      queryClient.setQueryData(["/api/user", connectedUserId], updatedUser);
      queryClient.setQueryData(["/api/user", { userId: connectedUserId }], updatedUser);
      if (connectedUserId) {
        queryClient.setQueryData(["/api/user", parseInt(connectedUserId)], updatedUser);
        queryClient.setQueryData(["/api/user", { userId: parseInt(connectedUserId) }], updatedUser);
      }
      
      // Force invalidation of all related queries
      queryClient.invalidateQueries();
      
      // Force immediate refetch
      setTimeout(() => {
        queryClient.refetchQueries();
      }, 100);
      
      // Update localStorage for homepage and other components
      if (updatedUser) {
        
        // Update all localStorage keys that might contain user data
        localStorage.setItem('userDisplayName', updatedUser.displayName || '');
        
        // Update connected user data in localStorage - this is critical
        const currentConnectedUser = localStorage.getItem('connectedUser');
        if (currentConnectedUser) {
          try {
            const connectedUserData = JSON.parse(currentConnectedUser);
            
            // SAFETY CHECK: Only update if the user IDs match to prevent wrong user data overwrite
            if (connectedUserData.id === updatedUser.id) {
              // SAFER UPDATE: Only update specific fields that we know should change
              // Don't overwrite critical data like wallet address, username, or user ID
              const safeFieldsToUpdate = ['displayName', 'fullName', 'profilePicture', 'addressLine1', 'addressLine2', 'city', 'state', 'zipCode', 'country'];
              
              safeFieldsToUpdate.forEach(field => {
                if (updatedUser[field] !== undefined) {
                  connectedUserData[field] = updatedUser[field];
                }
              });
              
              localStorage.setItem('connectedUser', JSON.stringify(connectedUserData));
            } else {
              // User ID mismatch - security check failed
            }
          } catch (e) {

          }
        }
        
        // Dispatch custom events to notify other components of profile changes
        window.dispatchEvent(new CustomEvent('displayNameUpdated', { 
          detail: { 
            displayName: updatedUser.displayName,
            userId: connectedUserId || updatedUser.id 
          } 
        }));
        
        window.dispatchEvent(new CustomEvent('profileUpdated', { 
          detail: { 
            user: updatedUser,
            userId: connectedUserId || updatedUser.id 
          } 
        }));
      }
      
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
      
      // Upload avatar for connected user
      const url = connectedUserId ? `/api/user/upload-avatar?userId=${connectedUserId}` : "/api/user/upload-avatar";
      const response = await fetch(url, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (response: { profilePicture: string }) => {
      setProfilePicture(response.profilePicture);
      
      // Immediately update the user cache with new profile picture
      queryClient.setQueryData(["/api/user"], (oldData: any) => {
        if (oldData) {
          return { ...oldData, profilePicture: response.profilePicture };
        }
        return oldData;
      });
      
      if (connectedUserId) {
        queryClient.setQueryData(["/api/user", parseInt(connectedUserId)], (oldData: any) => {
          if (oldData) {
            return { ...oldData, profilePicture: response.profilePicture };
          }
          return oldData;
        });
      }
      
      // Invalidate to ensure fresh data across all components
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      if (connectedUserId) {
        queryClient.invalidateQueries({ queryKey: ["/api/user", parseInt(connectedUserId)] });
      }
      
      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been uploaded and saved successfully.",
      });
      setUploadingImage(false);
    },
    onError: (error) => {

      toast({
        title: "Upload failed",
        description: "Failed to upload profile picture. Please try again.",
        variant: "destructive",
      });
      setUploadingImage(false);
    },
  });

  // Clear all data mutation
  const clearAllDataMutation = useMutation({
    mutationFn: async () => {
      if (!connectedUserId) {
        throw new Error('No user ID found');
      }
      
      const response = await apiRequest("DELETE", `/api/user/clear-all-data`, { 
        userId: connectedUserId 
      });
      return response;
    },
    onSuccess: () => {
      // Clear localStorage
      localStorage.removeItem('connectedUser');
      localStorage.removeItem('shopping-cart');
      
      // Clear all query cache
      queryClient.clear();
      
      // Close modals
      setShowClearDataConfirm(false);
      onClose();
      
      toast({
        title: "All data cleared",
        description: "Your account and all associated data have been permanently deleted.",
        variant: "default"
      });
      
      // Redirect to homepage after a brief delay
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    },
    onError: (error) => {

      toast({
        title: "Failed to clear data",
        description: "An error occurred while clearing your data. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSignOut = async () => {
    try {
      // First disconnect the thirdweb wallet
      console.log('🔌 Disconnecting thirdweb wallet from settings...');
      if (activeWallet) {
        await disconnect(activeWallet);
      }
    } catch (error) {
      console.error('Error disconnecting thirdweb wallet:', error);
    }
    
    // Set explicit sign out flag to prevent auto-reconnection
    localStorage.setItem('userSignedOut', 'true');
    
    // Clear ALL localStorage items related to the application
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('connectedUser');
    localStorage.removeItem('connectedUserId');
    localStorage.removeItem('pendingWalletConnection');
    localStorage.removeItem('shopping-cart');
    localStorage.removeItem('theme');
    localStorage.removeItem('favorites');
    localStorage.removeItem('wallet-balances-hidden');
    localStorage.removeItem('userClickedHome');
    
    // Clear any session storage
    sessionStorage.clear();
    
    // Clear React Query cache
    queryClient.clear();
    
    // Close the settings modal
    onClose();
    
    // Force page refresh to ensure complete cleanup
    window.location.reload();
  };

  const handleClearAllData = () => {
    if (clearDataConfirmText === "DELETE ALL MY DATA") {
      clearAllDataMutation.mutate();
    }
  };

  const handleSave = () => {
    
    const updateData: any = {
      displayName,
      // Don't include profilePicture here - it's handled immediately on upload
    };

    if (showShipping) {
      updateData.fullName = fullName;
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
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center">
            <UserIcon className="h-5 w-5 mr-2" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Profile Settings */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-6">
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
            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
              {/* Profile Picture Section */}
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={profilePicture} />
                    <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 dark:from-cyan-400 dark:to-cyan-600 text-white font-bold text-lg">
                      {user ? getEffectiveDisplayName(user).charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {/* Debug info */}
                  {profilePicture && (
                    <div className="text-xs text-gray-500 mt-1">
                      Current: {profilePicture.substring(profilePicture.lastIndexOf('/') + 1)}
                    </div>
                  )}
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
                  <h3 className="text-lg font-semibold text-black dark:text-foreground">{displayName || 'Unknown User'}</h3>
                  <p className="text-sm text-gray-600 dark:text-muted-foreground">@{user?.walletAddress?.replace(/^0x/, '').slice(-6) || user?.username}</p>
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
                    <Label htmlFor="country" className="text-foreground">Country</Label>
                    <Select 
                      value={country} 
                      onValueChange={(value) => {
                        setCountry(value);
                        setState(""); // Reset state when country changes
                      }}
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600">
                        <SelectValue placeholder="Select your country" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-foreground">State/Province</Label>
                    {country && STATES_PROVINCES[country] ? (
                      <Select 
                        value={state} 
                        onValueChange={(value) => setState(value)}
                      >
                        <SelectTrigger className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600">
                          <SelectValue placeholder="Select state/province" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {STATES_PROVINCES[country].map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="state"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="State, Province, or Region"
                        className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"
                      />
                    )}
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
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-6">
              <CardTitle className="text-foreground flex items-center">
                <Palette className="h-4 w-4 mr-2" />
                Appearance
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Customize how the app looks and feels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
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
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-6">
              <CardTitle className="text-black dark:text-slate-100 flex items-center">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-slate-400">
                Control how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-foreground">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications for new messages</p>
                </div>
                <Switch
                  checked={notifications}
                  onCheckedChange={handleNotificationChange}
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
                  onCheckedChange={handleMessagePreviewChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card className="bg-slate-600/30 border-slate-500">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-6">
              <CardTitle className="text-black dark:text-slate-100 flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                Privacy & Security
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-slate-400">
                Manage your privacy and security preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-foreground">Auto-connect Wallet</Label>
                  <p className="text-sm text-muted-foreground">Automatically connect to COYN network</p>
                </div>
                <Switch
                  checked={autoConnect}
                  onCheckedChange={handleAutoConnectChange}
                />
              </div>
              <Separator className="bg-slate-600" />
              <div className="space-y-2">
                <Button 
                  onClick={() => setShowClearDataConfirm(true)}
                  variant="outline" 
                  className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  Clear All Data
                </Button>
                <Button 
                  onClick={handleSignOut}
                  variant="outline" 
                  className="w-full border-border text-foreground hover:bg-muted"
                >
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card className="bg-slate-600/30 border-slate-500">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-6">
              <CardTitle className="text-black dark:text-slate-100 flex items-center">
                <Info className="h-4 w-4 mr-2" />
                About
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 sm:p-6">
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

        <div className="flex justify-end pt-3 sm:pt-4">
          <Button onClick={onClose} variant="outline" className="border-border text-foreground">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Clear All Data Confirmation Dialog */}
    <Dialog open={showClearDataConfirm} onOpenChange={setShowClearDataConfirm}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">⚠️ Clear All Data</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This action will permanently delete ALL of your data including:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
              <li>Your user account and profile</li>
              <li>All conversations and messages</li>
              <li>All wallet balances and transaction history</li>
              <li>Purchase history and favorites</li>
              <li>All settings and preferences</li>
            </ul>
            <p className="text-sm font-semibold text-destructive">
              This action cannot be undone!
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmText" className="text-sm font-medium">
              Type "DELETE ALL MY DATA" to confirm:
            </Label>
            <Input
              id="confirmText"
              value={clearDataConfirmText}
              onChange={(e) => setClearDataConfirmText(e.target.value)}
              placeholder="DELETE ALL MY DATA"
              className="font-mono"
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowClearDataConfirm(false);
                setClearDataConfirmText("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearAllData}
              disabled={clearDataConfirmText !== "DELETE ALL MY DATA" || clearAllDataMutation.isPending}
            >
              {clearAllDataMutation.isPending ? "Clearing..." : "Delete Everything"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}