import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Search, Package, Calendar, CreditCard, Truck, Check, Clock, X, Home, FileText, ChevronDown, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { SiBitcoin, SiBinance } from "react-icons/si";
import coynLogoPath from "@assets/COYN-symbol-square_1750891892214.png";

interface Purchase {
  id: number;
  productId: string;
  productTitle: string;
  quantity: number;
  totalValue: string;
  currency: string;
  paymentMethod: string;
  transactionHash?: string;
  status: string;
  shippingAddress?: string;
  orderNotes?: string;
  createdAt: string;
}

export default function PurchaseHistoryPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['/api/purchases'],
    queryFn: async () => {
      const response = await fetch('/api/purchases');
      if (!response.ok) throw new Error('Failed to fetch purchases');
      return response.json();
    }
  });

  // Auto-scroll to top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const getCryptoIcon = (currency: string) => {
    switch (currency) {
      case "BTC":
        return <SiBitcoin className="h-4 w-4 text-orange-500" />;
      case "BNB":
        return <SiBinance className="h-4 w-4 text-yellow-500" />;
      case "USDT":
        return <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">T</div>;
      case "COYN":
        return <img src={coynLogoPath} alt="COYN" className="h-4 w-4 rounded-full" />;
      default:
        return <CreditCard className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return <Check className="h-4 w-4 text-green-500" />;
      case "shipped":
        return <Truck className="h-4 w-4 text-blue-500" />;
      case "delivered":
        return <Package className="h-4 w-4 text-purple-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "bg-green-500 text-white";
      case "shipped":
        return "bg-blue-500 text-white";
      case "delivered":
        return "bg-purple-500 text-white";
      case "pending":
        return "bg-yellow-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const filteredPurchases = purchases.filter((purchase: Purchase) => {
    const matchesSearch = purchase.productTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         purchase.productId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || purchase.status.toLowerCase() === statusFilter;
    const matchesPayment = paymentFilter === "all" || purchase.paymentMethod === paymentFilter;
    
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const totalSpent = purchases.reduce((sum: number, purchase: Purchase) => 
    sum + parseFloat(purchase.totalValue), 0
  );

  const ordersByStatus = purchases.reduce((acc: Record<string, number>, purchase: Purchase) => {
    acc[purchase.status] = (acc[purchase.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50 to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-slate-700/50 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/marketplace")}
                className="hover:bg-orange-100 dark:hover:bg-slate-700"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-500 dark:text-cyan-400" />
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Purchase History</h1>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="hover:bg-orange-100 dark:hover:bg-slate-700"
            >
              <Home className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{purchases.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">${totalSpent.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Shipped</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{ordersByStatus.shipped || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Check className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Delivered</p>
                  <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{ordersByStatus.delivered || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by product name or order ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>

              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="BTC">Bitcoin</SelectItem>
                  <SelectItem value="BNB">Binance Coin</SelectItem>
                  <SelectItem value="USDT">Tether</SelectItem>
                  <SelectItem value="COYN">COYN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Purchase List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading purchase history...</p>
          </div>
        ) : filteredPurchases.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No purchases found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== "all" || paymentFilter !== "all"
                  ? "Try adjusting your filters to see more results."
                  : "Start shopping to see your purchase history here."}
              </p>
              <Button 
                onClick={() => setLocation("/marketplace")}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Browse Marketplace
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPurchases.map((purchase: Purchase) => (
              <Card key={purchase.id} className="glass-card hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-foreground line-clamp-1">{purchase.productTitle}</h3>
                          <p className="text-sm text-muted-foreground">Order #{purchase.id.toString().padStart(6, '0')}</p>
                        </div>
                        <Badge className={`ml-2 ${getStatusColor(purchase.status)}`}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(purchase.status)}
                            {purchase.status}
                          </div>
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(purchase.createdAt), 'MMM dd, yyyy')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Qty: {purchase.quantity}
                        </div>
                        <div className="flex items-center gap-1">
                          {getCryptoIcon(purchase.paymentMethod)}
                          {purchase.paymentMethod}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                          ${purchase.totalValue}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPurchase(purchase);
                            setShowDetails(true);
                          }}
                          className="text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                        >
                          View Details
                          <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Purchase Details Modal */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-slate-700/50">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-500 dark:text-cyan-400" />
                Order Details
              </DialogTitle>
            </DialogHeader>
            
            {selectedPurchase && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Order Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Order ID:</span>
                        <span>#{selectedPurchase.id.toString().padStart(6, '0')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span>{format(new Date(selectedPurchase.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge className={getStatusColor(selectedPurchase.status)}>
                          {selectedPurchase.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Payment Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Method:</span>
                        <div className="flex items-center gap-1">
                          {getCryptoIcon(selectedPurchase.paymentMethod)}
                          {selectedPurchase.paymentMethod}
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="font-semibold">${selectedPurchase.totalValue}</span>
                      </div>
                      {selectedPurchase.transactionHash && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">TX Hash:</span>
                          <span className="font-mono text-xs break-all">
                            {selectedPurchase.transactionHash.slice(0, 10)}...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Product Details</h4>
                  <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
                    <h5 className="font-medium">{selectedPurchase.productTitle}</h5>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>Product ID: {selectedPurchase.productId}</span>
                      <span>Quantity: {selectedPurchase.quantity}</span>
                    </div>
                  </div>
                </div>

                {selectedPurchase.shippingAddress && (
                  <div>
                    <h4 className="font-semibold mb-2">Shipping Address</h4>
                    <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
                      <p className="text-sm whitespace-pre-line">{selectedPurchase.shippingAddress}</p>
                    </div>
                  </div>
                )}

                {selectedPurchase.orderNotes && (
                  <div>
                    <h4 className="font-semibold mb-2">Order Notes</h4>
                    <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
                      <p className="text-sm">{selectedPurchase.orderNotes}</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setLocation(`/product/${selectedPurchase.productId}`)}
                  >
                    View Product
                  </Button>
                  <Button onClick={() => setShowDetails(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}