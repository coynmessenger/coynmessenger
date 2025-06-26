import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Shield, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  BarChart3, 
  Zap,
  Brain,
  Timer,
  DollarSign
} from "lucide-react";
import type { Escrow } from "@shared/schema";

interface EnhancedEscrowModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: number;
}

interface EscrowAnalytics {
  total: number;
  pending: number;
  active: number;
  completed: number;
  disputed: number;
  cancelled: number;
  averageAmount: number;
  successRate: number;
  recentActivity: Escrow[];
}

export default function EnhancedEscrowModal({ isOpen, onClose, conversationId }: EnhancedEscrowModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form states
  const [initiatorCurrency, setInitiatorCurrency] = useState("BTC");
  const [participantCurrency, setParticipantCurrency] = useState("USDT");
  const [initiatorAmount, setInitiatorAmount] = useState("");
  const [participantAmount, setParticipantAmount] = useState("");
  const [description, setDescription] = useState("");
  const [escrowType, setEscrowType] = useState("basic");
  const [priority, setPriority] = useState("normal");
  const [timeoutHours, setTimeoutHours] = useState("72");
  
  // Dispute form states
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeEvidence, setDisputeEvidence] = useState("");
  const [selectedEscrow, setSelectedEscrow] = useState<number | null>(null);

  // Fetch escrow analytics
  const { data: analytics } = useQuery<EscrowAnalytics>({
    queryKey: ["/api/escrows/analytics"],
    enabled: isOpen,
  });

  // Fetch conversation escrows
  const { data: escrows = [] } = useQuery<Escrow[]>({
    queryKey: ["/api/conversations", conversationId, "escrows"],
    enabled: isOpen,
  });

  // Create enhanced escrow mutation
  const createEscrowMutation = useMutation({
    mutationFn: async (escrowData: any) => {
      const response = await apiRequest("POST", "/api/escrows", escrowData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "escrows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/escrows/analytics"] });
      toast({
        title: "Enhanced Escrow Created",
        description: "Advanced escrow with blockchain monitoring has been initiated.",
      });
      resetForm();
    },
    onError: () => {
      toast({
        title: "Creation Failed",
        description: "Failed to create enhanced escrow. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Enhanced funding mutation
  const enhancedFundingMutation = useMutation({
    mutationFn: async ({ escrowId, amount }: { escrowId: number; amount: number }) => {
      const response = await apiRequest("POST", `/api/escrows/${escrowId}/fund-enhanced`, { amount });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "escrows"] });
      toast({
        title: "Enhanced Funding Successful",
        description: "Blockchain confirmation monitoring has been activated.",
      });
    },
    onError: () => {
      toast({
        title: "Funding Failed",
        description: "Failed to process enhanced funding.",
        variant: "destructive",
      });
    },
  });

  // Smart dispute mutation
  const smartDisputeMutation = useMutation({
    mutationFn: async ({ escrowId, reason, evidence }: { escrowId: number; reason: string; evidence: string[] }) => {
      const response = await apiRequest("POST", `/api/escrows/${escrowId}/smart-dispute`, { 
        reason, 
        evidence: evidence.filter(e => e.trim()) 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "escrows"] });
      toast({
        title: "Smart Dispute Initiated",
        description: "AI-powered dispute analysis has begun.",
      });
      setDisputeReason("");
      setDisputeEvidence("");
      setSelectedEscrow(null);
    },
    onError: () => {
      toast({
        title: "Dispute Failed",
        description: "Failed to initiate smart dispute.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setInitiatorAmount("");
    setParticipantAmount("");
    setDescription("");
    setEscrowType("basic");
    setPriority("normal");
    setTimeoutHours("72");
  };

  const handleCreateEscrow = () => {
    if (!initiatorAmount || !participantAmount) {
      toast({
        title: "Invalid Input",
        description: "Please enter both cryptocurrency amounts.",
        variant: "destructive",
      });
      return;
    }

    createEscrowMutation.mutate({
      conversationId,
      participantId: 1, // Replace with actual participant selection
      initiatorCurrency,
      participantCurrency,
      initiatorRequiredAmount: initiatorAmount,
      participantRequiredAmount: participantAmount,
      description,
      escrowType,
      priority,
      timeoutHours: parseInt(timeoutHours),
      requiresVerification: escrowType === "enhanced",
      verificationLevel: priority === "urgent" ? "enhanced" : "standard",
    });
  };

  const handleSmartDispute = () => {
    if (!selectedEscrow || !disputeReason) {
      toast({
        title: "Invalid Input",
        description: "Please select an escrow and provide a reason.",
        variant: "destructive",
      });
      return;
    }

    const evidenceArray = disputeEvidence.split('\n').filter(e => e.trim());
    smartDisputeMutation.mutate({
      escrowId: selectedEscrow,
      reason: disputeReason,
      evidence: evidenceArray,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4 text-yellow-500" />;
      case "funded": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "confirming": return <Shield className="h-4 w-4 text-blue-500" />;
      case "released": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "disputed": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "cancelled": return <XCircle className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "funded": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "confirming": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "released": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "disputed": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "cancelled": return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-black dark:text-white">
            <Zap className="h-5 w-5 text-orange-500" />
            Enhanced Escrow System
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="create">Create</TabsTrigger>
            <TabsTrigger value="manage">Manage</TabsTrigger>
            <TabsTrigger value="dispute">Smart Dispute</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-orange-500" />
                  Create Enhanced Escrow
                </CardTitle>
                <CardDescription>
                  Advanced escrow with blockchain monitoring, smart disputes, and automated release
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Your Cryptocurrency</Label>
                    <select 
                      value={initiatorCurrency} 
                      onChange={(e) => setInitiatorCurrency(e.target.value)}
                      className="w-full p-2 border rounded-md bg-white dark:bg-slate-700 text-black dark:text-white"
                    >
                      <option value="BTC">Bitcoin (BTC)</option>
                      <option value="BNB">Binance Coin (BNB)</option>
                      <option value="USDT">Tether (USDT)</option>
                      <option value="COYN">COYN Token</option>
                    </select>
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      step="0.00000001"
                      value={initiatorAmount}
                      onChange={(e) => setInitiatorAmount(e.target.value)}
                      placeholder="0.00000000"
                      className="bg-white dark:bg-slate-700 text-black dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Receive Cryptocurrency</Label>
                    <select 
                      value={participantCurrency} 
                      onChange={(e) => setParticipantCurrency(e.target.value)}
                      className="w-full p-2 border rounded-md bg-white dark:bg-slate-700 text-black dark:text-white"
                    >
                      <option value="BTC">Bitcoin (BTC)</option>
                      <option value="BNB">Binance Coin (BNB)</option>
                      <option value="USDT">Tether (USDT)</option>
                      <option value="COYN">COYN Token</option>
                    </select>
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      step="0.00000001"
                      value={participantAmount}
                      onChange={(e) => setParticipantAmount(e.target.value)}
                      placeholder="0.00000000"
                      className="bg-white dark:bg-slate-700 text-black dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Escrow Type</Label>
                    <select 
                      value={escrowType} 
                      onChange={(e) => setEscrowType(e.target.value)}
                      className="w-full p-2 border rounded-md bg-white dark:bg-slate-700 text-black dark:text-white"
                    >
                      <option value="basic">Basic</option>
                      <option value="marketplace">Marketplace</option>
                      <option value="service">Service</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <select 
                      value={priority} 
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full p-2 border rounded-md bg-white dark:bg-slate-700 text-black dark:text-white"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <Label>Timeout (Hours)</Label>
                    <Input
                      type="number"
                      value={timeoutHours}
                      onChange={(e) => setTimeoutHours(e.target.value)}
                      className="bg-white dark:bg-slate-700 text-black dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label>Description (Optional)</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the escrow terms..."
                    className="bg-white dark:bg-slate-700 text-black dark:text-white"
                  />
                </div>

                <Button 
                  onClick={handleCreateEscrow} 
                  disabled={createEscrowMutation.isPending}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {createEscrowMutation.isPending ? "Creating..." : "Create Enhanced Escrow"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage" className="space-y-4">
            <div className="grid gap-4">
              {escrows.map((escrow) => (
                <Card key={escrow.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(escrow.status)}
                        <div>
                          <p className="font-medium text-black dark:text-white">
                            {escrow.initiatorRequiredAmount} {escrow.initiatorCurrency} ⇄ {escrow.participantRequiredAmount} {escrow.participantCurrency}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Escrow #{escrow.id} • {escrow.escrowType || 'basic'} • {escrow.priority || 'normal'} priority
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(escrow.status)}>
                          {escrow.status}
                        </Badge>
                        {escrow.status === "confirming" && (
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={(escrow.confirmationCount || 0) / (escrow.requiredConfirmations || 25) * 100} 
                              className="w-20"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {escrow.confirmationCount || 0}/{escrow.requiredConfirmations || 25}
                            </span>
                          </div>
                        )}
                        {escrow.status === "funded" && (
                          <Button 
                            size="sm" 
                            onClick={() => enhancedFundingMutation.mutate({ escrowId: escrow.id, amount: 0.001 })}
                            className="bg-green-500 hover:bg-green-600 text-white"
                          >
                            Fund Enhanced
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="dispute" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-orange-500" />
                  AI-Powered Smart Dispute
                </CardTitle>
                <CardDescription>
                  Automated dispute analysis with intelligent resolution recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Select Escrow</Label>
                  <select 
                    value={selectedEscrow || ""} 
                    onChange={(e) => setSelectedEscrow(parseInt(e.target.value) || null)}
                    className="w-full p-2 border rounded-md bg-white dark:bg-slate-700 text-black dark:text-white"
                  >
                    <option value="">Choose an escrow...</option>
                    {escrows.filter(e => ["funded", "confirming", "released"].includes(e.status)).map(escrow => (
                      <option key={escrow.id} value={escrow.id}>
                        Escrow #{escrow.id} - {escrow.initiatorCurrency}/{escrow.participantCurrency}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Dispute Reason</Label>
                  <Input
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="e.g., Not received, Wrong item, Damaged goods"
                    className="bg-white dark:bg-slate-700 text-black dark:text-white"
                  />
                </div>

                <div>
                  <Label>Evidence (One per line)</Label>
                  <Textarea
                    value={disputeEvidence}
                    onChange={(e) => setDisputeEvidence(e.target.value)}
                    placeholder="Transaction ID&#10;Photos/screenshots&#10;Communication records&#10;Other evidence..."
                    className="bg-white dark:bg-slate-700 text-black dark:text-white"
                    rows={4}
                  />
                </div>

                <Button 
                  onClick={handleSmartDispute} 
                  disabled={smartDisputeMutation.isPending}
                  className="w-full bg-red-500 hover:bg-red-600 text-white"
                >
                  {smartDisputeMutation.isPending ? "Analyzing..." : "Initiate Smart Dispute"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {analytics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-2xl font-bold text-black dark:text-white">{analytics.total}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Escrows</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-2xl font-bold text-black dark:text-white">{analytics.successRate.toFixed(1)}%</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-2xl font-bold text-black dark:text-white">{analytics.active}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Active Escrows</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="text-2xl font-bold text-black dark:text-white">{analytics.disputed}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Disputed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-orange-500" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.recentActivity.map((escrow) => (
                  <div key={escrow.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(escrow.status)}
                      <span className="text-sm text-black dark:text-white">
                        {escrow.initiatorRequiredAmount} {escrow.initiatorCurrency} ⇄ {escrow.participantRequiredAmount} {escrow.participantCurrency}
                      </span>
                    </div>
                    <Badge className={getStatusColor(escrow.status)}>
                      {escrow.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}