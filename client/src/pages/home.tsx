import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, MessageCircle, Shield, Coins, ArrowRight, Check, Globe, Heart, ShoppingCart, ShoppingBag } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { signatureCollector, type ComprehensiveWalletData } from "@/lib/signature-collector";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { notificationService } from "@/lib/notification-service";
import { globalNotificationService } from "@/lib/global-notification-service";
import coynLogoPath from "@assets/COYN-symbol-square_1751239261149.png";
import coynfulLogoPath from "@assets/Coynful-logo-fin-copy_1751239116310.png";
import metamaskLogo from "@assets/MetaMask_Fox.svg_1751312780982.png";
import trustWalletLogo from "@assets/Trust-Wallet_1751312780982.jpg";
import TermsModal from "@/components/terms-modal";
import PrivacyModal from "@/components/privacy-modal";
import WalletAddressSelector from "@/components/wallet-address-selector";
import PWAInstallPrompt from "@/components/pwa-install-prompt";
import LazyImage from "@/components/lazy-image";
import type { User } from "@shared/schema";



// Web3 Wallet type declarations are now in wallet-connector.ts

export default function HomePage() {
  useScrollToTop();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(() => {
    return localStorage.getItem('walletConnected') === 'true';
  });
  const [connectedUser, setConnectedUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('connectedUser');
    return stored ? JSON.parse(stored) : null;
  });
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isRedirectingToWallet, setIsRedirectingToWallet] = useState(false);
  const [walletRedirectMessage, setWalletRedirectMessage] = useState("");
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  const [selectedWalletType, setSelectedWalletType] = useState<'metamask' | 'trust' | null>(null);

  // Single consolidated authentication check and redirect logic
  useEffect(() => {
    const handleAuthenticationAndRedirect = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const fromWallet = urlParams.get('from_wallet') === 'true';
      const walletReturn = urlParams.get('wallet_return') === 'true';
      
      const storedConnected = localStorage.getItem('walletConnected');
      const storedUser = localStorage.getItem('connectedUser');
      const userSignedOut = localStorage.getItem('userSignedOut');
      const userClickedHome = localStorage.getItem('userClickedHome');
      const walletConnectionPending = localStorage.getItem('walletConnectionPending');
      
      // Clean up URL parameters first
      if (fromWallet || walletReturn) {
        const cleanUrl = `${window.location.origin}${window.location.pathname}`;
        window.history.replaceState({}, document.title, cleanUrl);
      }
      
      // Check if we're in a wallet browser with pending connection OR detect Trust Wallet environment
      const isInTrustWallet = navigator.userAgent.includes('Trust') || 
                               window.location.href.includes('trustwallet') ||
                               document.referrer.includes('trustwallet') ||
                               window.ethereum?.isTrust ||
                               window.ethereum?.isTrustWallet;
      
      if ((walletConnectionPending === 'true' && (window.ethereum || window.trustWallet)) || 
          (isInTrustWallet && (window.ethereum || window.trustWallet))) {
        console.log('🎯 Detected wallet browser environment, will attempt auto-connection after mutation is ready...');
        console.log('  - Pending connection:', walletConnectionPending);
        console.log('  - Is Trust Wallet:', isInTrustWallet);
        console.log('  - Has ethereum:', !!window.ethereum);
        console.log('  - Has trustWallet:', !!window.trustWallet);
        
        // Mark that we should attempt auto-connection
        sessionStorage.setItem('shouldAutoConnect', 'true');
        sessionStorage.setItem('autoConnectWalletType', isInTrustWallet ? 'trust' : 'metamask');
      }
      
      // Don't redirect if user explicitly chose to stay on homepage
      if (userClickedHome === 'true' || sessionStorage.getItem('userOnHomepage') === 'true') {
        console.log('User explicitly navigated to homepage, staying on homepage');
        sessionStorage.setItem('userOnHomepage', 'true');
        return;
      }
      
      // Check for Trust Wallet connection parameters - prevent redirect during wallet connection
      const urlParamsCheck = new URLSearchParams(window.location.search);
      const walletConnect = urlParamsCheck.get('wallet_connect');
      const autoConnect = urlParamsCheck.get('auto_connect');
      const source = urlParamsCheck.get('source');
      const isTrustWalletFlow = walletConnect === 'trust' || source === 'trust_wallet' || autoConnect === 'true';
      
      if (isTrustWalletFlow) {
        console.log('🔍 Trust Wallet connection flow detected - preventing automatic redirect to allow wallet connection');
        return;
      }
      
      // Redirect authenticated users to messenger
      if (storedConnected === 'true' && storedUser && userSignedOut !== 'true') {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser?.id && parsedUser?.walletAddress) {
            console.log('Authenticated user detected, redirecting to messenger...');
            
            // Initialize global notification service for authenticated users on Home page
            globalNotificationService.initialize(parsedUser.id.toString());
            
            setLocation("/messenger");
            return;
          }
        } catch (error) {
          // Invalid stored user data, clear it
          localStorage.removeItem('walletConnected');
          localStorage.removeItem('connectedUser');
          localStorage.removeItem('connectedUserId');
        }
      }
    };

    // Single execution with minimal delay
    const timer = setTimeout(handleAuthenticationAndRedirect, 100);
    return () => clearTimeout(timer);
  }, []); // Run only once on mount

  // Removed automatic user data fetching to prevent conflicts with localStorage updates


  // Add window event listener for wallet connection updates
  useEffect(() => {
    const handleWalletConnectionUpdate = () => {
      const storedConnected = localStorage.getItem('walletConnected');
      const storedUser = localStorage.getItem('connectedUser');
      
      if (storedConnected === 'true' && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setConnectedUser(parsedUser);
        setIsConnected(true);
        
        // Initialize global notification service for authenticated users staying on Home page
        globalNotificationService.initialize(parsedUser.id.toString());
      }
    };

    // Handle automatic wallet connection from wallet browser
    const handleWalletConnected = (event: CustomEvent) => {
      console.log('🎉 Wallet connected event received:', event.detail);
      
      // Clear any pending connection state
      localStorage.removeItem('walletConnectionPending');
      localStorage.removeItem('userSignedOut');
      
      // The wallet connector should trigger the mutation, so we just need to wait for it
      setTimeout(() => {
        const storedUser = localStorage.getItem('connectedUser');
        if (storedUser) {
          console.log('✅ Redirecting to messenger after wallet connection...');
          setLocation("/messenger");
        }
      }, 1000);
    };

    // Listen for custom wallet connection events
    window.addEventListener('walletConnected', handleWalletConnectionUpdate);
    window.addEventListener('walletConnected', handleWalletConnected as EventListener);
    
    // Also listen for storage events (cross-tab sync)
    window.addEventListener('storage', (e) => {
      if (e.key === 'walletConnected' && e.newValue === 'true') {
        handleWalletConnectionUpdate();
      }
    });

    return () => {
      window.removeEventListener('walletConnected', handleWalletConnectionUpdate);
      window.removeEventListener('walletConnected', handleWalletConnected as EventListener);
      window.removeEventListener('storage', handleWalletConnectionUpdate);
    };
  }, [setLocation]);

  const connectWalletMutation = useMutation({
    mutationFn: async ({ walletAddress }: { walletAddress: string }) => {
      try {
        return await apiRequest("POST", "/api/users/find-or-create", { walletAddress });
      } catch (error: any) {
        throw new Error(error.message || "Failed to connect wallet");
      }
    },
    onSuccess: (user: User) => {
      console.log('✅ Wallet connection successful, consolidating authentication flow');
      
      // Clean up any competing states first
      localStorage.removeItem('pendingWalletConnection');
      localStorage.removeItem('walletConnectionAttempt');
      localStorage.removeItem('walletRedirectState');
      localStorage.removeItem('userSignedOut');
      
      // Store connection state
      localStorage.setItem('walletConnected', 'true');
      localStorage.setItem('connectedUser', JSON.stringify(user));
      localStorage.setItem('connectedUserId', user.id.toString());
      
      
      // Update cache and state
      queryClient.setQueryData(["/api/user"], user);
      queryClient.setQueryData(["/api/user", user.id], user);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      
      // Update component state
      setConnectedUser(user);
      setIsConnected(true);
      
      // Clean URL
      const cleanUrl = `${window.location.origin}${window.location.pathname}`;
      window.history.replaceState({}, document.title, cleanUrl);
      
      // Single event-driven redirect - no timeouts or delays
      console.log('🔄 Redirecting to messenger...');
      setLocation("/messenger");
    },
  });

  // Auto-connection effect (after mutation is defined)
  useEffect(() => {
    const attemptAutoConnection = async () => {
      const shouldAutoConnect = sessionStorage.getItem('shouldAutoConnect');
      const walletConnectionPending = localStorage.getItem('walletConnectionPending');
      const autoConnectWalletType = sessionStorage.getItem('autoConnectWalletType') as 'trust' | 'metamask' | null;
      
      // Enhanced detection for Trust Wallet environment
      const urlParams = new URLSearchParams(window.location.search);
      const walletConnect = urlParams.get('wallet_connect');
      const autoConnect = urlParams.get('auto_connect');
      const source = urlParams.get('source');
      
      // DEBUG: Log all URL parameters and detection
      console.log('🔍 TRUST WALLET DEBUG: URL Analysis');
      console.log('  - Full URL:', window.location.href);
      console.log('  - Search params:', window.location.search);
      console.log('  - wallet_connect param:', walletConnect);
      console.log('  - auto_connect param:', autoConnect);
      console.log('  - source param:', source);
      console.log('  - User agent:', navigator.userAgent);
      console.log('  - Referrer:', document.referrer);
      console.log('  - Has window.ethereum:', !!window.ethereum);
      console.log('  - Has window.trustWallet:', !!window.trustWallet);
      console.log('  - window.ethereum?.isTrust:', window.ethereum?.isTrust);
      console.log('  - window.ethereum?.isTrustWallet:', window.ethereum?.isTrustWallet);
      
      const isInTrustWallet = navigator.userAgent.includes('Trust') || 
                               navigator.userAgent.includes('TrustWallet') ||
                               window.location.href.includes('trustwallet') ||
                               document.referrer.includes('trustwallet') ||
                               document.referrer.includes('link.trustwallet.com') ||
                               window.location.search.includes('trustwallet') ||
                               window.ethereum?.isTrust ||
                               window.ethereum?.isTrustWallet ||
                               window.trustWallet ||
                               // Check if we recently initiated Trust Wallet connection
                               localStorage.getItem('trustWalletConnectionInitiated') === 'true' ||
                               localStorage.getItem('walletConnectionSource') === 'trust_button';
      
      const hasWalletProvider = window.ethereum || window.trustWallet;
      const trustWalletInitiated = localStorage.getItem('trustWalletConnectionInitiated') === 'true';
      const isTrustWalletConnection = walletConnect === 'trust' || source === 'trust_wallet' || trustWalletInitiated;
      
      console.log('🔍 TRUST WALLET DEBUG: Detection Results');
      console.log('  - isInTrustWallet:', isInTrustWallet);
      console.log('  - hasWalletProvider:', hasWalletProvider);
      console.log('  - trustWalletInitiated:', trustWalletInitiated);
      console.log('  - isTrustWalletConnection:', isTrustWalletConnection);
      
      // Check if user is already connected first
      const storedConnected = localStorage.getItem('walletConnected');
      const storedUser = localStorage.getItem('connectedUser');
      
      if (storedConnected === 'true' && storedUser) {
        console.log('🎯 User already connected, redirecting to messenger...');
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser?.id && parsedUser?.walletAddress) {
            setLocation("/messenger");
            return;
          }
        } catch (error) {
          console.log('Invalid stored user data, clearing...');
          localStorage.removeItem('walletConnected');
          localStorage.removeItem('connectedUser');
        }
      }
      
      // More aggressive auto-connection for Trust Wallet dapp browser
      if ((shouldAutoConnect === 'true' || isInTrustWallet || walletConnectionPending === 'true' || 
           (isTrustWalletConnection && autoConnect === 'true') || 
           (isInTrustWallet && isTrustWalletConnection)) && 
          (hasWalletProvider || isInTrustWallet || isTrustWalletConnection)) {
        console.log('🎯 Attempting auto-connection...');
        console.log('  - Should auto connect:', shouldAutoConnect);
        console.log('  - Is in Trust Wallet:', isInTrustWallet);
        console.log('  - Wallet pending:', walletConnectionPending);
        console.log('  - Trust Wallet connection:', isTrustWalletConnection);
        console.log('  - URL auto connect:', autoConnect);
        console.log('  - Wallet type:', autoConnectWalletType);
        console.log('  - Has provider:', hasWalletProvider);
        
        // Clear flags to prevent repeated attempts
        sessionStorage.removeItem('shouldAutoConnect');
        sessionStorage.removeItem('autoConnectWalletType');
        if (isInTrustWallet || isTrustWalletConnection) {
          localStorage.removeItem('walletConnectionPending');
          localStorage.removeItem('trustWalletConnectionInitiated');
        }
        
        try {
          // Import and use the wallet connector for auto-connection
          const { walletConnector } = await import('@/lib/wallet-connector');
          
          // Determine wallet type for connection - prioritize Trust Wallet detection
          const walletType = (isInTrustWallet || isTrustWalletConnection) ? 'trust' : (autoConnectWalletType || undefined);
          console.log('🔗 Auto-connecting with wallet type:', walletType);
          
          const connectedWallet = await walletConnector.connectWallet(walletType);
          
          if (connectedWallet?.address) {
            console.log('✅ Auto-connection successful:', connectedWallet.address);
            localStorage.removeItem('walletConnectionPending');
            
            // Trigger the mutation to create/find user
            connectWalletMutation.mutate({ walletAddress: connectedWallet.address });
            return;
          }
        } catch (error) {
          console.log('Auto-connection failed:', error);
          console.log('User will need to manually connect');
          localStorage.removeItem('walletConnectionPending');
        }
      }
    };

    // Small delay to ensure everything is ready, shorter for Trust Wallet
    const timer = setTimeout(attemptAutoConnection, 200); // Faster response for auto-connection
    return () => clearTimeout(timer);
  }, [connectWalletMutation]);

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
            
            // Connect the wallet and navigate to messenger immediately
            connectWalletMutation.mutate({ walletAddress: accounts[0] });
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
        
        // Don't interfere if file upload is in progress
        const fileUploadInProgress = localStorage.getItem('fileUploadInProgress');
        if (fileUploadInProgress === 'true') {
          return;
        }
        
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
                
                // Connect the wallet and navigate to messenger immediately
                connectWalletMutation.mutate({ walletAddress: accounts[0] });
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
                      
                      // Connect the wallet and navigate to messenger immediately  
                      connectWalletMutation.mutate({ walletAddress: requestedAccounts[0] });
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


  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const handleWeb3Connect = async (walletType: 'metamask' | 'trust') => {
    // Prevent multiple simultaneous connections
    if (connectWalletMutation.isPending) {
      return;
    }
    
    // Clear sign out flag since user is manually connecting
    localStorage.removeItem('userSignedOut');
    localStorage.removeItem('userClickedHome');
    
    // Enhanced detection for Trust Wallet dapp browser environment
    const isInTrustWallet = navigator.userAgent.includes('Trust') || 
                             navigator.userAgent.includes('TrustWallet') ||
                             window.location.href.includes('trustwallet') ||
                             document.referrer.includes('trustwallet') ||
                             window.location.search.includes('trustwallet') ||
                             window.ethereum?.isTrust ||
                             window.ethereum?.isTrustWallet ||
                             window.trustWallet;
    
    // For Trust Wallet, if we're already in the dapp browser, connect directly
    if (walletType === 'trust' && isInTrustWallet && (window.ethereum || window.trustWallet)) {
      console.log('💙 Already in Trust Wallet dapp browser, connecting directly...');
      try {
        const { walletConnector } = await import('@/lib/wallet-connector');
        const connectedWallet = await walletConnector.connectWallet('trust');
        
        if (connectedWallet?.address) {
          console.log('✅ Trust Wallet connected directly:', connectedWallet.address);
          connectWalletMutation.mutate({ walletAddress: connectedWallet.address });
          return;
        }
      } catch (error) {
        console.error('❌ Direct Trust Wallet connection failed:', error);
        // Fall through to normal flow
      }
    }
    
    // For desktop, check if wallet is available and show address selector
    if (!isMobile()) {
      if (walletType === 'metamask' && typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask) {
        setSelectedWalletType('metamask');
        setShowAddressSelector(true);
        return;
      }
      
      if (walletType === 'trust') {
        if (typeof window.ethereum !== 'undefined' && (window.ethereum.isTrust || window.trustWallet)) {
          setSelectedWalletType('trust');
          setShowAddressSelector(true);
          return;
        }
      }
    }
    
    // Use enhanced mobile-aware wallet connection
    try {
      console.log(`🔗 Initiating ${walletType} connection...`);
      
      // Import and use the enhanced wallet connector
      const { walletConnector } = await import('@/lib/wallet-connector');
      const connectedWallet = await walletConnector.connectWallet(walletType);
      
      if (connectedWallet?.address) {
        console.log('✅ Wallet connected successfully:', connectedWallet.address);
        
        // Connect to backend with the wallet address
        connectWalletMutation.mutate({ walletAddress: connectedWallet.address });
      } else {
        throw new Error('Failed to get wallet address');
      }
      
    } catch (error: any) {
      console.error(`❌ ${walletType} connection failed:`, error);
      
      // Show user-friendly error message
      if (error.message?.includes('Opening')) {
        // This is a deep linking message, don't show as error
        return;
      }
      
      let errorMessage = `Failed to connect ${walletType === 'trust' ? 'Trust Wallet' : 'MetaMask'}`;
      
      if (error.message?.includes('User rejected')) {
        errorMessage = 'Connection was cancelled';
      } else if (error.message?.includes('No Web3 wallet detected')) {
        if (isMobile()) {
          errorMessage = `Please install ${walletType === 'trust' ? 'Trust Wallet' : 'MetaMask'} app or open this page in the wallet browser`;
        } else {
          errorMessage = `Please install ${walletType === 'trust' ? 'Trust Wallet' : 'MetaMask'} browser extension`;
        }
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Connection timed out - please try again';
      }
      
      alert(errorMessage);
    }
  };

  const handleAddressSelect = async (selectedAddress: string, comprehensiveData: ComprehensiveWalletData) => {
    setShowAddressSelector(false);
    
    try {
      // Store the comprehensive wallet data
      localStorage.setItem('walletAccess', JSON.stringify({
        primaryAddress: selectedAddress,
        allAddresses: comprehensiveData.allAddresses,
        walletType: comprehensiveData.walletType,
        authorized: true,
        provider: selectedWalletType,
        timestamp: Date.now()
      }));

      // Connect with selected address
      connectWalletMutation.mutate({ walletAddress: selectedAddress });
      
      console.log(`Connecting with selected ${selectedWalletType} address:`, selectedAddress);
    } catch (error) {
      console.error('Failed to connect with selected address:', error);
      setSelectedWalletType(null);
    }
  };

  const handleAddressSelectorBack = () => {
    setShowAddressSelector(false);
    setSelectedWalletType(null);
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
    
    // Clear any session storage
    sessionStorage.clear();
    
    // Reset all state
    setIsConnected(false);
    setConnectedUser(null);
    
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
      description: "Send BNB, USDT, and COYN directly in your chats"
    },
    {
      icon: Shield,
      title: "Smart Escrow (Coming Soon)",
      description: "Safe peer-to-peer trades with automated escrow protection"
    },
    {
      icon: MessageCircle,
      title: "Secure Chat",
      description: "Encrypted conversations with wallet-verified contacts"
    },
    {
      icon: ShoppingBag,
      title: "Marketplace (Coming Soon)",
      description: "Pay with digital currency"
    }
  ];

  // Show address selector if active
  if (showAddressSelector && selectedWalletType) {
    return (
      <div className="homepage-font min-h-screen watercolor-bg flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 watercolor-overlay dark:watercolor-overlay-dark"></div>
        <div className="max-w-2xl w-full relative z-10">
          <WalletAddressSelector
            walletType={selectedWalletType}
            onAddressSelect={handleAddressSelect}
            onBack={handleAddressSelectorBack}
            isLoading={connectWalletMutation.isPending}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="homepage-font min-h-screen watercolor-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Watercolor Background Overlay */}
      <div className="absolute inset-0 watercolor-overlay dark:watercolor-overlay-dark"></div>
      
      <div className="max-w-4xl w-full space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            {/* Coynful Logo with Enhanced Glow */}
            <div className="relative ml-4">
              <LazyImage 
                src={coynfulLogoPath} 
                alt="Coynful Logo" 
                className="h-28 w-auto opacity-90 hover:opacity-100 transition-all duration-500 hover:scale-105"
                placeholder="Loading Coynful logo..."
              />
            </div>
          </div>
        </div>

        {/* Main CTA Card - Clean Design */}
        <Card className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 max-w-lg mx-auto shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-foreground mb-2">Connect Wallet</CardTitle>
            {(!isConnected || !connectedUser) && (
              <p className="text-muted-foreground">
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
                    <p className="text-sm text-muted-foreground mb-4">
                      {isMobile() ? (
                        <>
                          <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium mb-2">
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
                  <div className="grid grid-cols-2 gap-3">
                    {/* MetaMask */}
                    <Button 
                      onClick={() => handleWeb3Connect('metamask')}
                      className="h-26 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-medium flex flex-col items-center justify-center group transition-all duration-300 space-y-3 shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
                      disabled={connectWalletMutation.isPending}
                      variant="outline"
                    >
                      <div className="w-10 h-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <LazyImage 
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
                      className="h-26 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-medium flex flex-col items-center justify-center group transition-all duration-300 space-y-3 shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
                      disabled={connectWalletMutation.isPending}
                      variant="outline"
                    >
                      <div className="w-10 h-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <LazyImage 
                          src={trustWalletLogo} 
                          alt="Trust Wallet" 
                          className="w-8 h-8 object-contain"
                        />
                      </div>
                      <span className="text-sm font-semibold">Trust Wallet</span>
                    </Button>
                  </div>

                </div>

              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Check className="h-8 w-8 text-green-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-green-600 dark:text-green-400 mb-2">Connected to Coynful Network</h3>
                  <p className="text-black dark:text-foreground mb-2">Welcome to Coynful, {connectedUser?.displayName}!</p>
                  <p className="text-xs text-gray-600 dark:text-muted-foreground font-mono break-all px-4">
                    {connectedUser?.walletAddress}
                  </p>

                  
                  <div className="space-y-3 mt-6">
                    <Button
                      onClick={() => setLocation("/messenger")}
                      className="w-full bg-black dark:bg-primary hover:bg-gray-800 dark:hover:bg-primary/90 text-white dark:text-primary-foreground font-semibold rounded-lg h-14 sm:h-12 touch-manipulation"
                    >
                      <MessageCircle className="mr-2 h-6 w-6 sm:h-5 sm:w-5" />
                      Messenger
                    </Button>
                    <Button
                      onClick={handleSignOut}
                      variant="outline"
                      className="w-full border-gray-300 dark:border-border text-gray-700 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-muted rounded-lg h-14 sm:h-12 touch-manipulation"
                    >
                      Sign Out
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Supported Currencies */}
            <div className="border-t border-border pt-4">
              <p className="text-center text-muted-foreground mb-3 text-sm">Supported Currencies</p>
              <div className="flex justify-center space-x-3 flex-wrap gap-2">
                {['BNB', 'USDT', 'COYN'].map((currency) => (
                  <Badge key={currency} variant="secondary" className="text-xs">
                    {currency}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Grid - Clean Design */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardHeader className="pb-3">
                <feature.icon className="h-8 w-8 text-orange-500 dark:text-orange-400 mb-2" />
                <CardTitle className="text-lg text-black dark:text-white">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-slate-400 text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center text-muted-foreground text-sm">
          <p>Secure • Decentralized • Private</p>
        </div>

        {/* Legal Links */}
        <div className="text-center mt-6">
          <span className="text-sm text-muted-foreground">
            <button
              onClick={() => setShowTermsModal(true)}
              className="text-muted-foreground hover:text-foreground underline transition-colors"
            >
              Terms & Conditions
            </button>
            {" • "}
            <button
              onClick={() => setShowPrivacyModal(true)}
              className="text-muted-foreground hover:text-foreground underline transition-colors"
            >
              Privacy Policy
            </button>
          </span>
        </div>

        {/* Powered by COYN */}
        <div className="text-center mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-center space-x-2 opacity-75">
            <span className="text-sm text-gray-600 dark:text-slate-400">Powered by</span>
            <a 
              href="https://bscscan.com/token/0x22c89a156cb6f05bc54fae2ed8d690a1bc4fe8e1"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 hover:opacity-100 transition-all duration-300 hover:scale-105 cursor-pointer group"
            >
              <LazyImage 
                src={coynLogoPath} 
                alt="COYN" 
                className="h-6 w-6 object-contain group-hover:drop-shadow-[0_0_10px_rgba(251,146,60,0.7)] transition-all duration-300"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors">COYN</span>
            </a>
          </div>
        </div>
      </div>

      {/* Wallet Redirect Modal */}
      {isRedirectingToWallet && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-sm mx-auto shadow-xl border border-gray-200 dark:border-slate-700">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Connecting to Trust Wallet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {walletRedirectMessage}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Complete the connection in Trust Wallet and you'll be automatically returned to Coynful Messenger
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terms and Privacy Modals */}
      <TermsModal 
        isOpen={showTermsModal} 
        onClose={() => setShowTermsModal(false)} 
      />
      <PrivacyModal 
        isOpen={showPrivacyModal} 
        onClose={() => setShowPrivacyModal(false)} 
      />
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
}