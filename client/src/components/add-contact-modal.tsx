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
  const [displayName, setDisplayName] = useState("");
  const queryClient = useQueryClient();

  const addContactMutation = useMutation({
    mutationFn: async ({ walletAddress, displayName }: { walletAddress: string; displayName?: string }) => {
      return apiRequest("/api/users/find-or-create", {
        method: "POST",
        body: JSON.stringify({ walletAddress, displayName }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: (newUser: User) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setWalletAddress("");
      setDisplayName("");
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress.trim()) return;
    
    addContactMutation.mutate({
      walletAddress: walletAddress.trim(),
      displayName: displayName.trim() || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-50 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5 text-cyan-400" />
            <span>Add New Contact</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="walletAddress" className="text-slate-300">
              Wallet Address *
            </Label>
            <div className="relative">
              <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                id="walletAddress"
                type="text"
                placeholder="0x1234...abcd"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 focus:border-cyan-500"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-slate-300">
              Display Name (Optional)
            </Label>
            <Input
              id="displayName"
              type="text"
              placeholder="Friend's Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-slate-700 border-slate-600 focus:border-cyan-500"
            />
            <p className="text-xs text-slate-400">
              If empty, will use wallet address as display name
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-slate-600 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addContactMutation.isPending || !walletAddress.trim()}
              className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-900"
            >
              {addContactMutation.isPending ? "Adding..." : "Add Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}