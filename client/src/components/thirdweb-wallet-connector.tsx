import { ConnectButton } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { createWallet } from "thirdweb/wallets";

const client = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID!,
});

const wallets = [
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
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
  
  return (
    <ConnectButton
      client={client}
      autoConnect={!userSignedOut}
      connectModal={{ 
        size: "wide",
        title: "Connect to COYN Messenger",
        titleIcon: "",
        showThirdwebBranding: false,
      }}
      theme="dark"
      wallets={wallets}
      connectButton={{
        label: "Connect Wallet",
        className: className || `
          w-full bg-gradient-to-r from-orange-500 to-orange-600 
          hover:from-orange-600 hover:to-orange-700 
          text-white font-semibold py-3 px-6 rounded-xl 
          transition-all duration-200 shadow-lg hover:shadow-xl
          border border-orange-400/20
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
          const account = wallet.getAccount();
          if (account?.address && onConnect) {
            onConnect(account.address);
          }
        } catch (error) {
          console.error('Error getting wallet account:', error);
        }
      }}
      onDisconnect={() => {
        if (onDisconnect) {
          onDisconnect();
        }
      }}
    />
  );
}