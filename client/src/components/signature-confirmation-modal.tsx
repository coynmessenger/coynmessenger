import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Shield, AlertTriangle, Copy, Check } from "lucide-react";
import coynLogoPath from "@assets/COYN symbol square_1759099649514.png";

interface SignatureRequest {
  type: 'connect' | 'transaction' | 'message';
  title: string;
  description: string;
  details?: {
    to?: string;
    value?: string;
    gasLimit?: string;
    gasPrice?: string;
    data?: string;
    message?: string;
  };
  walletAddress?: string;
  chainId?: number;
}

interface SignatureConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onReject: () => void;
  signatureRequest: SignatureRequest | null;
  isLoading?: boolean;
}

export default function SignatureConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  onReject,
  signatureRequest,
  isLoading = false
}: SignatureConfirmationModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!signatureRequest) return null;

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getIconAndColor = () => {
    switch (signatureRequest.type) {
      case 'connect':
        return { icon: Shield, color: 'text-blue-500', bgColor: 'bg-blue-500/10' };
      case 'transaction':
        return { icon: AlertTriangle, color: 'text-orange-500', bgColor: 'bg-orange-500/10' };
      case 'message':
        return { icon: Shield, color: 'text-green-500', bgColor: 'bg-green-500/10' };
      default:
        return { icon: Shield, color: 'text-gray-500', bgColor: 'bg-gray-500/10' };
    }
  };

  const { icon: Icon, color, bgColor } = getIconAndColor();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-2xl">
        <DialogHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img 
              src={coynLogoPath} 
              alt="COYN" 
              className="w-12 h-12"
            />
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
            {signatureRequest.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Request Type Badge */}
          <div className="flex justify-center">
            <Badge 
              variant="secondary" 
              className={`${bgColor} ${color} border-0 px-3 py-1 flex items-center gap-2`}
            >
              <Icon className="h-4 w-4" />
              {signatureRequest.type.charAt(0).toUpperCase() + signatureRequest.type.slice(1)} Request
            </Badge>
          </div>

          {/* Description */}
          <Card className="border border-gray-200 dark:border-slate-700">
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {signatureRequest.description}
              </p>
            </CardContent>
          </Card>

          {/* Wallet Info */}
          {signatureRequest.walletAddress && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Connected Wallet
              </h4>
              <div 
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                onClick={() => copyToClipboard(signatureRequest.walletAddress!, 'address')}
              >
                <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                  {formatAddress(signatureRequest.walletAddress)}
                </span>
                {copiedField === 'address' ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>
          )}

          {/* Transaction Details */}
          {signatureRequest.details && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                Request Details
              </h4>
              <div className="space-y-2">
                {signatureRequest.details.to && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 dark:text-gray-400">To:</span>
                    <div 
                      className="flex items-center gap-1 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                      onClick={() => copyToClipboard(signatureRequest.details!.to!, 'to')}
                    >
                      <span className="font-mono">{formatAddress(signatureRequest.details.to)}</span>
                      {copiedField === 'to' ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                  </div>
                )}
                {signatureRequest.details.value && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Value:</span>
                    <span className="font-mono">{signatureRequest.details.value} ETH</span>
                  </div>
                )}
                {signatureRequest.details.gasLimit && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Gas Limit:</span>
                    <span className="font-mono">{signatureRequest.details.gasLimit}</span>
                  </div>
                )}
                {signatureRequest.details.message && (
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Message:</span>
                    <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded text-xs font-mono break-all">
                      {signatureRequest.details.message}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                Security Notice
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Only confirm if you trust this request. This action cannot be undone.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={onReject}
              disabled={isLoading}
              className="h-12 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isLoading}
              className="h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Confirming...
                </div>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}