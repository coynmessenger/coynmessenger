import React, { useState, useEffect } from "react";
import { ConnectButton, useActiveAccount, useActiveWallet } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { bsc } from "thirdweb/chains";
import coynLogoPath from "@assets/COYN symbol square_1759099649514.png";
import SignatureConfirmationModal from "./signature-confirmation-modal";
import { inAppSignatureService, type SignatureRequest } from "@/lib/in-app-signature-service";

const client = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID!,
});

// Configure supported chains - BSC for BNB, USDT, and COYN tokens
const supportedChains = [bsc];

// Enhanced wallet configuration for in-app signing experience
const wallets = [
  // Prioritize embedded wallet for in-app signatures on mobile
  inAppWallet({
    auth: {
      options: ["email", "google", "apple", "phone"],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
  createWallet("com.trustwallet.app"),
  createWallet("com.bestwallet"),
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
  // Use thirdweb hooks for proper state management
  const activeAccount = useActiveAccount();
  const activeWallet = useActiveWallet();
  
  // Check if user has explicitly signed out to prevent autoconnect
  const userSignedOut = localStorage.getItem('userSignedOut') === 'true';
  
  // Monitor wallet connection state changes
  useEffect(() => {
    if (activeAccount?.address && !userSignedOut) {
      console.log('🔗 WALLET: Active account detected:', activeAccount.address);
      
      // Clear sign-out flag when account becomes active
      localStorage.removeItem('userSignedOut');
      
      if (onConnect) {
        onConnect(activeAccount.address);
      }
    }
  }, [activeAccount, userSignedOut, onConnect]);
  
  // Monitor wallet disconnection
  useEffect(() => {
    if (!activeAccount && !userSignedOut && onDisconnect) {
      console.log('📱 WALLET: Active account disconnected');
      onDisconnect();
    }
  }, [activeAccount, userSignedOut, onDisconnect]);
  
  // In-app signature state management
  const [currentSignatureRequest, setCurrentSignatureRequest] = useState<SignatureRequest | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isProcessingSignature, setIsProcessingSignature] = useState(false);

  // Set up signature handler for in-app signatures
  useEffect(() => {
    const handleSignatureRequest = async (request: SignatureRequest): Promise<boolean> => {
      return new Promise((resolve) => {
        setCurrentSignatureRequest(request);
        setIsSignatureModalOpen(true);

        // Store resolve function to be called by modal actions
        const handleConfirm = async () => {
          setIsProcessingSignature(true);
          try {
            // Actually approve the signature request
            resolve(true);
          } finally {
            setIsProcessingSignature(false);
            setIsSignatureModalOpen(false);
            setCurrentSignatureRequest(null);
          }
        };

        const handleReject = () => {
          resolve(false);
          setIsSignatureModalOpen(false);
          setCurrentSignatureRequest(null);
        };

        // Store handlers in the request for modal to use
        (request as any).handleConfirm = handleConfirm;
        (request as any).handleReject = handleReject;
      });
    };

    inAppSignatureService.setSignatureHandler(handleSignatureRequest);
  }, []);

  const handleSignatureConfirm = async () => {
    if (currentSignatureRequest && (currentSignatureRequest as any).handleConfirm) {
      await (currentSignatureRequest as any).handleConfirm();
    }
  };

  const handleSignatureReject = () => {
    if (currentSignatureRequest && (currentSignatureRequest as any).handleReject) {
      (currentSignatureRequest as any).handleReject();
    }
  };

  return (
    <>
      {/* Signature Confirmation Modal */}
      <SignatureConfirmationModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        signatureRequest={currentSignatureRequest}
        onConfirm={handleSignatureConfirm}
        onReject={handleSignatureReject}
        isLoading={isProcessingSignature}
      />

      {/* Thirdweb Connect Button */}
    <ConnectButton
      client={client}
      autoConnect={!userSignedOut}
      chains={supportedChains}
      connectModal={{ 
        size: "wide",
        title: "Connect to COYN Messenger",
        titleIcon: "",
        showThirdwebBranding: false,
        welcomeScreen: {
          title: "Connect to COYN Messenger",
          subtitle: "Secure crypto messaging on BSC network"
        },
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
            
            // Clear userSignedOut flag when wallet connects
            console.log('🔓 WALLET: Clearing sign-out flag for wallet approval...');
            localStorage.removeItem('userSignedOut');
            
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
    </>
  );
}