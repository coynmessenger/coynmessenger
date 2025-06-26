import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Shield, ArrowRightLeft } from "lucide-react";
import { FaBitcoin } from "react-icons/fa";
import { SiBinance, SiTether } from "react-icons/si";
import coynLogoPath from "@assets/COYN-symbol-square_1750891892214.png";
import type { User } from "@shared/schema";

interface QuickEscrowModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: number;
  otherUser: User;
}

export default function QuickEscrowModal({ isOpen, onClose, conversationId, otherUser }: QuickEscrowModalProps) {
  const [step, setStep] = useState<"select" | "amounts" | "confirm">("select");
  const [yourCurrency, setYourCurrency] = useState("");
  const [theirCurrency, setTheirCurrency] = useState("");
  const [yourAmount, setYourAmount] = useState("");
  const [theirAmount, setTheirAmount] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createEscrowMutation = useMutation({
    mutationFn: async (escrowData: any) => {
      const response = await apiRequest("POST", "/api/escrows", escrowData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "escrows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Escrow Created",
        description: `Secure trade created with ${otherUser.displayName}`,
      });
      onClose();
      resetForm();
    },
    onError: () => {
      toast({
        title: "Failed to Create Escrow",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setStep("select");
    setYourCurrency("");
    setTheirCurrency("");
    setYourAmount("");
    setTheirAmount("");
  };

  const currencies = [
    { id: "BTC", name: "Bitcoin", icon: <FaBitcoin className="h-5 w-5 text-orange-500" /> },
    { id: "BNB", name: "BNB", icon: <SiBinance className="h-5 w-5 text-yellow-500" /> },
    { id: "USDT", name: "USDT", icon: <SiTether className="h-5 w-5 text-green-500" /> },
    { id: "COYN", name: "COYN", icon: <img src={coynLogoPath} alt="COYN" className="h-5 w-5 rounded-full" /> },
  ];

  const handleCurrencySelect = (type: "your" | "their", currency: string) => {
    if (type === "your") {
      setYourCurrency(currency);
    } else {
      setTheirCurrency(currency);
    }
    
    if (yourCurrency && theirCurrency && type === "their") {
      setStep("amounts");
    } else if (yourCurrency && type === "your") {
      setStep("amounts");
    }
  };

  const handleCreateEscrow = () => {
    if (!yourAmount || !theirAmount) {
      toast({
        title: "Missing Amounts",
        description: "Please enter both trade amounts.",
        variant: "destructive",
      });
      return;
    }

    createEscrowMutation.mutate({
      conversationId,
      participantId: otherUser.id,
      initiatorCurrency: yourCurrency,
      participantCurrency: theirCurrency,
      initiatorRequiredAmount: yourAmount,
      participantRequiredAmount: theirAmount,
      description: `Quick trade: ${yourAmount} ${yourCurrency} ⇄ ${theirAmount} ${theirCurrency}`,
    });
  };

  const getCurrencyInfo = (currencyId: string) => {
    return currencies.find(c => c.id === currencyId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-slate-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-black dark:text-white">
            <Shield className="h-5 w-5 text-orange-500" />
            Quick Escrow Trade
          </DialogTitle>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Create a secure trade with {otherUser.displayName}
            </p>
            
            <div>
              <Label className="text-black dark:text-white">You send:</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {currencies.map((currency) => (
                  <Button
                    key={currency.id}
                    variant={yourCurrency === currency.id ? "default" : "outline"}
                    onClick={() => handleCurrencySelect("your", currency.id)}
                    className="h-12 flex items-center gap-2"
                  >
                    {currency.icon}
                    <span>{currency.id}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-black dark:text-white">You receive:</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {currencies.map((currency) => (
                  <Button
                    key={currency.id}
                    variant={theirCurrency === currency.id ? "default" : "outline"}
                    onClick={() => handleCurrencySelect("their", currency.id)}
                    className="h-12 flex items-center gap-2"
                    disabled={currency.id === yourCurrency}
                  >
                    {currency.icon}
                    <span>{currency.id}</span>
                  </Button>
                ))}
              </div>
            </div>

            {yourCurrency && theirCurrency && (
              <Button 
                onClick={() => setStep("amounts")} 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              >
                Continue to Amounts
              </Button>
            )}
          </div>
        )}

        {step === "amounts" && (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {getCurrencyInfo(yourCurrency)?.icon}
                  <span className="font-medium text-black dark:text-white">{yourCurrency}</span>
                </div>
                <ArrowRightLeft className="h-4 w-4 text-gray-400" />
                <div className="flex items-center gap-2">
                  {getCurrencyInfo(theirCurrency)?.icon}
                  <span className="font-medium text-black dark:text-white">{theirCurrency}</span>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-black dark:text-white">You send ({yourCurrency}):</Label>
              <Input
                type="number"
                step="0.00000001"
                value={yourAmount}
                onChange={(e) => setYourAmount(e.target.value)}
                placeholder="0.00000000"
                className="mt-1 bg-white dark:bg-slate-700 text-black dark:text-white"
              />
            </div>

            <div>
              <Label className="text-black dark:text-white">You receive ({theirCurrency}):</Label>
              <Input
                type="number"
                step="0.00000001"
                value={theirAmount}
                onChange={(e) => setTheirAmount(e.target.value)}
                placeholder="0.00000000"
                className="mt-1 bg-white dark:bg-slate-700 text-black dark:text-white"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStep("select")}
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={() => setStep("confirm")}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                disabled={!yourAmount || !theirAmount}
              >
                Review Trade
              </Button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-lg">
              <h3 className="font-medium text-black dark:text-white mb-3">Trade Summary</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">You send:</span>
                  <div className="flex items-center gap-1">
                    {getCurrencyInfo(yourCurrency)?.icon}
                    <span className="font-medium text-black dark:text-white">{yourAmount} {yourCurrency}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">You receive:</span>
                  <div className="flex items-center gap-1">
                    {getCurrencyInfo(theirCurrency)?.icon}
                    <span className="font-medium text-black dark:text-white">{theirAmount} {theirCurrency}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Trading with:</span>
                  <span className="font-medium text-black dark:text-white">{otherUser.displayName}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                🛡️ Escrow Protection: Funds are held securely until both parties confirm the trade.
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStep("amounts")}
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={handleCreateEscrow}
                disabled={createEscrowMutation.isPending}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
              >
                {createEscrowMutation.isPending ? "Creating..." : "Create Escrow"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}