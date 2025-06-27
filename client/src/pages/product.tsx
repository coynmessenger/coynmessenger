import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Star, 
  Heart, 
  ShoppingCart, 
  Share, 
  Shield, 
  Truck, 
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  CreditCard,
  Wallet,
  Check,
  Clock,
  Package
} from "lucide-react";
import { SiBitcoin, SiBinance } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import coynLogoPath from "@assets/COYN-symbol-square_1750892698348.png";

interface Product {
  ASIN: string;
  title: string;
  price: string;
  currency: string;
  imageUrl: string;
  images?: string[];
  productUrl: string;
  rating: number;
  reviewCount: number;
  category: string;
  brand?: string;
  description?: string;
}

interface CryptoRates {
  BTC: number;
  BNB: number;
  USDT: number;
  COYN: number;
}

export default function ProductPage() {
  const { asin } = useParams<{ asin: string }>();
  const [, setLocation] = useLocation();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedCrypto, setSelectedCrypto] = useState<keyof CryptoRates>("COYN");
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseStep, setPurchaseStep] = useState<"select" | "confirm" | "processing" | "success">("select");
  const [cryptoAmount, setCryptoAmount] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch product details
  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: [`/api/marketplace/product/${asin}`],
    enabled: !!asin,
  });

  // Fetch crypto rates
  const { data: cryptoRates } = useQuery<CryptoRates>({
    queryKey: ["/api/crypto/rates"],
  });

  // Purchase mutation
  const purchaseMutation = useMutation({
    mutationFn: async (purchaseData: {
      productId: string;
      quantity: number;
      cryptoCurrency: string;
      cryptoAmount: number;
    }) => {
      return apiRequest("POST", "/api/marketplace/purchase", purchaseData);
    },
    onSuccess: (data) => {
      setPurchaseStep("success");
      toast({
        title: "Purchase Successful!",
        description: `Transaction ID: ${data.transactionId}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Payment processing failed",
        variant: "destructive",
      });
      setPurchaseStep("select");
    },
  });

  const nextImage = () => {
    if (product?.images && product.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % product.images!.length);
    }
  };

  const prevImage = () => {
    if (product?.images && product.images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + product.images!.length) % product.images!.length);
    }
  };

  const handlePurchase = () => {
    if (!product || !cryptoRates || !cryptoAmount) return;

    const totalUSD = parseFloat(product.price) * quantity;
    const requiredCrypto = totalUSD / cryptoRates[selectedCrypto];
    const providedCrypto = parseFloat(cryptoAmount);

    if (providedCrypto < requiredCrypto * 0.98) {
      toast({
        title: "Insufficient Amount",
        description: `Please provide at least ${requiredCrypto.toFixed(6)} ${selectedCrypto}`,
        variant: "destructive",
      });
      return;
    }

    setPurchaseStep("processing");
    purchaseMutation.mutate({
      productId: product.ASIN,
      quantity,
      cryptoCurrency: selectedCrypto,
      cryptoAmount: providedCrypto,
    });
  };

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
        return null;
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('ProductPage: asin =', asin);
    console.log('ProductPage: product =', product);
    console.log('ProductPage: isLoading =', isLoading);
    console.log('ProductPage: error =', error);
  }, [asin, product, isLoading, error]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50/30 to-cyan-50/30 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50/30 to-cyan-50/30 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Product Not Found</h1>
          <p className="text-muted-foreground mb-4">The product you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation("/marketplace")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Marketplace
          </Button>
        </div>
      </div>
    );
  }

  const totalUSD = parseFloat(product.price) * quantity;
  const requiredCrypto = cryptoRates ? totalUSD / cryptoRates[selectedCrypto] : 0;
  const images = product.images || [product.imageUrl];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/30 to-cyan-50/30 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/marketplace")}
              className="hover:bg-accent"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-foreground truncate">
                {product.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                by {product.brand || "Amazon"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="hover:bg-accent">
                <Heart className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:bg-accent">
                <Share className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-white dark:bg-slate-800 rounded-lg overflow-hidden group shadow-lg">
              <img
                src={images[currentImageIndex]}
                alt={product.title}
                className="w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
              />
              
              {/* Navigation arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              {/* Image counter */}
              {images.length > 1 && (
                <div className="absolute top-4 right-4 bg-black/50 text-white text-sm px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {currentImageIndex + 1}/{images.length}
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                      index === currentImageIndex
                        ? "border-orange-500 dark:border-cyan-400"
                        : "border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.title} ${index + 1}`}
                      className="w-full h-full object-contain p-1 bg-white dark:bg-slate-800"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            {/* Title & Rating */}
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{product.title}</h1>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.floor(product.rating)
                            ? "text-yellow-500 fill-current"
                            : "text-gray-300 dark:text-gray-600"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{product.rating}</span>
                  <span className="text-sm text-muted-foreground">
                    ({product.reviewCount.toLocaleString()} reviews)
                  </span>
                </div>
                <Badge variant="secondary">{product.category}</Badge>
              </div>
            </div>

            {/* Price */}
            <div className="bg-gradient-to-r from-orange-50 to-cyan-50 dark:from-slate-800/50 dark:to-slate-700/50 p-6 rounded-lg border border-orange-200/50 dark:border-cyan-600/50">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-orange-600 dark:text-cyan-400">
                  ${product.price}
                </span>
                <span className="text-lg text-muted-foreground">USD</span>
              </div>
              {cryptoRates && (
                <div className="mt-2 text-sm text-muted-foreground">
                  ≈ {(parseFloat(product.price) / cryptoRates.COYN).toFixed(0)} COYN
                </div>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Description</h3>
                <p className="text-muted-foreground leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Trust Indicators */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                <Shield className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Secure Payment</p>
              </div>
              <div className="text-center p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                <Truck className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Fast Shipping</p>
              </div>
              <div className="text-center p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                <RotateCcw className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Easy Returns</p>
              </div>
            </div>

            <Separator />

            {/* Purchase Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="quantity">Quantity:</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="h-8 w-8"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      id="quantity"
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 text-center"
                      min="1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(quantity + 1)}
                      className="h-8 w-8"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowPurchaseModal(true)}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 dark:from-cyan-500 dark:to-cyan-600 dark:hover:from-cyan-600 dark:hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  size="lg"
                >
                  <Wallet className="h-5 w-5 mr-2" />
                  Buy with Crypto
                </Button>
                <Button variant="outline" size="lg" className="px-6">
                  <ShoppingCart className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-slate-700/50 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Purchase with Crypto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {purchaseStep === "select" && (
                <>
                  <div>
                    <Label>Select Cryptocurrency</Label>
                    <Select value={selectedCrypto} onValueChange={(value: keyof CryptoRates) => setSelectedCrypto(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {cryptoRates && Object.entries(cryptoRates).map(([currency, rate]) => (
                          <SelectItem key={currency} value={currency}>
                            <div className="flex items-center gap-2">
                              {getCryptoIcon(currency)}
                              {currency}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Amount Required</Label>
                    <div className="text-2xl font-bold text-orange-600 dark:text-cyan-400">
                      {requiredCrypto.toFixed(6)} {selectedCrypto}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      = ${totalUSD.toFixed(2)} USD
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="crypto-amount">Enter Amount</Label>
                    <Input
                      id="crypto-amount"
                      type="number"
                      step="0.000001"
                      placeholder={`Enter ${selectedCrypto} amount`}
                      value={cryptoAmount}
                      onChange={(e) => setCryptoAmount(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowPurchaseModal(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handlePurchase}
                      disabled={!cryptoAmount || parseFloat(cryptoAmount) < requiredCrypto * 0.98}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 dark:from-cyan-500 dark:to-cyan-600 dark:hover:from-cyan-600 dark:hover:to-cyan-700 text-white"
                    >
                      Confirm Purchase
                    </Button>
                  </div>
                </>
              )}

              {purchaseStep === "processing" && (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-2 border-orange-500 dark:border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <h3 className="text-lg font-semibold mb-2">Processing Payment</h3>
                  <p className="text-muted-foreground">
                    Converting {selectedCrypto} to USD and processing your order...
                  </p>
                </div>
              )}

              {purchaseStep === "success" && (
                <div className="text-center py-8">
                  <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Purchase Successful!</h3>
                  <p className="text-muted-foreground mb-4">
                    Your order has been processed and will be shipped soon.
                  </p>
                  <Button
                    onClick={() => {
                      setShowPurchaseModal(false);
                      setPurchaseStep("select");
                    }}
                    className="w-full"
                  >
                    Continue Shopping
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}