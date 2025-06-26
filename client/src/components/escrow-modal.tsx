import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Escrow, User, WalletBalance } from "@shared/schema";
import { Shield, Clock, CheckCircle, XCircle, Plus, DollarSign } from "lucide-react";

interface EscrowModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: number;
  otherUser: User;
}

export default function EscrowModal({ isOpen, onClose, conversationId, otherUser }: EscrowModalProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [initiatorCurrency, setInitiatorCurrency] = useState("COYN");
  const [participantCurrency, setParticipantCurrency] = useState("BTC");
  const [initiatorAmount, setInitiatorAmount] = useState("");
  const [participantAmount, setParticipantAmount] = useState("");
  const [description, setDescription] = useState("");
  const [fundingAmount, setFundingAmount] = useState("");
  const [selectedEscrow, setSelectedEscrow] = useState<number | null>(null);
  const [createStep, setCreateStep] = useState<"form" | "review" | "confirm">("form");
  const [fundStep, setFundStep] = useState<"amount" | "review" | "confirm">("amount");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: escrows = [] } = useQuery<Escrow[]>({
    queryKey: ["/api/conversations", conversationId, "escrows"],
    enabled: isOpen,
  });

  const { data: balances = [] } = useQuery<WalletBalance[]>({
    queryKey: ["/api/wallet/balances"],
    enabled: isOpen,
  });

  const createEscrowMutation = useMutation({
    mutationFn: async (escrowData: any) => {
      return apiRequest("POST", "/api/escrows", escrowData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "escrows"] });
      setShowCreateForm(false);
      setInitiatorAmount("");
      setParticipantAmount("");
      setDescription("");
      toast({
        title: "🎉 Escrow created",
        description: "Escrow agreement has been created successfully! 🚀",
      });
    },
    onError: () => {
      toast({
        title: "❌ Failed to create escrow",
        description: "Please try again. 🔄",
        variant: "destructive",
      });
    },
  });

  const fundEscrowMutation = useMutation({
    mutationFn: async ({ escrowId, amount }: { escrowId: number; amount: string }) => {
      return apiRequest("POST", `/api/escrows/${escrowId}/fund`, { amount });
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "escrows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balances"] });
      resetFundForm();
      
      toast({
        title: "Funds Added Successfully",
        description: `Your ${variables.amount} has been added to the escrow. Waiting for ${otherUser.displayName} to fund their portion.`,
      });
      
      setTimeout(() => {
        toast({
          title: "Waiting for Counter-Party",
          description: `${otherUser.displayName} will be notified to fund their portion of the escrow.`,
        });
      }, 2000);
    },
    onError: () => {
      setFundStep("review");
      toast({
        title: "Failed to add funds",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const cancelEscrowMutation = useMutation({
    mutationFn: async (escrowId: number) => {
      return apiRequest("POST", `/api/escrows/${escrowId}/cancel`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "escrows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balances"] });
      toast({
        title: "🚫 Escrow cancelled",
        description: "Escrow has been cancelled and funds returned. 💸",
      });
    },
    onError: () => {
      toast({
        title: "❌ Failed to cancel escrow",
        description: "Please try again. 🔄",
        variant: "destructive",
      });
    },
  });

  const handleCreateEscrow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!initiatorAmount || !participantAmount || !initiatorCurrency || !participantCurrency) return;
    if (initiatorCurrency === participantCurrency) {
      toast({
        title: "⚠️ Invalid currencies",
        description: "Both parties must use different currencies for the trade! 🔄",
        variant: "destructive",
      });
      return;
    }

    createEscrowMutation.mutate({
      conversationId,
      participantId: otherUser.id,
      initiatorCurrency,
      participantCurrency,
      initiatorRequiredAmount: initiatorAmount,
      participantRequiredAmount: participantAmount,
      description,
    });
  };

  const handleFundEscrow = (escrowId: number) => {
    if (!fundingAmount) return;
    
    if (fundStep === "amount") {
      setFundStep("review");
    } else if (fundStep === "review") {
      setFundStep("confirm");
    } else {
      fundEscrowMutation.mutate({ escrowId, amount: fundingAmount });
    }
  };

  const resetFundForm = () => {
    setFundStep("amount");
    setFundingAmount("");
    setSelectedEscrow(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>;
      case "funded":
        return <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
          <DollarSign className="h-3 w-3 mr-1" />
          Funded
        </Badge>;
      case "released":
        return <Badge variant="secondary" className="bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400">
          <CheckCircle className="h-3 w-3 mr-1" />
          Released
        </Badge>;
      case "cancelled":
        return <Badge variant="secondary" className="bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
          <XCircle className="h-3 w-3 mr-1" />
          Cancelled
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatAmount = (amount: string | null) => {
    return amount ? parseFloat(amount).toFixed(4) : "0.0000";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-black dark:text-slate-50 max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-orange-500 dark:text-cyan-400 text-xl font-bold flex items-center">
            <Shield className="h-6 w-6 mr-2" />
            Escrow Manager
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create New Escrow Button */}
          {!showCreateForm && (
            <Button
              onClick={() => setShowCreateForm(true)}
              className="w-full bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Escrow
            </Button>
          )}

          {/* Create Escrow Form */}
          {showCreateForm && (
            <Card className="bg-slate-700 border-slate-600">
              <CardHeader>
                <CardTitle className="text-lg">🔄 Create Trade Escrow</CardTitle>
                <p className="text-sm text-slate-400">
                  Set up a trade where you and {otherUser.displayName} exchange different currencies 💱
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateEscrow} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-cyan-400">💎 Your Offer</Label>
                      <Select value={initiatorCurrency} onValueChange={setInitiatorCurrency}>
                        <SelectTrigger className="bg-slate-800 border-slate-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {balances.map((balance) => (
                            <SelectItem key={balance.currency} value={balance.currency}>
                              {balance.currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.0001"
                        placeholder="Amount you'll deposit 💎"
                        value={initiatorAmount}
                        onChange={(e) => setInitiatorAmount(e.target.value)}
                        className="bg-slate-800 border-slate-600"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-purple-400">🎯 {otherUser.displayName}'s Offer</Label>
                      <Select value={participantCurrency} onValueChange={setParticipantCurrency}>
                        <SelectTrigger className="bg-slate-800 border-slate-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {balances.map((balance) => (
                            <SelectItem key={balance.currency} value={balance.currency}>
                              {balance.currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.0001"
                        placeholder="Amount they'll deposit 🎯"
                        value={participantAmount}
                        onChange={(e) => setParticipantAmount(e.target.value)}
                        className="bg-slate-800 border-slate-600"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">📝 Description (optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="What is this escrow for? 💭"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="bg-slate-800 border-slate-600"
                      rows={3}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      type="submit"
                      className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-900"
                      disabled={createEscrowMutation.isPending}
                    >
                      {createEscrowMutation.isPending ? "Creating... ⏳" : "Create Escrow 🚀"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowCreateForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Existing Escrows */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-300">📋 Active Escrows</h3>
            {escrows.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">
                No escrow agreements found 🕳️
              </p>
            ) : (
              escrows.map((escrow) => (
                <Card key={escrow.id} className="bg-slate-700 border-slate-600">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-cyan-400">{formatAmount(escrow.initiatorRequiredAmount)} {escrow.initiatorCurrency}</span>
                          <span className="text-slate-400">🔄</span>
                          <span className="font-medium text-purple-400">{formatAmount(escrow.participantRequiredAmount)} {escrow.participantCurrency}</span>
                          {getStatusBadge(escrow.status)}
                        </div>
                        {escrow.description && (
                          <p className="text-sm text-slate-400">{escrow.description}</p>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(escrow.createdAt!).toLocaleDateString()}
                      </div>
                    </div>

                    {(escrow.status === "pending" || escrow.status === "funded") && (
                      <div>
                        <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                          <div className="space-y-2">
                            <span className="text-gray-600 dark:text-slate-400">Your {escrow.initiatorCurrency}:</span>
                            <div className="font-mono text-orange-600 dark:text-cyan-400">
                              {formatAmount(escrow.initiatorAmount)} / {formatAmount(escrow.initiatorRequiredAmount)}
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-orange-500 dark:bg-cyan-400 h-2 rounded-full transition-all" 
                                style={{
                                  width: `${Math.min(100, (parseFloat(escrow.initiatorAmount || "0") / parseFloat(escrow.initiatorRequiredAmount)) * 100)}%`
                                }}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <span className="text-gray-600 dark:text-slate-400">{otherUser.displayName}'s {escrow.participantCurrency}:</span>
                            <div className="font-mono text-orange-600 dark:text-purple-400">
                              {formatAmount(escrow.participantAmount)} / {formatAmount(escrow.participantRequiredAmount)}
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-orange-500 dark:bg-purple-400 h-2 rounded-full transition-all" 
                                style={{
                                  width: `${Math.min(100, (parseFloat(escrow.participantAmount || "0") / parseFloat(escrow.participantRequiredAmount)) * 100)}%`
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {escrow.status === "pending" && parseFloat(escrow.initiatorAmount || "0") < parseFloat(escrow.initiatorRequiredAmount) && (
                          <div className="flex space-x-2 mb-2">
                            <Input
                              type="number"
                              step="0.0001"
                              placeholder={`Add ${escrow.initiatorCurrency} funds`}
                              value={selectedEscrow === escrow.id ? fundingAmount : ""}
                              onChange={(e) => {
                                setSelectedEscrow(escrow.id);
                                setFundingAmount(e.target.value);
                              }}
                              className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-sm"
                            />
                            <Button
                              onClick={() => handleFundEscrow(escrow.id)}
                              disabled={!fundingAmount || fundEscrowMutation.isPending}
                              size="sm"
                              className="bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-900"
                            >
                              Add Funds
                            </Button>
                          </div>
                        )}

                        {escrow.status === "funded" && (
                          <div className="mb-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <p className="text-sm text-green-700 dark:text-green-400 mb-2">
                              Both parties have funded! Ready to complete trade.
                            </p>
                            <Button
                              onClick={() => releaseEscrowMutation.mutate(escrow.id)}
                              disabled={releaseEscrowMutation.isPending}
                              size="sm"
                              className="w-full bg-green-600 hover:bg-green-700 text-white"
                            >
                              {releaseEscrowMutation.isPending ? "Releasing..." : "Complete Trade"}
                            </Button>
                          </div>
                        )}

                        {escrow.status === "pending" && (
                          <Button
                            onClick={() => cancelEscrowMutation.mutate(escrow.id)}
                            variant="destructive"
                            size="sm"
                            disabled={cancelEscrowMutation.isPending}
                            className="w-full"
                          >
                            Cancel Escrow
                          </Button>
                        )}
                      </div>
                    )}

                    {escrow.status === "released" && escrow.releasedAt && (
                      <p className="text-sm text-green-400">
                        🎉 Released on {new Date(escrow.releasedAt).toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}