import { ConnectButton, useActiveAccount, useDisconnect, useActiveWallet } from "thirdweb/react";
import { createWallet } from "thirdweb/wallets";
import { thirdwebClient, defaultChain } from "@/lib/thirdweb-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, ArrowRight, Check } from "lucide-react";
import { useEffect } from "react";

interface ThirdwebConnectButtonProps {
  onWalletConnected?: (address: string) => void;
  onWalletDisconnected?: () => void;
}

export default function ThirdwebConnectButton({ 
  onWalletConnected, 
  onWalletDisconnected 
}: ThirdwebConnectButtonProps) {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  
  const handleDisconnect = async () => {
    try {
      if (wallet) {
        await disconnect(wallet);
      }
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  // Handle wallet connection/disconnection events
  useEffect(() => {
    if (account?.address && onWalletConnected) {
      onWalletConnected(account.address);
    } else if (!account?.address && onWalletDisconnected) {
      onWalletDisconnected();
    }
  }, [account?.address, onWalletConnected, onWalletDisconnected]);

  // Supported wallets
  const wallets = [
    createWallet("io.rabby"),
    createWallet("app.phantom"),
    createWallet("inApp"), // In-app wallet for email/social login
  ];

  if (account) {
    return (
      <Card className="border border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-yellow-500/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="font-medium text-white">Wallet Connected</p>
                <p className="text-sm text-gray-400">
                  {`${account.address.slice(0, 6)}...${account.address.slice(-4)}`}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
            >
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Custom Connect Button */}
      <ConnectButton
        client={thirdwebClient}
        wallets={wallets}
        chain={defaultChain}
        connectButton={{
          label: "Connect Your Wallet",
        }}
        connectModal={{
          size: "wide",
          title: "Connect to COYN Messenger",
          welcomeScreen: {
            title: "Welcome to COYN Messenger",
            subtitle: "Connect your wallet to start messaging and managing crypto",
          },
          showThirdwebBranding: false,
        }}
      />
      
      {/* Alternative Custom Styled Button */}
      <div className="text-center">
        <ConnectButton
          client={thirdwebClient}
          wallets={wallets}
          chain={defaultChain}
          connectButton={{
            style: {
              background: "linear-gradient(135deg, #f97316, #eab308)",
              border: "none",
              borderRadius: "12px",
              padding: "12px 24px",
              fontSize: "16px",
              fontWeight: "600",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s ease",
            },
          }}
        />
      </div>
      
      {/* Custom Wallet Options */}
      <div className="grid gap-3 mt-6">
        <p className="text-sm text-gray-400 text-center">Or choose a specific wallet:</p>
        
        <div className="grid grid-cols-2 gap-3">
          <ConnectButton
            client={thirdwebClient}
            wallets={[createWallet("io.metamask")]}
            chain={defaultChain}
            connectButton={{
              label: "MetaMask",
              className: "w-full p-3 border border-gray-600 rounded-lg hover:border-orange-500 transition-colors flex items-center gap-2",
            }}
          />
          
          <ConnectButton
            client={thirdwebClient}
            wallets={[createWallet("com.trustwallet.app")]}
            chain={defaultChain}
            connectButton={{
              label: "Trust Wallet",
              className: "w-full p-3 border border-gray-600 rounded-lg hover:border-orange-500 transition-colors flex items-center gap-2",
            }}
          />
        </div>
      </div>
    </div>
  );
}