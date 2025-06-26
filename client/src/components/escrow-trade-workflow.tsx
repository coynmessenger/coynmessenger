import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Shield, Clock, CheckCircle, AlertTriangle, ArrowRight, DollarSign, Zap } from "lucide-react";
import { FaBitcoin } from "react-icons/fa";
import { SiBinance, SiTether } from "react-icons/si";
import coynLogoPath from "@assets/COYN-symbol-square_1750891892214.png";
import type { User, Escrow } from "@shared/schema";

interface EscrowTradeWorkflowProps {
  isOpen: boolean;
  onClose: () => void;
  escrow: Escrow;
  currentUser: User;
  otherUser: User;
}

export default function EscrowTradeWorkflow({ 
  isOpen, 
  onClose, 
  escrow, 
  currentUser, 
  otherUser 
}: EscrowTradeWorkflowProps) {
  const [fundingAmount, setFundingAmount] = useState("");
  const [confirmationStep, setConfirmationStep] = useState<"review" | "confirm">("review");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Determine user role in this escrow
  const isInitiator = escrow.initiatorId === currentUser.id;
  const userCurrency = isInitiator ? escrow.initiatorCurrency : escrow.participantCurrency;
  const userRequiredAmount = isInitiator ? escrow.initiatorRequiredAmount : escrow.participantRequiredAmount;
  const userCurrentAmount = isInitiator ? escrow.initiatorAmount : escrow.participantAmount;
  const otherCurrency = isInitiator ? escrow.participantCurrency : escrow.initiatorCurrency;
  const otherRequiredAmount = isInitiator ? escrow.participantRequiredAmount : escrow.initiatorRequiredAmount;
  const otherCurrentAmount = isInitiator ? escrow.participantAmount : escrow.initiatorAmount;

  const fundEscrowMutation = useMutation({
    mutationFn: async (data: { escrowId: number; amount: string }) => {
      return await apiRequest("POST", `/api/escrows/${data.escrowId}/fund`, {
        amount: data.amount
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", escrow.conversationId, "escrows"] });
      toast({
        title: "Funds Added",
        description: `Successfully added ${fundingAmount} ${userCurrency} to escrow`,
      });
      setFundingAmount("");
    },
    onError: () => {
      toast({
        title: "Funding Failed",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const releaseEscrowMutation = useMutation({
    mutationFn: async (escrowId: number) => {
      return await apiRequest("POST", `/api/escrows/${escrowId}/release`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", escrow.conversationId, "escrows"] });
      toast({
        title: "Escrow Released",
        description: "Trade completed successfully!",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Release Failed",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const requestReleaseMutation = useMutation({
    mutationFn: async (escrowId: number) => {
      return await apiRequest("POST", `/api/escrows/${escrowId}/request-release`);
    },
    onSuccess: () => {
      toast({
        title: "Release Requested",
        description: `Notified ${otherUser.displayName} to confirm release`,
      });
    },
  });

  const getCurrencyIcon = (currency: string) => {
    switch (currency) {
      case "BTC": return <FaBitcoin className="h-5 w-5 text-orange-500" />;
      case "BNB": return <SiBinance className="h-5 w-5 text-yellow-500" />;
      case "USDT": return <SiTether className="h-5 w-5 text-green-500" />;
      case "COYN": return <img src={coynLogoPath} alt="COYN" className="h-5 w-5 rounded-full" />;
      default: return <DollarSign className="h-5 w-5" />;
    }
  };

  const formatAmount = (amount: string | undefined) => {
    if (!amount) return "0.0000";
    return parseFloat(amount).toFixed(4);
  };

  const getUserProgress = () => {
    const currentAmount = parseFloat(userCurrentAmount || "0");
    const requiredAmount = parseFloat(userRequiredAmount);
    return Math.min(100, (currentAmount / requiredAmount) * 100);
  };

  const getOtherProgress = () => {
    const currentAmount = parseFloat(otherCurrentAmount || "0");
    const requiredAmount = parseFloat(otherRequiredAmount);
    return Math.min(100, (currentAmount / requiredAmount) * 100);
  };

  const getWorkflowStep = () => {
    if (escrow.status === "pending") {
      if (getUserProgress() < 100) return "fund-yourself";
      if (getOtherProgress() < 100) return "wait-other";
      return "both-funded";
    }
    if (escrow.status === "funded") return "ready-release";
    if (escrow.status === "confirming") return "confirming";
    if (escrow.status === "released") return "completed";
    return "pending";
  };

  const renderWorkflowStep = () => {
    const step = getWorkflowStep();

    switch (step) {
      case "fund-yourself":
        return (
          <Card className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                <DollarSign className="h-5 w-5" />
                Step 1: Fund Your Part
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Your {userCurrency} funding:</span>
                  <span className="font-mono text-sm">
                    {formatAmount(userCurrentAmount)} / {formatAmount(userRequiredAmount)}
                  </span>
                </div>
                <Progress value={getUserProgress()} className="h-2" />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.0001"
                    placeholder={`Amount of ${userCurrency} to add`}
                    value={fundingAmount}
                    onChange={(e) => setFundingAmount(e.target.value)}
                    className="flex-1"
                  />
                  {getCurrencyIcon(userCurrency)}
                </div>
                <Button
                  onClick={() => fundEscrowMutation.mutate({ escrowId: escrow.id, amount: fundingAmount })}
                  disabled={!fundingAmount || fundEscrowMutation.isPending}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {fundEscrowMutation.isPending ? "Adding Funds..." : `Add ${userCurrency} Funds`}
                </Button>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  💡 Your {userCurrency} will be held securely until both parties fund and confirm the trade.
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case "wait-other":
        return (
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Clock className="h-5 w-5" />
                Step 2: Waiting for {otherUser.displayName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{otherUser.displayName}'s {otherCurrency}:</span>
                  <span className="font-mono text-sm">
                    {formatAmount(otherCurrentAmount)} / {formatAmount(otherRequiredAmount)}
                  </span>
                </div>
                <Progress value={getOtherProgress()} className="h-2" />
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg">
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  ⏳ Waiting for {otherUser.displayName} to fund their {otherCurrency}. They'll be notified.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Your contribution:</p>
                <div className="flex items-center justify-between bg-green-50 dark:bg-green-950 p-2 rounded">
                  <div className="flex items-center gap-2">
                    {getCurrencyIcon(userCurrency)}
                    <span className="font-mono">{formatAmount(userCurrentAmount)} {userCurrency}</span>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "ready-release":
        return (
          <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="h-5 w-5" />
                Step 3: Complete Trade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 dark:text-gray-400">You receive:</p>
                  <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded">
                    {getCurrencyIcon(otherCurrency)}
                    <span className="font-mono text-sm">{formatAmount(otherRequiredAmount)} {otherCurrency}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 dark:text-gray-400">You send:</p>
                  <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded">
                    {getCurrencyIcon(userCurrency)}
                    <span className="font-mono text-sm">{formatAmount(userRequiredAmount)} {userCurrency}</span>
                  </div>
                </div>
              </div>

              {confirmationStep === "review" ? (
                <div className="space-y-3">
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                      🔒 Both parties have funded! Review the trade details:
                    </p>
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      • {formatAmount(userRequiredAmount)} {userCurrency} → {formatAmount(otherRequiredAmount)} {otherCurrency}
                      • Trading with {otherUser.displayName}
                      • Funds are held securely in escrow
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => requestReleaseMutation.mutate(escrow.id)}
                      disabled={requestReleaseMutation.isPending}
                      variant="outline"
                      className="flex-1"
                    >
                      {requestReleaseMutation.isPending ? "Notifying..." : "🔔 Request Release"}
                    </Button>
                    <Button
                      onClick={() => setConfirmationStep("confirm")}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      Ready to Release
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                      ⚠️ Final Confirmation Required
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      This will immediately release both parties' funds. Make sure you've received what you expected from {otherUser.displayName}.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setConfirmationStep("review")}
                      variant="outline"
                      className="flex-1"
                    >
                      Back to Review
                    </Button>
                    <Button
                      onClick={() => releaseEscrowMutation.mutate(escrow.id)}
                      disabled={releaseEscrowMutation.isPending}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {releaseEscrowMutation.isPending ? "Releasing..." : "✅ Confirm Release"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case "confirming":
        return (
          <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                <AlertTriangle className="h-5 w-5" />
                Blockchain Confirmation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Confirmations:</span>
                  <span className="font-mono">{escrow.confirmationCount || 0} / 25</span>
                </div>
                <Progress value={((escrow.confirmationCount || 0) / 25) * 100} className="h-2" />
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  🔗 Transaction is being confirmed on the blockchain. This usually takes 5-15 minutes.
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case "completed":
        return (
          <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="h-5 w-5" />
                Trade Completed!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-3">
                <div className="text-4xl">🎉</div>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Congratulations! Your escrow trade with {otherUser.displayName} has been completed successfully.
                </p>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    You received: {formatAmount(otherRequiredAmount)} {otherCurrency}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-slate-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-black dark:text-white">
            <Shield className="h-5 w-5 text-orange-500" />
            Escrow Trade Workflow
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Trade Summary */}
          <Card className="bg-gray-50 dark:bg-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Trading with {otherUser.displayName}</span>
                <Badge variant="secondary">{escrow.status}</Badge>
              </div>
              <div className="flex items-center justify-center gap-3">
                <div className="flex items-center gap-2">
                  {getCurrencyIcon(userCurrency)}
                  <span className="font-mono">{formatAmount(userRequiredAmount)} {userCurrency}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <div className="flex items-center gap-2">
                  {getCurrencyIcon(otherCurrency)}
                  <span className="font-mono">{formatAmount(otherRequiredAmount)} {otherCurrency}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Workflow Step */}
          {renderWorkflowStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
}