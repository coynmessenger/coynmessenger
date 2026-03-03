const log = import.meta.env.DEV ? console.log.bind(console) : () => {};
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
import { Moon, Sun, Monitor, User as UserIcon, Bell, Shield, Palette, Info, Copy, Upload, Camera, Settings, LogOut, Trash2, X } from "lucide-react";
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
        log('🔧 SETTINGS: Found connected user in localStorage:', { id: parsedUser.id, walletAddress: parsedUser.walletAddress });
        return parsedUser.id;
      } catch (e) {
        log('❌ SETTINGS: Error parsing connected user from localStorage:', e);
      }
    }
    log('❌ SETTINGS: No connected user found in localStorage');
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
      log('🔧 SETTINGS: Initializing form with user data:', { 
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
          log('🔧 SETTINGS: Storage change detected, updating wallet address:', parsedUser.walletAddress);
          setWalletAddress(parsedUser.walletAddress || "");
        } catch (e) {
          log('❌ SETTINGS: Error parsing storage change:', e);
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
      log('🔌 Disconnecting thirdweb wallet from settings...');
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

  const tabs = [
    { id: "profile", label: "Profile", icon: UserIcon },
    { id: "preferences", label: "Preferences", icon: Palette },
    { id: "account", label: "Account", icon: Shield },
  ];

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="sm:max-w-[420px] p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 overflow-hidden rounded-2xl gap-0 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="relative px-6 pt-6 pb-4 text-center bg-gradient-to-b from-orange-50 dark:from-orange-950/30 to-transparent flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute right-3 top-3 h-8 w-8 rounded-full p-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 z-10"
          >
            <X className="h-4 w-4" />
          </Button>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">Settings</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage your account and preferences</p>

          <div className="flex mt-4 bg-gray-100 dark:bg-gray-800 rounded-xl p-1.5 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-md ring-1 ring-orange-200/50 dark:ring-orange-500/20"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-700/50"
                }`}
              >
                <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? "text-orange-500" : ""}`} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-5">
          {activeTab === "profile" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-2">
                <div className="relative mb-3">
                  <Avatar className="h-20 w-20 ring-4 ring-orange-100 dark:ring-orange-900/50">
                    <AvatarImage src={profilePicture} />
                    <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white font-bold text-2xl">
                      {user ? getEffectiveDisplayName(user).charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    onClick={triggerImageUpload}
                    disabled={uploadingImage}
                    variant="ghost"
                    size="sm"
                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full p-0 bg-orange-500 hover:bg-orange-600 border-2 border-white dark:border-gray-900 shadow-md"
                  >
                    {uploadingImage ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Camera className="h-3.5 w-3.5 text-white" />
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
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{displayName || 'Unknown User'}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">@{user?.walletAddress?.replace(/^0x/, '').slice(-6) || user?.username}</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="displayName" className="text-xs font-medium text-gray-700 dark:text-gray-300">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 h-10 rounded-xl text-sm focus:bg-white dark:focus:bg-gray-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                    placeholder="Your display name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="walletAddress" className="text-xs font-medium text-gray-700 dark:text-gray-300">Wallet Address</Label>
                  <div className="flex gap-2">
                    <Input
                      id="walletAddress"
                      value={walletAddress}
                      readOnly
                      className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 flex-1 h-10 rounded-xl text-xs font-mono"
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
                      variant="ghost"
                      size="sm"
                      className="h-10 w-10 p-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-200 dark:hover:border-orange-700 text-gray-500 dark:text-gray-400 hover:text-orange-500 transition-colors"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {showShipping && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-orange-50 dark:bg-orange-900/30">
                      <Info className="w-3.5 h-3.5 text-orange-500" />
                    </div>
                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100">Shipping Address</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName" className="text-xs text-gray-600 dark:text-gray-400">Full Name</Label>
                      <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 h-10 rounded-xl text-sm focus:bg-white dark:focus:bg-gray-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="address1" className="text-xs text-gray-600 dark:text-gray-400">Address Line 1</Label>
                      <Input id="address1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="123 Main Street" className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 h-10 rounded-xl text-sm focus:bg-white dark:focus:bg-gray-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="address2" className="text-xs text-gray-600 dark:text-gray-400">Address Line 2 (Optional)</Label>
                      <Input id="address2" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} placeholder="Apt, Suite, Unit, etc." className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 h-10 rounded-xl text-sm focus:bg-white dark:focus:bg-gray-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="city" className="text-xs text-gray-600 dark:text-gray-400">City</Label>
                        <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="New York" className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 h-10 rounded-xl text-sm focus:bg-white dark:focus:bg-gray-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="zipCode" className="text-xs text-gray-600 dark:text-gray-400">ZIP Code</Label>
                        <Input id="zipCode" value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="10001" className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 h-10 rounded-xl text-sm focus:bg-white dark:focus:bg-gray-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="country" className="text-xs text-gray-600 dark:text-gray-400">Country</Label>
                      <Select value={country} onValueChange={(value) => { setCountry(value); setState(""); }}>
                        <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 h-10 rounded-xl text-sm">
                          <SelectValue placeholder="Select your country" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                          {COUNTRIES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="state" className="text-xs text-gray-600 dark:text-gray-400">State/Province</Label>
                      {country && STATES_PROVINCES[country] ? (
                        <Select value={state} onValueChange={(value) => setState(value)}>
                          <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 h-10 rounded-xl text-sm">
                            <SelectValue placeholder="Select state/province" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                            {STATES_PROVINCES[country].map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input id="state" value={state} onChange={(e) => setState(e.target.value)} placeholder="State, Province, or Region" className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 h-10 rounded-xl text-sm focus:bg-white dark:focus:bg-gray-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={handleSave}
                disabled={updateUserMutation.isPending}
                className="w-full h-11 rounded-xl font-semibold text-sm bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 shadow-lg shadow-orange-300/30 text-white mt-2"
              >
                {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}

          {activeTab === "preferences" && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-orange-50 dark:bg-orange-900/30">
                    <Palette className="w-4 h-4 text-orange-500" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Appearance</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">Theme</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Choose your preferred theme</p>
                  </div>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger className="w-28 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 h-9 rounded-lg text-sm">
                      <SelectValue>
                        <div className="flex items-center">
                          {getThemeIcon()}
                          <span className="ml-2 capitalize">{theme}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                      <SelectItem value="light">
                        <div className="flex items-center">
                          <Sun className="h-4 w-4 mr-2 text-orange-500" />
                          Light
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center">
                          <Moon className="h-4 w-4 mr-2 text-gray-500" />
                          Dark
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-orange-50 dark:bg-orange-900/30">
                    <Bell className="w-4 h-4 text-orange-500" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Notifications</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">Push Notifications</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Receive notifications for new messages</p>
                  </div>
                  <Switch
                    checked={notifications}
                    onCheckedChange={handleNotificationChange}
                  />
                </div>
                <Separator className="bg-gray-200 dark:bg-gray-700" />
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">Message Preview</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Show message content in notifications</p>
                  </div>
                  <Switch
                    checked={messagePreview}
                    onCheckedChange={handleMessagePreviewChange}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "account" && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-orange-50 dark:bg-orange-900/30">
                    <Shield className="w-4 h-4 text-orange-500" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Privacy & Security</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">Auto-connect Wallet</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Automatically connect to COYN network</p>
                  </div>
                  <Switch
                    checked={autoConnect}
                    onCheckedChange={handleAutoConnectChange}
                  />
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-orange-50 dark:bg-orange-900/30">
                    <Info className="w-4 h-4 text-orange-500" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">About</span>
                </div>
                <div className="flex justify-between text-sm py-1">
                  <span className="text-gray-500 dark:text-gray-400">Version</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">1.3.2</span>
                </div>
                <div className="flex justify-between text-sm py-1">
                  <span className="text-gray-500 dark:text-gray-400">Network</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">COYN Network</span>
                </div>
                <div className="flex justify-between text-sm py-1">
                  <span className="text-gray-500 dark:text-gray-400">Build</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">Production</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Button 
                  onClick={handleSignOut}
                  variant="ghost"
                  className="w-full h-11 rounded-xl font-medium text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800/50 transition-colors justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
                <Button 
                  onClick={() => setShowClearDataConfirm(true)}
                  variant="ghost" 
                  className="w-full h-10 rounded-xl text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium text-xs justify-center gap-2 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear All Data
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={showClearDataConfirm} onOpenChange={setShowClearDataConfirm}>
      <DialogContent hideCloseButton className="sm:max-w-[380px] p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 overflow-hidden rounded-2xl gap-0 shadow-2xl">
        <div className="relative px-6 pt-8 pb-4 text-center bg-gradient-to-b from-red-50 dark:from-red-950/30 to-transparent">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 bg-red-100 dark:bg-red-900/50 shadow-lg shadow-red-200/50 dark:shadow-red-900/30 border border-red-200 dark:border-red-800">
            <Trash2 className="w-7 h-7 text-red-500" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">Clear All Data</DialogTitle>
          </DialogHeader>
        </div>
        <div className="px-6 pb-2 space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This will permanently delete ALL of your data:
          </p>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 space-y-1">
            <p className="text-xs text-red-600 dark:text-red-400">• Your user account and profile</p>
            <p className="text-xs text-red-600 dark:text-red-400">• All conversations and messages</p>
            <p className="text-xs text-red-600 dark:text-red-400">• All wallet balances and transaction history</p>
            <p className="text-xs text-red-600 dark:text-red-400">• Purchase history and favorites</p>
            <p className="text-xs text-red-600 dark:text-red-400">• All settings and preferences</p>
          </div>
          <p className="text-xs font-semibold text-red-500 dark:text-red-400 text-center">
            This action cannot be undone!
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="confirmText" className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Type "DELETE ALL MY DATA" to confirm:
            </Label>
            <Input
              id="confirmText"
              value={clearDataConfirmText}
              onChange={(e) => setClearDataConfirmText(e.target.value)}
              placeholder="DELETE ALL MY DATA"
              className="font-mono bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 h-10 rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="px-6 pb-5 pt-3 space-y-2">
          <Button
            onClick={handleClearAllData}
            disabled={clearDataConfirmText !== "DELETE ALL MY DATA" || clearAllDataMutation.isPending}
            className="w-full h-12 rounded-xl font-semibold text-sm shadow-lg transition-all bg-gradient-to-r from-red-500 to-red-400 hover:from-red-400 hover:to-red-300 shadow-red-300/30 text-white disabled:opacity-50"
          >
            {clearAllDataMutation.isPending ? "Clearing..." : "Delete Everything"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setShowClearDataConfirm(false);
              setClearDataConfirmText("");
            }}
            className="w-full h-10 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium text-sm"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}