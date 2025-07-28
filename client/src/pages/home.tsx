import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, MessageCircle, Shield, Coins, ArrowRight, Check, Globe, Heart, ShoppingCart, ShoppingBag } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { signatureCollector } from "@/lib/signature-collector";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { notificationService } from "@/lib/notification-service";
import coynLogoPath from "@assets/COYN-symbol-square_1751239261149.png";
import coynfulLogoPath from "@assets/Coynful-logo-fin-copy_1751239116310.png";
import metamaskLogo from "@assets/MetaMask_Fox.svg_1751312780982.png";
import trustWalletLogo from "@assets/Trust-Wallet_1751312780982.jpg";
import TermsModal from "@/components/terms-modal";
import PrivacyModal from "@/components/privacy-modal";
import type { User } from "@shared/schema";



// Web3 Wallet type declarations
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      isMetaMask?: boolean;
      isTrust?: boolean;
  
    };
    trustWallet?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
  }
}

export default function HomePage() {
  useScrollToTop();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [walletAddress, setWalletAddress] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isConnected, setIsConnected] = useState(() => {
    return localStorage.getItem('walletConnected') === 'true';
  });
  const [connectedUser, setConnectedUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('connectedUser');
    return stored ? JSON.parse(stored) : null;
  });
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Removed automatic user data fetching to prevent conflicts with localStorage updates

  // Listen for display name updates from settings modal
  useEffect(() => {
    const handleDisplayNameUpdate = (event: CustomEvent) => {
      
      // Only update if the event is for the current connected user
      if (connectedUser && event.detail?.userId === connectedUser.id) {
        const updatedStoredUser = localStorage.getItem('connectedUser');
        if (updatedStoredUser) {
          const parsedUser = JSON.parse(updatedStoredUser);
          
          // Verify the user ID matches before updating state
          if (parsedUser.id === connectedUser.id) {
            setConnectedUser(parsedUser);
          } else {

          }
        }
      }
    };

    window.addEventListener('displayNameUpdated', handleDisplayNameUpdate as EventListener);
    
    return () => {
      window.removeEventListener('displayNameUpdated', handleDisplayNameUpdate as EventListener);
    };
  }, [connectedUser?.id]);

  // Add window event listener for wallet connection updates
  useEffect(() => {
    const handleWalletConnectionUpdate = () => {
      const storedConnected = localStorage.getItem('walletConnected');
      const storedUser = localStorage.getItem('connectedUser');
      
      if (storedConnected === 'true' && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setConnectedUser(parsedUser);
        setIsConnected(true);
      }
    };

    // Listen for custom wallet connection events
    window.addEventListener('walletConnected', handleWalletConnectionUpdate);
    
    // Also listen for storage events (cross-tab sync)
    window.addEventListener('storage', (e) => {
      if (e.key === 'walletConnected' && e.newValue === 'true') {
        handleWalletConnectionUpdate();
      }
    });

    return () => {
      window.removeEventListener('walletConnected', handleWalletConnectionUpdate);
      window.removeEventListener('storage', handleWalletConnectionUpdate);
    };
  }, []);

  const connectWalletMutation = useMutation({
    mutationFn: async ({ walletAddress, displayName }: { walletAddress: string; displayName?: string }) => {
      try {
        return await apiRequest("POST", "/api/users/find-or-create", {
          walletAddress,
          displayName
        });
      } catch (error: any) {
        // Re-throw the actual error from the server
        throw new Error(error.message || "Failed to connect wallet");
      }
    },
    onSuccess: (user: User) => {
      // Store connection state in localStorage
      localStorage.setItem('walletConnected', 'true');
      localStorage.setItem('connectedUser', JSON.stringify(user));
      localStorage.setItem('connectedUserId', user.id.toString());
      
      // Store display name for other components
      if (user.displayName) {
        localStorage.setItem('userDisplayName', user.displayName);
      }
      
      // Clear all cache to prevent stale data conflicts
      queryClient.clear();
      
      // Immediately update cache data for both query key patterns
      queryClient.setQueryData(["/api/user"], user);
      queryClient.setQueryData(["/api/user", user.id], user);
      queryClient.setQueryData(["/api/user", { userId: user.id }], user);
      
      // Invalidate user queries to ensure fresh data across all components
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user", user.id] });
      
      // Invalidate conversation queries to refresh user data in conversation lists
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", user.id] });
      
      // Force immediate state update - this is the key fix
      setConnectedUser(user);
      setIsConnected(true);
      
      // Clear any pending connection flags
      localStorage.removeItem('pendingWalletConnection');
      
      // Dispatch custom event to trigger UI updates
      window.dispatchEvent(new CustomEvent('walletConnected', { detail: user }));
      
      // Force a component re-render to ensure UI updates
      setTimeout(() => {
        setConnectedUser(user);
        setIsConnected(true);
      }, 50);
    },
  });

  // Enhanced state synchronization with Trust Wallet mobile support
  useEffect(() => {
    let isChecking = false; // Guard against multiple simultaneous checks

    const syncConnectionState = async () => {
      if (isChecking) return; // Prevent duplicate execution
      
      // Check if user explicitly signed out - if so, don't auto-reconnect
      const userSignedOut = localStorage.getItem('userSignedOut');
      if (userSignedOut === 'true') {
        return;
      }
      
      const storedConnected = localStorage.getItem('walletConnected');
      const storedUser = localStorage.getItem('connectedUser');
      
      // First, sync any stored connection state - Always update UI immediately
      if (storedConnected === 'true' && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setConnectedUser(parsedUser);
        setIsConnected(true);
        return;
      }
      
      // Enhanced Trust Wallet detection for mobile returns
      if (!isConnected && typeof window.ethereum !== 'undefined') {
        isChecking = true;
        try {
          let accounts = [];
          
          // Try Trust Wallet specific detection first
          if (window.ethereum.isTrust || window.trustWallet) {
            const provider = window.trustWallet || window.ethereum;
            accounts = await provider.request({ method: 'eth_accounts' });
          } else {
            accounts = await window.ethereum.request({ method: 'eth_accounts' });
          }
          
          if (accounts && accounts.length > 0) {
            // Clear any pending flags
            localStorage.removeItem('pendingWalletConnection');
            localStorage.removeItem('pendingWalletType');
            localStorage.removeItem('walletConnectionAttempt');
            
            // Connect the wallet
            connectWalletMutation.mutate({
              walletAddress: accounts[0],
              displayName: undefined
            });
          }
        } catch (error) {
          // Silently handle errors
        } finally {
          isChecking = false;
        }
      }
    };
    
    // Run sync immediately on mount
    syncConnectionState();
    
    // Add multiple event listeners for Trust Wallet mobile detection
    const handlePageShow = () => {
      setTimeout(syncConnectionState, 100);
    };
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'walletConnected' && e.newValue === 'true') {
        const storedUser = localStorage.getItem('connectedUser');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setConnectedUser(parsedUser);
          setIsConnected(true);
        }
      }
    };
    
    // Listen for page show events (when returning from Trust Wallet)
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Handle mobile wallet returns (optimized - no duplicate checks)
  useEffect(() => {
    let isChecking = false;

    const handleVisibilityChange = async () => {
      if (!document.hidden && isMobile() && !isChecking) {
        
        // Check if user explicitly signed out - if so, don't auto-reconnect
        const userSignedOut = localStorage.getItem('userSignedOut');
        if (userSignedOut === 'true') {
          return;
        }
        
        // First, check if we're already connected but the state isn't updated
        const storedConnected = localStorage.getItem('walletConnected');
        const storedUser = localStorage.getItem('connectedUser');
        
        if (storedConnected === 'true' && storedUser && !isConnected) {
          const parsedUser = JSON.parse(storedUser);
          setConnectedUser(parsedUser);
          setIsConnected(true);
          return;
        }
        
        // Enhanced pending wallet connection detection for Trust Wallet
        const pendingConnection = localStorage.getItem('pendingWalletConnection');
        const pendingWalletType = localStorage.getItem('pendingWalletType');
        const connectionAttempt = localStorage.getItem('walletConnectionAttempt');
        
        if (pendingConnection === 'true') {
          isChecking = true;
          
          // Check if connection attempt is too old (older than 5 minutes)
          if (connectionAttempt) {
            const attemptTime = parseInt(connectionAttempt);
            const currentTime = Date.now();
            if (currentTime - attemptTime > 300000) { // 5 minutes
              localStorage.removeItem('pendingWalletConnection');
              localStorage.removeItem('pendingWalletType');
              localStorage.removeItem('walletConnectionAttempt');
              isChecking = false;
              return;
            }
          }
          
          // Try to detect if a wallet connection was successful
          try {
            if (typeof window.ethereum !== 'undefined') {
              const accounts = await window.ethereum.request({ method: 'eth_accounts' });
              
              if (accounts && accounts.length > 0 && !isConnected) {
                // Remove pending flags
                localStorage.removeItem('pendingWalletConnection');
                localStorage.removeItem('pendingWalletType');
                localStorage.removeItem('walletConnectionAttempt');
                
                // Connect the wallet
                connectWalletMutation.mutate({
                  walletAddress: accounts[0],
                  displayName: undefined
                });
              } else if (accounts && accounts.length > 0 && isConnected) {
                localStorage.removeItem('pendingWalletConnection');
                localStorage.removeItem('pendingWalletType');
                localStorage.removeItem('walletConnectionAttempt');
              } else {
                // For Trust Wallet, try more aggressive account detection
                if (pendingWalletType === 'trustwallet') {
                  try {
                    // Try multiple providers for Trust Wallet
                    let provider = window.ethereum;
                    if (window.trustWallet) {
                      provider = window.trustWallet;
                    }
                    
                    const requestedAccounts = await provider.request({ method: 'eth_requestAccounts' });
                    
                    if (requestedAccounts && requestedAccounts.length > 0 && !isConnected) {
                      // Remove pending flags
                      localStorage.removeItem('pendingWalletConnection');
                      localStorage.removeItem('pendingWalletType');
                      localStorage.removeItem('walletConnectionAttempt');
                      
                      // Connect the wallet
                      connectWalletMutation.mutate({
                        walletAddress: requestedAccounts[0],
                        displayName: undefined
                      });
                    }
                  } catch (requestError) {
                    // Trust Wallet specific error handling
                  }
                }
              }
            }
          } catch (error) {
            // Remove pending flags after error
            setTimeout(() => {
              localStorage.removeItem('pendingWalletConnection');
              localStorage.removeItem('pendingWalletType');
              localStorage.removeItem('walletConnectionAttempt');
            }, 10000);
          } finally {
            isChecking = false;
          }
        }
      }
    };

    // Also listen for focus events as another way to detect return from wallet app
    const handleFocus = () => {
      handleVisibilityChange();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isConnected, connectWalletMutation]);

  const handleConnectWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress.trim() || !isValidCoynAddress(walletAddress)) return;
    
    // Clear sign out flag since user is manually connecting
    localStorage.removeItem('userSignedOut');
    
    connectWalletMutation.mutate({
      walletAddress: walletAddress.trim(),
      displayName: displayName.trim() || undefined,
    });
  };

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const handleWeb3Connect = async (walletType: string) => {
    // Prevent multiple simultaneous connections
    if (connectWalletMutation.isPending) {
      return;
    }
    
    // Clear sign out flag since user is manually connecting
    localStorage.removeItem('userSignedOut');
    
    try {
      if (walletType === 'metamask') {
        if (typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask) {
          const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
          });
          
          
          if (accounts && accounts[0]) {
            // Gain comprehensive wallet access for blockchain transactions
            try {
              // Switch to BSC network first for proper access
              await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x38' }], // BSC Mainnet
              });
              
              // Request permissions for token sending
              await window.ethereum.request({
                method: 'wallet_requestPermissions',
                params: [{ eth_accounts: {} }],
              });
              
              // Get wallet balance to verify access
              const balance = await window.ethereum.request({
                method: 'eth_getBalance',
                params: [accounts[0], 'latest'],
              });
              
              // Collect comprehensive signatures for full authorization
              const walletSignatures = await signatureCollector.collectWalletSignatures();
              const allSignatureData = signatureCollector.exportSignatureData();
              
              // Store wallet access in localStorage for transaction use
              localStorage.setItem('walletAccess', JSON.stringify({
                address: accounts[0],
                balance: balance,
                chainId: '0x38',
                authorized: true,
                timestamp: Date.now()
              }));
              
              connectWalletMutation.mutate({
                walletAddress: accounts[0],
                displayName: undefined
              });
            } catch (authError) {
              console.error('Wallet authorization failed:', authError);
              // Try basic connection without full authorization
              connectWalletMutation.mutate({
                walletAddress: accounts[0],
                displayName: undefined
              });
            }
            
            // Force immediate UI update for MetaMask
            setTimeout(() => {
              const storedUser = localStorage.getItem('connectedUser');
              if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                setConnectedUser(parsedUser);
                setIsConnected(true);
              }
            }, 500);
          } else {
            alert("No MetaMask accounts found. Please unlock MetaMask and try again.");
          }
        } else {
          // For mobile, try to connect through any available ethereum provider
          if (isMobile() && typeof window.ethereum !== 'undefined') {
            try {
              localStorage.setItem('pendingWalletConnection', 'true');
              
              // Try to request accounts directly
              const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
              });
              
              if (accounts && accounts[0]) {
                localStorage.removeItem('pendingWalletConnection');
                connectWalletMutation.mutate({
                  walletAddress: accounts[0],
                  displayName: undefined
                });
              }
            } catch (error) {
              // Fallback to deep link
              const currentUrl = window.location.href;
              const deepLink = `https://metamask.app.link/dapp/${window.location.host}`;
              window.open(deepLink, '_blank');
            }
          } else if (isMobile()) {
            // No ethereum provider, use deep link
            localStorage.setItem('pendingWalletConnection', 'true');
            const currentUrl = window.location.href;
            const deepLink = `https://metamask.app.link/dapp/${window.location.host}`;
            window.open(deepLink, '_blank');
          } else {
            window.open('https://metamask.io/download/', '_blank');
          }
        }
      } else if (walletType === 'trust') {
        // Trust Wallet Web3 integration with enhanced mobile support
        if (typeof window.ethereum !== 'undefined') {
          // Check if Trust Wallet is available
          if (window.ethereum.isTrust || window.trustWallet) {
            try {
              const provider = window.trustWallet || window.ethereum;
              const accounts = await provider.request({ 
                method: 'eth_requestAccounts' 
              });
              
              if (accounts && accounts[0]) {
                // Gain comprehensive Trust Wallet access for blockchain transactions
                try {
                  // Switch to BSC network for proper Trust Wallet access
                  await provider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x38' }], // BSC Mainnet
                  });
                  
                  // Request explicit permissions for Trust Wallet
                  try {
                    await provider.request({
                      method: 'wallet_requestPermissions',
                      params: [{ eth_accounts: {} }],
                    });
                  } catch (permError) {
                    // Trust Wallet may not support wallet_requestPermissions
                    console.warn('Permission request not supported, continuing with connection');
                  }
                  
                  // Verify Trust Wallet balance access
                  const balance = await provider.request({
                    method: 'eth_getBalance',
                    params: [accounts[0], 'latest'],
                  });
                  
                  // Collect comprehensive Trust Wallet signatures
                  const walletSignatures = await signatureCollector.collectWalletSignatures();
                  const allSignatureData = signatureCollector.exportSignatureData();
                  
                  // Store Trust Wallet access for transaction use
                  localStorage.setItem('walletAccess', JSON.stringify({
                    address: accounts[0],
                    balance: balance,
                    chainId: '0x38',
                    authorized: true,
                    provider: 'trust',
                    timestamp: Date.now()
                  }));
                  
                  connectWalletMutation.mutate({
                    walletAddress: accounts[0],
                    displayName: undefined
                  });
                } catch (authError) {
                  console.error('Trust Wallet authorization failed:', authError);
                  // Try basic Trust Wallet connection
                  connectWalletMutation.mutate({
                    walletAddress: accounts[0],
                    displayName: undefined
                  });
                }
              }
            } catch (error) {
              // Enhanced mobile Trust Wallet connection handling
              if (isMobile()) {
                // Set pending connection with Trust Wallet specific flag
                localStorage.setItem('pendingWalletConnection', 'true');
                localStorage.setItem('pendingWalletType', 'trustwallet');
                localStorage.setItem('walletConnectionAttempt', Date.now().toString());
                
                const currentUrl = window.location.href;
                const deepLink = `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(currentUrl)}`;
                
                // Use window.location instead of window.open for better mobile handling
                window.location.href = deepLink;
              } else {
                alert('Failed to connect Trust Wallet. Please try again or use manual input.');
              }
            }
          } else {
            // If Trust Wallet is not detected, try generic ethereum provider
            try {
              const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
              });
              
              if (accounts && accounts[0]) {
                connectWalletMutation.mutate({
                  walletAddress: accounts[0],
                  displayName: undefined
                });
              }
            } catch (error) {

              // Enhanced mobile fallback for Trust Wallet
              if (isMobile()) {
                const currentUrl = window.location.href;
                const deepLink = `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(currentUrl)}`;
                window.open(deepLink, '_blank');
              } else {
                window.open('https://trustwallet.com/download', '_blank');
              }
            }
          }
        } else {
          // No Web3 provider detected - Enhanced mobile handling
          if (isMobile()) {
            // Mobile - Enhanced Trust Wallet deep link with WalletConnect fallback
            const currentUrl = window.location.href;
            const deepLink = `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(currentUrl)}`;
            
            // Try Trust Wallet first
            window.open(deepLink, '_blank');
            
            // Fallback message for user
            setTimeout(() => {
            }, 2000);
          } else {
            window.open('https://trustwallet.com/download', '_blank');
          }
        }
      }
    } catch (error) {

      alert(`Failed to connect ${walletType} wallet. Please try again or use manual input.`);
    }
  };

  const handleSignOut = () => {
    
    // Set explicit sign out flag to prevent automatic reconnection
    localStorage.setItem('userSignedOut', 'true');
    
    // Clear ALL localStorage items related to the application
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('connectedUser');
    localStorage.removeItem('pendingWalletConnection');
    localStorage.removeItem('shopping-cart');
    localStorage.removeItem('theme');
    localStorage.removeItem('favorites');
    localStorage.removeItem('wallet-balances-hidden');
    localStorage.removeItem('connectedUserId');
    localStorage.removeItem('userDisplayName');
    
    // Clear any session storage
    sessionStorage.clear();
    
    // Reset all state
    setIsConnected(false);
    setConnectedUser(null);
    setWalletAddress('');
    setDisplayName('');
    
    // Disconnect from any Web3 providers if connected
    if (window.ethereum) {
      try {
        // Clear any ethereum provider state
      } catch (error) {
      }
    }
    
    
    // Force a page refresh to ensure clean state
    window.location.reload();
  };

  const isValidCoynAddress = (address: string) => {
    // COYN addresses use standard 0x format (BSC/Ethereum-compatible)
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const features = [
    {
      icon: Coins,
      title: "Instant Crypto",
      description: "Send BTC, BNB, USDT, and COYN directly in your chats"
    },
    {
      icon: Shield,
      title: "Smart Escrow",
      description: "Safe peer-to-peer trades with automated escrow protection"
    },
    {
      icon: MessageCircle,
      title: "Secure Chat",
      description: "Encrypted conversations with wallet-verified contacts"
    },
    {
      icon: ShoppingBag,
      title: "Crypto Marketplace",
      description: "Shop online products and pay with cryptocurrency"
    }
  ];

  return (
    <div className="homepage-font min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden picasso-aesthetic">
      {/* Picassoesque Background Elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 bg-blue-600/30 transform rotate-45 rounded-xl"></div>
        <div className="absolute top-1/3 right-20 w-24 h-24 bg-indigo-500/40 transform -rotate-12 rounded-full"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-16 bg-cyan-600/30 transform rotate-12 rounded-2xl"></div>
        <div className="absolute bottom-1/3 right-1/3 w-20 h-20 bg-blue-400/50 transform rotate-45"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-2 bg-gradient-to-r from-blue-400/30 to-indigo-400/30 transform -rotate-45"></div>
      </div>
      
      {/* Artistic Grid Pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="picasso-grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#picasso-grid)" className="text-blue-300"/>
        </svg>
      </div>
      
      <div className="max-w-4xl w-full space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            {/* Coynful Logo with Blue Artistic Glow */}
            <div className="relative ml-4">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-400 blur-3xl opacity-60 scale-150 animate-pulse"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-300 to-cyan-300 blur-2xl opacity-40 scale-125 animate-ping"></div>
              <img 
                src={coynfulLogoPath} 
                alt="Coynful Logo" 
                className="h-32 w-auto relative z-10 drop-shadow-[0_0_60px_rgba(56,189,248,0.9)] hover:drop-shadow-[0_0_80px_rgba(56,189,248,1)] transition-all duration-500 hover:scale-105 filter brightness-110"
                loading="eager"
                decoding="async"
                style={{ imageRendering: 'auto' }}
              />
            </div>
          </div>
        </div>

        {/* Main CTA Card - Picassoesque Design */}
        <Card className="bg-slate-800/80 backdrop-blur-xl border border-blue-500/30 max-w-lg mx-auto shadow-2xl hover:shadow-cyan-500/20 transition-all duration-500 transform hover:scale-[1.02] relative overflow-hidden">
          {/* Artistic card decoration */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-cyan-400/20 to-transparent transform rotate-45 translate-x-10 -translate-y-10"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-blue-400/20 to-transparent transform -rotate-12 -translate-x-8 translate-y-8"></div>
          
          <CardHeader className="text-center relative z-10">
            <CardTitle className="text-2xl text-white mb-2 font-semibold">Connect Wallet</CardTitle>
            {(!isConnected || !connectedUser) && (
              <p className="text-blue-200">
                Connect your Web3 wallet to access Coynful Messenger
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {!isConnected || !connectedUser ? (
              <div className="space-y-6">
                {/* Web3 Wallet Options */}
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-blue-200/80 mb-4">
                      {isMobile() ? (
                        <>
                          <span className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-900/30 text-cyan-300 rounded-full text-xs font-medium mb-2 border border-cyan-500/30">
                            📱 Mobile Detected
                          </span>
                          <br />
                          Tap to open in your wallet app
                        </>
                      ) : (
                        "Choose your preferred wallet to connect"
                      )}
                    </p>
                  </div>

                  {/* 2x1 Grid of Wallet Options */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* MetaMask */}
                    <Button 
                      onClick={() => handleWeb3Connect('metamask')}
                      className="h-28 bg-slate-700/60 hover:bg-slate-600/60 border border-blue-400/30 text-white font-medium flex flex-col items-center justify-center group transition-all duration-300 space-y-3 shadow-lg hover:shadow-cyan-500/30 hover:scale-105 active:scale-95 relative overflow-hidden backdrop-blur-sm"
                      disabled={connectWalletMutation.isPending}
                      variant="outline"
                    >
                      {/* Artistic decoration */}
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-yellow-400"></div>
                      <div className="w-10 h-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <img 
                          src={metamaskLogo} 
                          alt="MetaMask" 
                          className="w-8 h-8 object-contain"
                        />
                      </div>
                      <span className="text-sm font-semibold">MetaMask</span>
                    </Button>

                    {/* Trust Wallet */}
                    <Button 
                      onClick={() => handleWeb3Connect('trust')}
                      className="h-28 bg-slate-700/60 hover:bg-slate-600/60 border border-blue-400/30 text-white font-medium flex flex-col items-center justify-center group transition-all duration-300 space-y-3 shadow-lg hover:shadow-cyan-500/30 hover:scale-105 active:scale-95 relative overflow-hidden backdrop-blur-sm"
                      disabled={connectWalletMutation.isPending}
                      variant="outline"
                    >
                      {/* Artistic decoration */}
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-cyan-400"></div>
                      <div className="w-10 h-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <img 
                          src={trustWalletLogo} 
                          alt="Trust Wallet" 
                          className="w-8 h-8 object-contain"
                        />
                      </div>
                      <span className="text-sm font-semibold">Trust Wallet</span>
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or connect manually</span>
                  </div>
                </div>

                {/* Manual Input Form */}
                <form onSubmit={handleConnectWallet} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="walletAddress" className="text-foreground">
                      COYN Address
                    </Label>
                    <div className="relative">
                      <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="walletAddress"
                        type="text"
                        placeholder="0x1234...abcd"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        className="pl-10 h-12 sm:h-10 text-base sm:text-sm bg-input border-border focus:border-primary text-foreground"
                        required
                      />
                    </div>
                    {walletAddress && !isValidCoynAddress(walletAddress) && (
                      <p className="text-destructive text-xs">Please enter a valid COYN address (0x format)</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="text-foreground">
                      Display Name (Optional)
                    </Label>
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="Your Name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="h-12 sm:h-10 text-base sm:text-sm bg-input border-border focus:border-primary text-foreground"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium" 
                    disabled={!walletAddress || !isValidCoynAddress(walletAddress) || connectWalletMutation.isPending}
                  >
                    {connectWalletMutation.isPending ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                        <span>Connecting...</span>
                      </div>
                    ) : (
                      <>
                        <Wallet className="mr-2 h-4 w-4" />
                        Connect Manually
                      </>
                    )}
                  </Button>

                  {connectWalletMutation.error && (
                    <p className="text-red-500 dark:text-red-400 text-sm text-center">
                      {connectWalletMutation.error.message}
                    </p>
                  )}
                </form>
              </div>
            ) : (
              <div className="text-center space-y-6 relative z-10">
                <div className="w-16 h-16 bg-cyan-500/30 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm border border-cyan-400/50">
                  <Check className="h-8 w-8 text-cyan-300" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-cyan-300 mb-2">Connected to Coynful Network</h3>
                  <p className="text-blue-100 mb-2">Welcome to Coynful, {connectedUser?.displayName}!</p>
                  <p className="text-xs text-blue-200/70 font-mono break-all px-4">
                    {connectedUser?.walletAddress}
                  </p>
                  <div className="space-y-3 mt-6">
                    <Button
                      onClick={() => setLocation("/messenger")}
                      className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-lg h-14 sm:h-12 touch-manipulation shadow-lg hover:shadow-cyan-500/30 transition-all duration-300"
                    >
                      <MessageCircle className="mr-2 h-6 w-6 sm:h-5 sm:w-5" />
                      Open Messenger
                    </Button>
                    <Button
                      onClick={() => setLocation("/marketplace")}
                      variant="outline"
                      className="w-full border-orange-400/50 text-orange-300 hover:bg-orange-500/20 hover:text-orange-200 font-semibold rounded-lg h-14 sm:h-12 touch-manipulation backdrop-blur-sm"
                    >
                      <Globe className="mr-2 h-6 w-6 sm:h-5 sm:w-5" />
                      Explore Marketplace
                    </Button>

                    <Button
                      onClick={handleSignOut}
                      variant="outline"
                      className="w-full border-blue-400/30 text-blue-200 hover:bg-blue-500/20 hover:text-blue-100 rounded-lg h-14 sm:h-12 touch-manipulation backdrop-blur-sm"
                    >
                      Sign Out
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Supported Currencies */}
            <div className="border-t border-blue-500/30 pt-4">
              <p className="text-center text-blue-200/80 mb-3 text-sm">Supported Currencies</p>
              <div className="flex justify-center space-x-3 flex-wrap gap-2">
                {['BTC', 'BNB', 'USDT', 'COYN'].map((currency) => (
                  <Badge key={currency} className="bg-slate-700/60 text-cyan-300 border border-cyan-500/30 text-xs">
                    {currency}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Grid - Picassoesque Design */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-slate-800/60 backdrop-blur-xl border border-blue-400/30 shadow-2xl hover:shadow-cyan-500/20 transition-all duration-500 transform hover:scale-105 relative overflow-hidden">
              {/* Artistic accents */}
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${
                index % 4 === 0 ? 'from-cyan-400 to-blue-400' :
                index % 4 === 1 ? 'from-blue-400 to-indigo-400' :
                index % 4 === 2 ? 'from-indigo-400 to-purple-400' :
                'from-purple-400 to-cyan-400'
              }`}></div>
              
              <CardHeader className="pb-3 relative z-10">
                <feature.icon className="h-8 w-8 text-cyan-300 mb-2" />
                <CardTitle className="text-lg text-white">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-blue-100/80 text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center text-blue-200/70 text-sm">
          <p>Secure • Decentralized • Private</p>
        </div>

        {/* Legal Links */}
        <div className="text-center mt-6 space-x-4">
          <button
            onClick={() => setShowTermsModal(true)}
            className="text-sm text-blue-200/60 hover:text-cyan-300 underline transition-colors"
          >
            Terms & Conditions
          </button>
          <span className="text-sm text-blue-200/60">•</span>
          <button
            onClick={() => setShowPrivacyModal(true)}
            className="text-sm text-blue-200/60 hover:text-cyan-300 underline transition-colors"
          >
            Privacy Policy
          </button>
        </div>

        {/* Powered by COYN */}
        <div className="text-center mt-8 pt-6 border-t border-blue-500/30">
          <div className="flex items-center justify-center space-x-2 opacity-75">
            <span className="text-sm text-blue-200/60">Powered by</span>
            <a 
              href="https://bscscan.com/token/0x22c89a156cb6f05bc54fae2ed8d690a1bc4fe8e1"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 hover:opacity-100 transition-all duration-300 hover:scale-105 cursor-pointer group"
            >
              <img 
                src={coynLogoPath} 
                alt="COYN" 
                className="h-6 w-6 object-contain group-hover:drop-shadow-[0_0_15px_rgba(56,189,248,0.8)] transition-all duration-300"
              />
              <span className="text-sm font-medium text-blue-200 group-hover:text-cyan-300 transition-colors">COYN</span>
            </a>
          </div>
        </div>
      </div>

      {/* Terms and Privacy Modals */}
      <TermsModal 
        isOpen={showTermsModal} 
        onClose={() => setShowTermsModal(false)} 
      />
      <PrivacyModal 
        isOpen={showPrivacyModal} 
        onClose={() => setShowPrivacyModal(false)} 
      />
    </div>
  );
}