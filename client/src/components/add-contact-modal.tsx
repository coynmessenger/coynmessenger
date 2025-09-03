import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { UserPlus, Wallet, CheckCircle, AlertCircle, Sparkles, Users } from "lucide-react";
import { ethers } from "ethers";
import type { User } from "@shared/schema";

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddContactModal({ isOpen, onClose }: AddContactModalProps) {
  const [walletAddress, setWalletAddress] = useState("");
  const [validationError, setValidationError] = useState("");
  const queryClient = useQueryClient();

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
      <DialogContent className="bg-gradient-to-br from-white via-orange-50/30 to-amber-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 border-orange-200/50 dark:border-slate-600/50 text-black dark:text-slate-50 max-w-lg shadow-2xl backdrop-blur-sm">
        <DialogHeader className="text-center pb-6">
          <div className="mx-auto mb-4 p-3 bg-gradient-to-br from-orange-500 to-amber-500 dark:from-cyan-500 dark:to-blue-500 rounded-full w-16 h-16 flex items-center justify-center shadow-lg">
            <Users className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
            Add New Contact
          </DialogTitle>
          <p className="text-gray-600 dark:text-slate-400 mt-2 text-sm">
            Connect with friends using their wallet address
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="walletAddress" className="text-gray-800 dark:text-slate-200 font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-orange-500 dark:text-cyan-400" />
              Wallet Address *
            </Label>
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-500 dark:from-cyan-500 dark:to-blue-500 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
              <div className="relative">
                <Wallet className="absolute left-4 top-1/2 transform -translate-y-1/2 text-orange-500 dark:text-cyan-400 h-5 w-5 z-10" />
                <Input
                  id="walletAddress"
                  type="text"
                  placeholder="0x1234567890abcdef1234567890abcdef12345678"
                  value={walletAddress}
                  onChange={handleInputChange}
                  className={`pl-12 pr-14 py-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-orange-200 dark:border-slate-600 text-black dark:text-white focus:border-orange-500 dark:focus:border-cyan-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-cyan-200/20 rounded-lg transition-all duration-300 shadow-sm hover:shadow-md ${
                    validationError ? 'border-red-400 dark:border-red-400 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-200/20' : walletAddress.trim() && validateWalletAddress(walletAddress.trim()).isValid ? 'border-green-400 dark:border-green-400 focus:border-green-500 focus:ring-green-200 dark:focus:ring-green-200/20' : ''
                  }`}
                  required
                />
                {/* Real-time validation status icon */}
                {walletAddress.trim() && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10">
                    {validateWalletAddress(walletAddress.trim()).isValid ? (
                      <div className="relative">
                        <CheckCircle className="h-6 w-6 text-green-500 dark:text-green-400" />
                        <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
                      </div>
                    ) : (
                      <AlertCircle className="h-6 w-6 text-red-500 dark:text-red-400 animate-pulse" />
                    )}
                  </div>
                )}
              </div>
            </div>
            {validationError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-3 mt-2">
                <p className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {validationError}
                </p>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-slate-800/50 dark:to-slate-700/50 rounded-lg p-4 border border-orange-100 dark:border-slate-700">
            <p className="text-sm text-gray-700 dark:text-slate-300 flex items-start gap-2">
              <div className="w-2 h-2 bg-orange-400 dark:bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
              The contact's existing profile name will be used automatically, or their wallet ID if no profile exists.
            </p>
          </div>

          <div className="flex space-x-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-700 py-3 font-medium transition-all duration-200 hover:scale-105"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addContactMutation.isPending || !walletAddress.trim()}
              className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 dark:from-cyan-500 dark:to-blue-500 dark:hover:from-cyan-400 dark:hover:to-blue-400 text-white dark:text-slate-900 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {addContactMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Adding...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add Contact
                </div>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}