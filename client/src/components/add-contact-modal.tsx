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
      <DialogContent className="sm:max-w-[380px] p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 overflow-hidden rounded-2xl gap-0 shadow-2xl [&>button[class*='absolute']]:hidden">
        {/* Top Section with Icon and Gradient Background */}
        <div className="relative px-6 pt-8 pb-6 text-center bg-gradient-to-b from-orange-50 dark:from-orange-950/30 to-transparent">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-orange-100 dark:bg-orange-900/50 shadow-lg shadow-orange-200/50 dark:shadow-orange-900/30 border border-orange-200 dark:border-orange-700">
            <UserPlus className="w-8 h-8 text-orange-500" />
          </div>
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Add New Contact
          </DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enter a wallet address to add a new contact
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-5 pt-4">
          {/* QR Scanner Section */}
          {isScanning ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Scanning for QR Code...
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={stopScanner}
                  className="h-8 w-8 p-0 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div 
                id="qr-reader" 
                className="w-full rounded-xl overflow-hidden bg-black"
                style={{ minHeight: "280px" }}
              />
              {scanError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600 dark:text-red-400">{scanError}</p>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Point your camera at a wallet QR code
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Wallet Address Input */}
              <div className="space-y-2">
                <Label htmlFor="walletAddress" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Wallet Address
                </Label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-400 h-4 w-4" />
                  <Input
                    id="walletAddress"
                    type="text"
                    placeholder="0x1234567890abcdef1234567890abcdef12345678"
                    value={walletAddress}
                    onChange={handleInputChange}
                    className={`pl-10 pr-12 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors ${
                      validationError ? 'border-red-500' : walletAddress.trim() && validateWalletAddress(walletAddress.trim()).isValid ? 'border-green-500' : ''
                    }`}
                    required
                  />
                  {/* Real-time validation status icon */}
                  {walletAddress.trim() && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {validateWalletAddress(walletAddress.trim()).isValid ? (
                        <CheckCircle className="h-5 w-5 text-orange-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {validationError && (
                  <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-600 dark:text-red-400">{validationError}</p>
                  </div>
                )}
              </div>

              {/* QR Code Scanner Button as Row Item */}
              <button
                type="button"
                onClick={startScanner}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-orange-50 dark:bg-orange-900/30">
                  <QrCode className="w-[18px] h-[18px] text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Scan QR Code</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Use your camera to scan</div>
                </div>
              </button>

              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                The contact's existing profile name will be used automatically, or their wallet ID if no profile exists.
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
            <Button
              onClick={handleSubmit}
              disabled={addContactMutation.isPending || !walletAddress.trim() || isScanning}
              className="w-full h-12 rounded-xl font-semibold text-sm shadow-lg transition-all bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 shadow-orange-300/30 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addContactMutation.isPending ? "Adding..." : "Add Contact"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="w-full h-10 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium text-sm"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}