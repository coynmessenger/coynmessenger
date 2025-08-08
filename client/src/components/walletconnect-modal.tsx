import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wallet, Smartphone, QrCode, X, Loader2, ExternalLink } from "lucide-react";
import { simpleWalletConnect, type SimpleWalletConnectSession } from "@/lib/simple-walletconnect";

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (session: SimpleWalletConnectSession) => void;
  isLoading?: boolean;
}

export default function WalletConnectModal({ 
  isOpen, 
  onClose, 
  onConnect,
  isLoading = false 
}: WalletConnectModalProps) {
  const [connectionState, setConnectionState] = useState<'initial' | 'connecting' | 'qr-shown' | 'waiting'>('initial');
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleConnect = async () => {
    try {
      setConnectionState('connecting');
      setErrorMessage("");

      console.log("Initiating WalletConnect connection...");
      
      // Initialize and connect
      const session = await simpleWalletConnect.connect({
        onError: (error) => {
          setErrorMessage(error.message);
          setConnectionState('initial');
        }
      });
      
      setConnectionState('initial');
      onConnect(session);
      onClose();

    } catch (error: any) {
      console.error("WalletConnect connection failed:", error);
      setErrorMessage(error.message || "Failed to connect wallet");
      setConnectionState('initial');
    }
  };

  const handleCancel = () => {
    // Disconnect any pending connection
    simpleWalletConnect.disconnect();
    setConnectionState('initial');
    setErrorMessage("");
    onClose();
  };

  const isConnecting = connectionState !== 'initial' || isLoading;

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            <span>Connect with WalletConnect</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info Section */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Scan QR code with a WalletConnect compatible wallet
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="secondary" className="text-xs">Trust Wallet</Badge>
              <Badge variant="secondary" className="text-xs">Rainbow</Badge>
              <Badge variant="secondary" className="text-xs">Coinbase Wallet</Badge>
              <Badge variant="secondary" className="text-xs">MetaMask Mobile</Badge>
            </div>
          </div>

          {/* Connection State Display */}
          {connectionState === 'initial' && !isLoading && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center">
                    <QrCode className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground mb-1">Ready to Connect</h3>
                    <p className="text-sm text-muted-foreground">
                      Click the button below to generate a QR code for your wallet app
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Connecting State */}
          {isConnecting && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground mb-1">
                      {connectionState === 'connecting' ? 'Initializing...' : 'Waiting for Connection'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {connectionState === 'connecting' 
                        ? 'Setting up WalletConnect session...'
                        : 'Scan the QR code with your wallet app and approve the connection'
                      }
                    </p>
                  </div>

                  {connectionState === 'waiting' && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                      <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                        <Smartphone className="h-4 w-4" />
                        <span className="text-xs font-medium">QR Code displayed in popup</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {errorMessage && (
            <Card className="border-red-200 dark:border-red-800">
              <CardContent className="pt-4">
                <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                  <X className="h-4 w-4" />
                  <span className="text-sm font-medium">Connection Failed</span>
                </div>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errorMessage}</p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            <Button
              onClick={handleCancel}
              variant="outline"
              className="flex-1"
              disabled={isConnecting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              {isConnecting ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Connecting...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <QrCode className="h-4 w-4" />
                  <span>Show QR Code</span>
                </div>
              )}
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Don't have a compatible wallet? {" "}
              <a 
                href="https://walletconnect.com/wallets" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center"
              >
                View supported wallets
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}