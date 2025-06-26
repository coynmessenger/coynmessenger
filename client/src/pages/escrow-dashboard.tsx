import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, Clock, AlertTriangle, CheckCircle, FileText, Target, MessageSquare, TrendingUp } from "lucide-react";

interface Escrow {
  id: number;
  status: string;
  description: string;
  escrowType: string;
  priority: string;
  initiatorCurrency: string;
  participantCurrency: string;
  initiatorRequiredAmount: string;
  participantRequiredAmount: string;
  initiatorAmount: string;
  participantAmount: string;
  timeoutHours: number;
  confirmationCount: number;
  requiredConfirmations: number;
  tags: string[];
  createdAt: string;
  lastActivity: string;
}

interface EscrowTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  defaultTerms: string;
  defaultTimeout: number;
}

interface EscrowDispute {
  id: number;
  reason: string;
  description: string;
  status: string;
  createdAt: string;
}

export default function EscrowDashboard() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("active");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EscrowTemplate | null>(null);

  // Fetch user escrows
  const { data: escrows = [], isLoading: escrowsLoading } = useQuery<Escrow[]>({
    queryKey: ["/api/user/escrows/search"],
    queryFn: () => apiRequest("GET", `/api/user/escrows/search?status=${filterStatus}&type=${filterType}`).then(r => r.json()),
  });

  // Fetch escrow templates
  const { data: templates = [] } = useQuery<EscrowTemplate[]>({
    queryKey: ["/api/escrow/templates"],
    queryFn: () => apiRequest("GET", "/api/escrow/templates").then(r => r.json()),
  });

  // Fetch user disputes
  const { data: disputes = [] } = useQuery<EscrowDispute[]>({
    queryKey: ["/api/user/disputes"],
    queryFn: () => apiRequest("GET", "/api/user/disputes").then(r => r.json()),
  });

  // Create dispute mutation
  const createDisputeMutation = useMutation({
    mutationFn: async ({ escrowId, reason, description }: { escrowId: number; reason: string; description: string }) => {
      return apiRequest("POST", `/api/escrows/${escrowId}/disputes`, { reason, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/disputes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/escrows/search"] });
      toast({
        title: "Dispute Created",
        description: "Your dispute has been submitted for review",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusColors = {
      pending: "bg-yellow-500",
      funded: "bg-blue-500",
      confirming: "bg-purple-500",
      released: "bg-green-500",
      cancelled: "bg-red-500",
      disputed: "bg-orange-500",
    };
    return (
      <Badge className={`${statusColors[status as keyof typeof statusColors] || "bg-gray-500"} text-white`}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "high": return <TrendingUp className="h-4 w-4 text-orange-500" />;
      default: return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "marketplace": return <Target className="h-4 w-4" />;
      case "service": return <FileText className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const activeEscrows = escrows.filter(e => ["pending", "funded", "confirming"].includes(e.status));
  const completedEscrows = escrows.filter(e => ["released", "cancelled"].includes(e.status));
  const disputedEscrows = escrows.filter(e => e.status === "disputed");

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Dashboard Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Escrow Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your cryptocurrency escrow transactions</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Escrows</p>
                <p className="text-2xl font-bold text-blue-600">{activeEscrows.length}</p>
              </div>
              <Shield className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedEscrows.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Disputes</p>
                <p className="text-2xl font-bold text-orange-600">{disputes.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Templates</p>
                <p className="text-2xl font-bold text-purple-600">{templates.length}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="funded">Funded</SelectItem>
            <SelectItem value="confirming">Confirming</SelectItem>
            <SelectItem value="released">Released</SelectItem>
            <SelectItem value="disputed">Disputed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Types</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="marketplace">Marketplace</SelectItem>
            <SelectItem value="service">Service</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => setIsCreateModalOpen(true)} className="ml-auto bg-orange-500 hover:bg-orange-600">
          Create Escrow
        </Button>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">Active ({activeEscrows.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedEscrows.length})</TabsTrigger>
          <TabsTrigger value="disputes">Disputes ({disputes.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
        </TabsList>

        {/* Active Escrows */}
        <TabsContent value="active" className="space-y-4">
          {escrowsLoading ? (
            <div className="text-center py-8">Loading escrows...</div>
          ) : activeEscrows.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Active Escrows</h3>
                <p className="text-gray-600 dark:text-gray-400">Create your first escrow to get started</p>
              </CardContent>
            </Card>
          ) : (
            activeEscrows.map((escrow) => (
              <Card key={escrow.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(escrow.escrowType)}
                      <div>
                        <CardTitle className="text-lg">Escrow #{escrow.id}</CardTitle>
                        <CardDescription>{escrow.description || "No description"}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPriorityIcon(escrow.priority)}
                      {getStatusBadge(escrow.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Transaction Details</h4>
                      <div className="space-y-1 text-sm">
                        <p>Initiator: {escrow.initiatorRequiredAmount} {escrow.initiatorCurrency}</p>
                        <p>Participant: {escrow.participantRequiredAmount} {escrow.participantCurrency}</p>
                        <p>Type: {escrow.escrowType}</p>
                        <p>Priority: {escrow.priority}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Progress</h4>
                      {escrow.status === "confirming" ? (
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Confirmations</span>
                            <span>{escrow.confirmationCount}/{escrow.requiredConfirmations}</span>
                          </div>
                          <Progress 
                            value={(escrow.confirmationCount / escrow.requiredConfirmations) * 100} 
                            className="h-2"
                          />
                        </div>
                      ) : (
                        <div className="space-y-1 text-sm">
                          <p>Funded: {parseFloat(escrow.initiatorAmount || "0") + parseFloat(escrow.participantAmount || "0") > 0 ? "Yes" : "No"}</p>
                          <p>Created: {new Date(escrow.createdAt).toLocaleDateString()}</p>
                          <p>Last Activity: {new Date(escrow.lastActivity).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {escrow.tags && escrow.tags.length > 0 && (
                    <div className="mt-4">
                      <div className="flex flex-wrap gap-1">
                        {escrow.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator className="my-4" />
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                    {escrow.status === "funded" && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-orange-600">
                            Create Dispute
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create Dispute</DialogTitle>
                            <DialogDescription>
                              Submit a dispute for Escrow #{escrow.id}
                            </DialogDescription>
                          </DialogHeader>
                          <form 
                            onSubmit={(e) => {
                              e.preventDefault();
                              const formData = new FormData(e.currentTarget);
                              createDisputeMutation.mutate({
                                escrowId: escrow.id,
                                reason: formData.get('reason') as string,
                                description: formData.get('description') as string,
                              });
                            }}
                            className="space-y-4"
                          >
                            <div>
                              <Label htmlFor="reason">Dispute Reason</Label>
                              <Select name="reason" required>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a reason" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="non_delivery">Non-delivery of goods/services</SelectItem>
                                  <SelectItem value="quality_issues">Quality issues</SelectItem>
                                  <SelectItem value="payment_dispute">Payment dispute</SelectItem>
                                  <SelectItem value="terms_violation">Terms violation</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label htmlFor="description">Description</Label>
                              <Textarea 
                                name="description"
                                placeholder="Describe the issue in detail..."
                                required
                              />
                            </div>
                            
                            <Button 
                              type="submit" 
                              disabled={createDisputeMutation.isPending}
                              className="w-full"
                            >
                              {createDisputeMutation.isPending ? "Submitting..." : "Submit Dispute"}
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Completed Escrows */}
        <TabsContent value="completed" className="space-y-4">
          {completedEscrows.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Completed Escrows</h3>
                <p className="text-gray-600 dark:text-gray-400">Completed transactions will appear here</p>
              </CardContent>
            </Card>
          ) : (
            completedEscrows.map((escrow) => (
              <Card key={escrow.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Escrow #{escrow.id}</CardTitle>
                    {getStatusBadge(escrow.status)}
                  </div>
                  <CardDescription>{escrow.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p>Amount: {escrow.initiatorRequiredAmount} {escrow.initiatorCurrency} ↔ {escrow.participantRequiredAmount} {escrow.participantCurrency}</p>
                    <p>Completed: {new Date(escrow.lastActivity).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Disputes */}
        <TabsContent value="disputes" className="space-y-4">
          {disputes.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Disputes</h3>
                <p className="text-gray-600 dark:text-gray-400">Your disputes will appear here</p>
              </CardContent>
            </Card>
          ) : (
            disputes.map((dispute) => (
              <Card key={dispute.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Dispute #{dispute.id}</CardTitle>
                    {getStatusBadge(dispute.status)}
                  </div>
                  <CardDescription>{dispute.reason}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{dispute.description}</p>
                  <p className="text-xs text-gray-500">Created: {new Date(dispute.createdAt).toLocaleDateString()}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedTemplate(template)}>
                <CardHeader>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary">{template.category}</Badge>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Default timeout: {template.defaultTimeout} hours
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}