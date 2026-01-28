import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { UserPlus, Wallet, CheckCircle, AlertCircle, QrCode, X, Camera } from "lucide-react";
import { ethers } from "ethers";
import { Html5Qrcode } from "html5-qrcode";
import type { User } from "@shared/schema";

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddContactModal({ isOpen, onClose }: AddContactModalProps) {
  const [walletAddress, setWalletAddress] = useState("");
  const [validationError, setValidationError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const queryClient = useQueryClient();

  // Cleanup scanner when modal closes or scanning stops
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  // Stop scanner when modal closes
  useEffect(() => {
    if (!isOpen && scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
      setIsScanning(false);
    }
  }, [isOpen]);

  const startScanner = async () => {
    // Prevent duplicate scanner instances
    if (scannerRef.current || isScanning) {
      return;
    }
    
    setScanError("");
    setIsScanning(true);
    
    // Small delay to ensure DOM element is rendered
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Extract wallet address from QR code
          let address = decodedText.trim();
          
          // Handle ethereum: URI format
          if (address.toLowerCase().startsWith("ethereum:")) {
            address = address.substring(9);
          }
          
          // Remove any query parameters or additional data
          if (address.includes("@")) {
            address = address.split("@")[0];
          }
          if (address.includes("?")) {
            address = address.split("?")[0];
          }
          
          // Validate it's a proper address
          if (ethers.isAddress(address)) {
            setWalletAddress(address);
            setValidationError("");
            stopScanner();
          } else {
            setScanError("QR code does not contain a valid wallet address");
          }
        },
        () => {
          // QR code not found - this is normal during scanning
        }
      );
    } catch (error: any) {
      console.error("Failed to start QR scanner:", error);
      setScanError(error.message || "Failed to access camera. Please check permissions.");
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        // Ignore stop errors
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setScanError("");
  };

  const addContactMutation = useMutation({
    mutationFn: async ({ walletAddress }: { walletAddress: string }) => {
      // Get current user ID from localStorage
      const storedUser = localStorage.getItem('connectedUser');
      let currentUserId = 5; // fallback
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          currentUserId = parsedUser.id;
        } catch (e) {

        }
      }
      
      return apiRequest("POST", "/api/contacts/add", { 
        walletAddress,
        currentUserId
      });
    },
    onSuccess: (newUser: User) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      // Force refetch of users data
      queryClient.refetchQueries({ queryKey: ["/api/users"] });
      setWalletAddress("");
      onClose();
    },
  });

  // Enhanced wallet address validation using ethers.js
  const validateWalletAddress = (address: string): { isValid: boolean; error?: string } => {
    try {
      // Use ethers.js for comprehensive validation
      if (!address || !address.trim()) {
        return { isValid: false, error: "Wallet address is required" };
      }
      
      // Check if it's a valid address format
      const isValid = ethers.isAddress(address.trim());
      
      if (!isValid) {
        return { isValid: false, error: "Please enter a valid wallet address (42 characters starting with 0x)" };
      }
      
      // Additional check for null address
      if (address.trim().toLowerCase() === "0x0000000000000000000000000000000000000000") {
        return { isValid: false, error: "Null address is not allowed" };
      }
      
      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: "Invalid wallet address format" };
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setWalletAddress(value);
    
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError("");
    }
    
    // Validate if user has entered something
    if (value.trim()) {
      const validation = validateWalletAddress(value.trim());
      if (!validation.isValid) {
        setValidationError(validation.error || "Invalid wallet address");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedAddress = walletAddress.trim();
    
    const validation = validateWalletAddress(trimmedAddress);
    if (!validation.isValid) {
      setValidationError(validation.error || "Invalid wallet address");
      return;
    }
    
    addContactMutation.mutate({ walletAddress: trimmedAddress });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-black dark:text-slate-50 max-w-md my-8 sm:my-16">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5 text-orange-500 dark:text-cyan-400" />
            <span>Add New Contact</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* QR Scanner Section */}
          {isScanning ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-gray-700 dark:text-slate-300 flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Scanning for QR Code...
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={stopScanner}
                  className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div 
                id="qr-reader" 
                className="w-full rounded-lg overflow-hidden bg-black"
                style={{ minHeight: "280px" }}
              />
              {scanError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {scanError}
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-slate-400 text-center">
                Point your camera at a wallet QR code
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="walletAddress" className="text-gray-700 dark:text-slate-300">
                  Wallet Address *
                </Label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-slate-400 h-4 w-4" />
                  <Input
                    id="walletAddress"
                    type="text"
                    placeholder="0x1234567890abcdef1234567890abcdef12345678"
                    value={walletAddress}
                    onChange={handleInputChange}
                    className={`pl-10 pr-12 bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-black dark:text-white focus:border-orange-500 dark:focus:border-cyan-500 ${
                      validationError ? 'border-red-500 dark:border-red-400' : walletAddress.trim() && validateWalletAddress(walletAddress.trim()).isValid ? 'border-green-500 dark:border-green-400' : ''
                    }`}
                    required
                  />
                  {/* Real-time validation status icon */}
                  {walletAddress.trim() && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {validateWalletAddress(walletAddress.trim()).isValid ? (
                        <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
                      )}
                    </div>
                  )}
                </div>
                {validationError && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {validationError}
                  </p>
                )}
              </div>

              {/* QR Code Scanner Button */}
              <Button
                type="button"
                variant="outline"
                onClick={startScanner}
                className="w-full border-orange-500 dark:border-cyan-500 text-orange-500 dark:text-cyan-400 hover:bg-orange-50 dark:hover:bg-cyan-500/10 flex items-center justify-center gap-2"
              >
                <QrCode className="h-5 w-5" />
                Scan QR Code
              </Button>

              <p className="text-sm text-gray-600 dark:text-slate-400">
                The contact's existing profile name will be used automatically, or their wallet ID if no profile exists.
              </p>

              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addContactMutation.isPending || !walletAddress.trim()}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-900"
                >
                  {addContactMutation.isPending ? "Adding..." : "Add Contact"}
                </Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}