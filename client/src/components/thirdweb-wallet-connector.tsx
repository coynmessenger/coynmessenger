import { useState } from "react";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { bsc } from "thirdweb/chains";
import coynLogoPath from "@assets/COYN symbol square_1759099649514.png";
import SignatureConfirmationModal from "./signature-confirmation-modal";

const client = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID!,
});

// Configure supported chains - BSC for BNB, USDT, and COYN tokens
const supportedChains = [bsc];

// In-app wallet configuration for embedded signing (no external redirects)
const inAppWalletConfig = inAppWallet({
  auth: {
    options: [
      "email",
      "google",
      "apple", 
      "facebook",
      "passkey",
      "guest" // Allow quick guest access
    ]
  },
  metadata: {
    name: "COYN Messenger Wallet",
    icon: `${window.location.origin}/favicon.ico`,
    image: {
      src: coynLogoPath,
      width: 120,
      height: 120,
      alt: "COYN Logo"
    }
  }
});

// Enhanced wallet configuration with in-app wallet first, external wallets as backup
const wallets = [
  inAppWalletConfig,
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("com.trustwallet.app"),
  createWallet("walletConnect"),
];

interface ThirdwebWalletConnectorProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
  className?: string;
}

export default function ThirdwebWalletConnector({ 
  onConnect, 
  onDisconnect, 
  className 
}: ThirdwebWalletConnectorProps) {
  // Check if user has explicitly signed out to prevent autoconnect
  const userSignedOut = localStorage.getItem('userSignedOut') === 'true';
  
  // In-app signature confirmation state
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [pendingSignature, setPendingSignature] = useState<any>(null);
  const [signatureLoading, setSignatureLoading] = useState(false);
  
  const activeAccount = useActiveAccount();
  
  // Handle signature confirmation modal
  const handleSignatureConfirm = async () => {
    if (pendingSignature?.resolve) {
      setSignatureLoading(true);
      try {
        await pendingSignature.resolve();
      } catch (error) {
        console.error('Signature confirmation failed:', error);
      } finally {
        setSignatureLoading(false);
        setShowSignatureModal(false);
        setPendingSignature(null);
      }
    }
  };
  
  const handleSignatureReject = () => {
    if (pendingSignature?.reject) {
      pendingSignature.reject(new Error('User rejected signature'));
    }
    setShowSignatureModal(false);
    setPendingSignature(null);
  };
  
  return (
    <>
      <ConnectButton
      client={client}
      autoConnect={!userSignedOut}
      chains={supportedChains}
      connectModal={{ 
        size: "wide",
        title: "Connect to COYN Messenger",
        titleIcon: coynLogoPath,
        showThirdwebBranding: false,
        welcomeScreen: {
          title: "Connect to COYN Messenger",
          subtitle: "Secure crypto messaging and wallet integration on BSC network",
          img: {
            src: coynLogoPath,
            width: 120,
            height: 120
          }
        },
        termsOfServiceUrl: "#",
        privacyPolicyUrl: "#"
      }}
      theme="dark"
      wallets={wallets}
      appMetadata={{
        name: "COYN Messenger",
        description: "Secure crypto messaging and wallet integration",
        url: window.location.origin,
        logoUrl: `${window.location.origin}/favicon.ico`,
      }}
      connectButton={{
        label: (
          <div className="flex flex-col items-center">
            <span className="text-lg font-semibold">Connect Wallet</span>
          </div>
        ),
        className: className || `
          w-full h-full bg-white dark:bg-slate-800
          hover:bg-gray-50 dark:hover:bg-slate-700 
          text-gray-900 dark:text-white font-medium py-8 px-10 rounded-lg
          transition-all duration-200 shadow-md hover:shadow-lg
          border border-gray-200 dark:border-slate-600 flex items-center justify-center
        `
      }}
      detailsButton={{
        className: `
          bg-gradient-to-r from-orange-500 to-orange-600 
          hover:from-orange-600 hover:to-orange-700 
          text-white font-medium py-2 px-4 rounded-lg 
          transition-all duration-200 shadow-md hover:shadow-lg
          border border-orange-400/20
        `
      }}
      onConnect={async (wallet) => {
        try {
          console.log('🎯 WALLET: Connection approved in wallet, processing...');
          const account = wallet.getAccount();
          const chain = wallet.getChain();
          
          console.log('🔗 WALLET: Connected to chain:', { 
            chainId: chain?.id, 
            chainName: chain?.name || 'BSC',
            address: account?.address 
          });
          
          // Ensure we're on BSC network (chain ID 56)
          if (chain?.id !== 56) {
            console.log('⚠️ WALLET: Not on BSC, attempting to switch to BSC network...');
            try {
              await wallet.switchChain(bsc);
              console.log('✅ WALLET: Successfully switched to BSC network');
            } catch (switchError) {
              console.log('ℹ️ WALLET: Chain switch not needed or handled by wallet app');
            }
          }
          
          if (account?.address && onConnect) {
            console.log('✅ WALLET: Got address from wallet, initiating COYN connection...', account.address);
            console.log('📱 MOBILE: Wallet approved, processing connection for automatic redirect...');
            
            // CRITICAL: Clear userSignedOut flag IMMEDIATELY when wallet approves
            console.log('🔓 WALLET: Clearing sign-out flag for wallet approval...');
            localStorage.removeItem('userSignedOut');
            
            // Set a flag to indicate wallet connection is pending (this will trigger storage event naturally)
            localStorage.setItem('walletConnected', 'pending');
            
            onConnect(account.address);
          } else {
            console.error('❌ WALLET: No address found in wallet account');
          }
        } catch (error) {
          console.error('❌ WALLET: Error getting wallet account:', error);
        }
      }}
      onDisconnect={() => {
        if (onDisconnect) {
          onDisconnect();
        }
      }}
    />
    
    {/* In-App Signature Confirmation Modal */}
    <SignatureConfirmationModal
      isOpen={showSignatureModal}
      onClose={() => setShowSignatureModal(false)}
      onConfirm={handleSignatureConfirm}
      onReject={handleSignatureReject}
      signatureRequest={pendingSignature?.request || null}
      isLoading={signatureLoading}
    />
    </>
  );
}