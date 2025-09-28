import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, AlertTriangle, Check } from "lucide-react";
import coynLogoPath from "@assets/COYN symbol square_1759099649514.png";

interface SignatureRequest {
  id: string;
  type: 'connect' | 'transaction' | 'message';
  title: string;
  description: string;
  details?: {
    amount?: string;
    token?: string;
    recipient?: string;
    message?: string;
    domain?: string;
  };
  wallet: {
    name: string;
    address: string;
    icon?: string;
  };
}

interface SignatureConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  signatureRequest: SignatureRequest | null;
  onConfirm: () => Promise<void>;
  onReject: () => void;
  isLoading?: boolean;
}

export default function SignatureConfirmationModal({
  isOpen,
  onClose,
  signatureRequest,
  onConfirm,
  onReject,
  isLoading = false
}: SignatureConfirmationModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsProcessing(true);
      await onConfirm();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = () => {
    onReject();
    onClose();
  };

  if (!signatureRequest) return null;

  const getIconForType = () => {
    switch (signatureRequest.type) {
      case 'connect':
        return <Shield className="w-6 h-6 text-green-500" />;
      case 'transaction':
        return <AlertTriangle className="w-6 h-6 text-orange-500" />;
      case 'message':
        return <Check className="w-6 h-6 text-blue-500" />;
      default:
        return <Shield className="w-6 h-6 text-gray-500" />;
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-slate-700/50 shadow-2xl">
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="relative">
              <img 
                src={coynLogoPath} 
                alt="COYN" 
                className="w-12 h-12 rounded-full"
              />
              <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-1">
                {getIconForType()}
              </div>
            </div>
          </div>
          
          <DialogTitle className="text-center text-xl font-semibold text-gray-900 dark:text-white">
            {signatureRequest.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Request Description */}
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {signatureRequest.description}
            </p>
          </div>

          {/* Wallet Info */}
          <div className="bg-gray-50/80 dark:bg-slate-800/80 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Wallet
              </span>
              <span className="text-sm text-gray-900 dark:text-white font-medium">
                {signatureRequest.wallet.name}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Address
              </span>
              <span className="text-sm text-gray-900 dark:text-white font-mono">
                {formatAddress(signatureRequest.wallet.address)}
              </span>
            </div>
          </div>

          {/* Transaction Details (if applicable) */}
          {signatureRequest.details && signatureRequest.type === 'transaction' && (
            <div className="bg-orange-50/80 dark:bg-orange-900/20 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Transaction Details
              </h4>
              
              {signatureRequest.details.amount && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                    Amount
                  </span>
                  <span className="text-sm text-orange-900 dark:text-orange-100 font-mono">
                    {signatureRequest.details.amount} {signatureRequest.details.token || 'BNB'}
                  </span>
                </div>
              )}
              
              {signatureRequest.details.recipient && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                    To
                  </span>
                  <span className="text-sm text-orange-900 dark:text-orange-100 font-mono">
                    {formatAddress(signatureRequest.details.recipient)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Message Details (if applicable) */}
          {signatureRequest.details?.message && signatureRequest.type === 'message' && (
            <div className="bg-blue-50/80 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                Message to Sign
              </h4>
              <div className="bg-white/60 dark:bg-slate-800/60 rounded p-3">
                <code className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-all">
                  {signatureRequest.details.message}
                </code>
              </div>
            </div>
          )}

          {/* Security Warning */}
          <div className="bg-yellow-50/80 dark:bg-yellow-900/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-yellow-800 dark:text-yellow-200">
                <p className="font-medium mb-1">Security Notice</p>
                <p>Only confirm if you trust this action. This signature cannot be undone.</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={isProcessing || isLoading}
              className="flex-1 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800"
              data-testid="button-reject-signature"
            >
              Reject
            </Button>
            
            <Button
              onClick={handleConfirm}
              disabled={isProcessing || isLoading}
              className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0"
              data-testid="button-confirm-signature"
            >
              {isProcessing || isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}