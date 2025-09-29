import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, Loader2, Wallet, Shield } from "lucide-react";
import coynLogoPath from "@assets/COYN symbol square_1759099649514.png";

interface SignatureRequest {
  id: string;
  type: 'personal_sign' | 'eth_sign' | 'typed_data' | 'transaction';
  message: string;
  address: string;
  chainId: number;
  metadata?: {
    domain?: string;
    value?: string;
    gasLimit?: string;
    gasPrice?: string;
  };
}

interface SignatureConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  signatureRequest: SignatureRequest | null;
  onApprove: (requestId: string) => Promise<void>;
  onReject: (requestId: string) => void;
  walletName?: string;
}

export default function SignatureConfirmationModal({
  isOpen,
  onClose,
  signatureRequest,
  onApprove,
  onReject,
  walletName = "Wallet"
}: SignatureConfirmationModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const handleApprove = async () => {
    if (!signatureRequest) return;
    
    setIsProcessing(true);
    setStatus('pending');
    
    try {
      await onApprove(signatureRequest.id);
      setStatus('approved');
      
      // Auto close after success
      setTimeout(() => {
        onClose();
        setStatus('pending');
        setIsProcessing(false);
      }, 1500);
    } catch (error) {
      console.error('Signature approval failed:', error);
      setIsProcessing(false);
      setStatus('pending');
    }
  };

  const handleReject = () => {
    if (!signatureRequest) return;
    
    setStatus('rejected');
    onReject(signatureRequest.id);
    
    // Auto close after rejection
    setTimeout(() => {
      onClose();
      setStatus('pending');
    }, 1000);
  };

  const getActionTitle = () => {
    if (!signatureRequest) return "Signature Request";
    
    switch (signatureRequest.type) {
      case 'personal_sign':
        return "Sign Message";
      case 'eth_sign':
        return "Ethereum Signature";
      case 'typed_data':
        return "Sign Typed Data";
      case 'transaction':
        return "Confirm Transaction";
      default:
        return "Signature Request";
    }
  };

  const getActionDescription = () => {
    if (!signatureRequest) return "";
    
    switch (signatureRequest.type) {
      case 'personal_sign':
        return "Sign this message to verify your wallet ownership";
      case 'eth_sign':
        return "Sign this Ethereum message";
      case 'typed_data':
        return "Sign structured data for this application";
      case 'transaction':
        return "Confirm this blockchain transaction";
      default:
        return "Confirm this signature request";
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isTransaction = signatureRequest?.type === 'transaction';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-orange-200/50 dark:border-orange-500/30">
        <DialogHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <img 
                src={coynLogoPath} 
                alt="COYN" 
                className="w-10 h-10"
              />
            </div>
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
            {getActionTitle()}
          </DialogTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {getActionDescription()}
          </p>
        </DialogHeader>

        {signatureRequest && (
          <div className="space-y-4">
            {/* Wallet Info */}
            <Card className="border-gray-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Wallet className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {walletName}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {formatAddress(signatureRequest.address)}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Network
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {signatureRequest.chainId === 56 ? 'BSC Mainnet' : `Chain ${signatureRequest.chainId}`}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Message/Transaction Details */}
            <Card className="border-gray-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {isTransaction ? 'Transaction Details' : 'Message'}
                    </span>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 max-h-32 overflow-y-auto">
                    <code className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all">
                      {signatureRequest.message}
                    </code>
                  </div>

                  {/* Transaction specific details */}
                  {isTransaction && signatureRequest.metadata && (
                    <div className="space-y-2 mt-3 border-t border-gray-200 dark:border-slate-700 pt-3">
                      {signatureRequest.metadata.value && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Value:</span>
                          <span className="text-gray-900 dark:text-white font-mono">
                            {signatureRequest.metadata.value} BNB
                          </span>
                        </div>
                      )}
                      {signatureRequest.metadata.gasLimit && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Gas Limit:</span>
                          <span className="text-gray-900 dark:text-white font-mono">
                            {signatureRequest.metadata.gasLimit}
                          </span>
                        </div>
                      )}
                      {signatureRequest.metadata.gasPrice && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Gas Price:</span>
                          <span className="text-gray-900 dark:text-white font-mono">
                            {signatureRequest.metadata.gasPrice} Gwei
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {status === 'pending' && (
              <div className="flex space-x-3">
                <Button
                  onClick={handleReject}
                  variant="outline"
                  className="flex-1 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                  disabled={isProcessing}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={handleApprove}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {isTransaction ? 'Confirm Transaction' : 'Sign Message'}
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Status Messages */}
            {status === 'approved' && (
              <div className="text-center py-4">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  {isTransaction ? 'Transaction Confirmed!' : 'Message Signed!'}
                </p>
              </div>
            )}

            {status === 'rejected' && (
              <div className="text-center py-4">
                <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  {isTransaction ? 'Transaction Rejected' : 'Signature Rejected'}
                </p>
              </div>
            )}

            {/* Security Notice */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Shield className="h-4 w-4 text-blue-500 mt-0.5" />
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">Security Notice</p>
                  <p>
                    This signature request is processed securely within COYN Messenger. 
                    Your private keys never leave your wallet.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}