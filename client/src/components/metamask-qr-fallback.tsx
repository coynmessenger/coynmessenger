import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { generateMetaMaskQRCode } from "@/lib/qr-generator";
import { QrCode, Smartphone, AlertTriangle, RefreshCw, X } from "lucide-react";
import { walletConnector, ConnectedWallet } from "@/lib/wallet-connector";

interface MetaMaskQRFallbackProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (wallet: ConnectedWallet) => void;
}

export default function MetaMaskQRFallback({ isOpen, onClose, onSuccess }: MetaMaskQRFallbackProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>("");
  const [isRetrying, setIsRetrying] = useState(false);

  // Generate MetaMask QR code
  useEffect(() => {
    if (isOpen) {
      generateQRCode();
    }
  }, [isOpen]);

  const generateQRCode = async () => {
    setIsGenerating(true);
    setError("");
    
    try {
      const currentUrl = window.location.href;
      const qrUrl = await generateMetaMaskQRCode(currentUrl, {
        size: 280,
        color: {
          dark: '#1a1a1a',
          light: '#ffffff'
        }
      });
      setQrCodeUrl(qrUrl);
    } catch (err) {
      console.error('Failed to generate MetaMask QR code:', err);
      setError("Failed to generate QR code. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetryDeepLink = () => {
    setIsRetrying(true);
    
    // Clear the fallback flags
    localStorage.removeItem('metamaskQRFallback');
    localStorage.removeItem('metamaskLinkAttempt');
    
    // Try MetaMask connection again
    walletConnector.connectWallet('metamask').then((wallet) => {
      if (wallet) {
        onSuccess(wallet);
        onClose();
      }
    }).catch((err) => {
      console.error('MetaMask retry failed:', err);
    }).finally(() => {
      setIsRetrying(false);
    });
  };

  const handleClose = () => {
    // Clear fallback state
    localStorage.removeItem('metamaskQRFallback');
    localStorage.removeItem('pendingWalletConnection');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-md mx-auto p-0 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-black dark:text-white flex items-center gap-2">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <QrCode className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              MetaMask Connection
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 pt-0 space-y-6">
          {/* Issue Explanation */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  MetaMask Deep Link Issue
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed">
                  MetaMask mobile has known issues with deep links on some devices. 
                  Use the QR code below as an alternative connection method.
                </p>
              </div>
            </div>
          </div>

          {/* QR Code Display */}
          <Card className="border border-gray-200 dark:border-slate-600">
            <CardContent className="p-6 text-center space-y-4">
              <h3 className="font-medium text-black dark:text-white">
                Scan with MetaMask
              </h3>
              
              <div className="flex justify-center">
                {isGenerating ? (
                  <div className="w-[280px] h-[280px] bg-gray-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                    <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
                  </div>
                ) : error ? (
                  <div className="w-[280px] h-[280px] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                      <Button 
                        size="sm" 
                        onClick={generateQRCode}
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                ) : qrCodeUrl ? (
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <img 
                      src={qrCodeUrl} 
                      alt="MetaMask Connection QR Code" 
                      className="w-[280px] h-[280px]"
                    />
                  </div>
                ) : null}
              </div>

              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2 justify-center">
                  <Smartphone className="h-4 w-4 flex-shrink-0" />
                  <span>Open MetaMask app → Tap Browser → Scan QR code</span>
                </div>
                <p className="text-xs leading-relaxed">
                  This will open COYN Messenger directly in MetaMask's browser, 
                  allowing you to connect your wallet properly.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleRetryDeepLink}
              disabled={isRetrying}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isRetrying ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Retry Deep Link
            </Button>
            
            <Button
              variant="outline"
              onClick={handleClose}
              className="w-full border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}