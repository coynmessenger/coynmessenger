import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { UserPlus, Wallet } from "lucide-react";
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
      return apiRequest("POST", "/api/contacts/add", { 
        walletAddress
      });
    },
    onSuccess: async (newUser: User) => {
      // Invalidate all relevant queries to refresh the UI
      await queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      
      // Refetch conversations immediately to ensure new contact appears
      await queryClient.refetchQueries({ queryKey: ["/api/conversations"] });
      
      setWalletAddress("");
      onClose();
    },
  });

  // Validate wallet address format
  const validateWalletAddress = (address: string): boolean => {
    // Must be 42 characters (0x + 40 hex characters)
    if (address.length !== 42 || !address.startsWith('0x')) {
      return false;
    }
    // Check if the remaining 40 characters are valid hex
    const hexPart = address.slice(2);
    return /^[0-9a-fA-F]{40}$/.test(hexPart);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setWalletAddress(value);
    
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError("");
    }
    
    // Validate if user has entered something
    if (value.trim() && !validateWalletAddress(value.trim())) {
      setValidationError("Please enter a valid wallet address");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedAddress = walletAddress.trim();
    
    if (!trimmedAddress) {
      setValidationError("Wallet address is required");
      return;
    }
    
    if (!validateWalletAddress(trimmedAddress)) {
      setValidationError("Please enter a valid wallet address");
      return;
    }
    
    addContactMutation.mutate({ walletAddress: trimmedAddress });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-black dark:text-slate-50 max-w-md">
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
                className={`pl-10 bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-black dark:text-white focus:border-orange-500 dark:focus:border-cyan-500 ${
                  validationError ? 'border-red-500 dark:border-red-400' : ''
                }`}
                required
              />
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