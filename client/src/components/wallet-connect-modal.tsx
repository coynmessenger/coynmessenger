import { useState } from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Smartphone, QrCode, ExternalLink } from "lucide-react";
import { SiBinance } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletConnectModal({ isOpen, onClose }: WalletConnectModalProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  const walletOptions = [
    {
      id: "metamask",
      name: "MetaMask",
      icon: (
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-500 rounded" />
          </div>
        </div>
      ),
      popular: true
    },
    {
      id: "binance",
      name: "Binance Wallet",
      icon: (
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
          <SiBinance className="w-8 h-8 text-white" />
        </div>
      ),
      popular: false
    },
    {
      id: "trustwallet",
      name: "Trust Wallet",
      icon: (
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full" />
          </div>
        </div>
      ),
      popular: false
    },
    {
      id: "coinbase",
      name: "Coinbase Wallet",
      icon: (
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-600 font-bold text-lg">
            C
          </div>
        </div>
      ),
      popular: false
    }
  ];

  const handleWalletSelect = async (walletId: string) => {
    setSelectedWallet(walletId);
    setIsConnecting(true);

    // Simulate connection process
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (walletId === "metamask") {
        // Check if MetaMask is installed
        if (typeof window.ethereum !== "undefined") {
          try {
            const accounts = await window.ethereum.request({
              method: "eth_requestAccounts",
            });
            
            if (accounts.length > 0) {
              const walletAddress = accounts[0];
              const userData = {
                id: Date.now(),
                walletAddress,
                displayName: "MetaMask User",
                isConnected: true,
                connectionTimestamp: new Date().toISOString()
              };

              localStorage.setItem('connectedUser', JSON.stringify(userData));
              localStorage.setItem('walletConnected', 'true');

              toast({
                title: "Wallet Connected!",
                description: `Connected to ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
              });

              onClose();
              setLocation("/messenger");
              return;
            }
          } catch (error) {
            console.error("MetaMask connection failed:", error);
            toast({
              title: "Connection Failed",
              description: "Failed to connect to MetaMask. Please try again.",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "MetaMask Not Found",
            description: "Please install MetaMask extension to continue.",
            variant: "destructive",
          });
          window.open("https://metamask.io/download/", "_blank");
        }
      } else {
        // For other wallets, show coming soon message
        toast({
          title: "Coming Soon",
          description: `${walletOptions.find(w => w.id === walletId)?.name} integration is coming soon. Please use manual input for now.`,
        });
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Unable to connect wallet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
      setSelectedWallet(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 border-0 shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <div className="w-4 h-4 bg-blue-600 rounded" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Connect your wallet
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="py-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              WalletConnect
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose WalletConnect to see supported apps on your device
            </p>
          </div>

          <div className="space-y-3">
            {walletOptions.map((wallet) => (
              <Button
                key={wallet.id}
                variant="outline"
                className={`w-full h-16 flex items-center justify-between p-4 border-2 transition-all hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 ${
                  selectedWallet === wallet.id && isConnecting
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : "border-gray-200 dark:border-gray-700"
                }`}
                onClick={() => handleWalletSelect(wallet.id)}
                disabled={isConnecting}
              >
                <div className="flex items-center space-x-4">
                  {wallet.icon}
                  <div className="text-left">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {wallet.name}
                    </div>
                    {wallet.popular && (
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        Popular
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedWallet === wallet.id && isConnecting && (
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  )}
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </div>
              </Button>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <QrCode className="w-4 h-4" />
                <span>QR Code</span>
              </div>
              <div className="flex items-center space-x-2">
                <Smartphone className="w-4 h-4" />
                <span>Mobile</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}