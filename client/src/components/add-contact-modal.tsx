import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { UserPlus, Wallet, CheckCircle, AlertCircle } from "lucide-react";
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
      <DialogContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-black dark:text-slate-50 max-w-md my-8 sm:my-16">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5 text-orange-500 dark:text-cyan-400" />
            <span>Add New Contact</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
        </form>
      </DialogContent>
    </Dialog>
  );
}