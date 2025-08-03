import { useState, useEffect } from "react";
import { useParams, useLocation, Link, useRouter } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Package,
  Send,
  MessageCircle,
  Search
} from "lucide-react";
import { SiBitcoin, SiBinance } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import { ProductShareModal } from "@/components/product-share-modal";
import coynLogoPath from "@assets/COYN-symbol-square_1750892698348.png";
import ShoppingCartComponent from "@/components/shopping-cart";

// Utility function to format prices with commas
const formatPrice = (price: string | number): string => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return numPrice.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

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
  affiliateInfo?: {
    associateTag: string;
    commissionRate: number;
    trackingId: string;
  };
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
  const [showNFTRewards, setShowNFTRewards] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get connected user from localStorage
  const connectedUserString = localStorage.getItem('connectedUser');
  const connectedUser = connectedUserString ? JSON.parse(connectedUserString) : null;

  // Get cart count for header badge
  const getCartCount = () => {
    const cart = JSON.parse(localStorage.getItem('shopping-cart') || '[]');
    return cart.reduce((total: number, item: any) => total + item.quantity, 0);
  };

  const [cartCount, setCartCount] = useState(getCartCount());

  // Update cart count when cart changes
  useEffect(() => {
    const handleCartUpdate = () => {
      setCartCount(getCartCount());
    };

    window.addEventListener('storage', handleCartUpdate);
    return () => window.removeEventListener('storage', handleCartUpdate);
  }, []);

  // Scroll to top when product changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [asin]);

  // Sample reviews data - in real app would come from API
  const reviewsData = [
    { name: "Sarah M.", rating: 5, comment: "Excellent sound quality! The Alexa integration works perfectly and setup was incredibly easy.", verified: true, date: "2024-12-15" },
    { name: "Mike R.", rating: 4, comment: "Great value for money. Compact design fits perfectly on my nightstand.", verified: true, date: "2024-12-10" },
    { name: "Jennifer L.", rating: 5, comment: "Love how responsive it is. Voice recognition works even with background noise.", verified: false, date: "2024-12-08" },
    { name: "David K.", rating: 4, comment: "Good product overall. Sound is clear and bass is surprisingly good for the size.", verified: true, date: "2024-12-05" },
    { name: "Lisa P.", rating: 5, comment: "Perfect for controlling smart home devices. Very satisfied with this purchase!", verified: true, date: "2024-12-01" },
    { name: "Alex T.", rating: 5, comment: "Amazing product! Works seamlessly with my smart home setup. Highly recommend.", verified: true, date: "2024-11-28" },
    { name: "Emma W.", rating: 4, comment: "Good quality speaker with clear sound. Setup was easy and Alexa responds well.", verified: true, date: "2024-11-25" },
    { name: "Ryan B.", rating: 5, comment: "Exceeded my expectations! The sound quality is fantastic for such a compact device.", verified: true, date: "2024-11-20" },
    { name: "Jessica H.", rating: 4, comment: "Very happy with this purchase. The voice recognition is impressive and works from across the room.", verified: false, date: "2024-11-18" },
    { name: "Mark S.", rating: 5, comment: "Perfect addition to my bedroom. Sound quality is great and Alexa integration is flawless.", verified: true, date: "2024-11-15" }
  ];

  // Fetch product details
  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: [`/api/marketplace/product/${asin}`],
    enabled: !!asin,
  });

  // Fetch crypto rates
  const { data: cryptoRates } = useQuery<CryptoRates>({
    queryKey: ["/api/crypto/rates"],
  });

  // Fetch favorites
  const { data: favorites = [] } = useQuery({
    queryKey: ['/api/favorites', connectedUser?.id],
    queryFn: () => {
      if (!connectedUser?.id) return [];
      return fetch(`/api/favorites?userId=${connectedUser.id}`).then(res => res.json());
    },
    enabled: !!connectedUser?.id
  });

  // Add favorite mutation
  const addFavoriteMutation = useMutation({
    mutationFn: (productData: any) => 
      apiRequest('POST', '/api/favorites', { ...productData, userId: connectedUser?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/favorites', connectedUser?.id] });
      toast({
        title: "Added to favorites",
        description: "Product has been added to your favorites",
      });
    }
  });

  // Remove favorite mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: (productId: string) => 
      apiRequest('DELETE', `/api/favorites/${productId}?userId=${connectedUser?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/favorites', connectedUser?.id] });
      toast({
        title: "Removed from favorites",
        description: "Product has been removed from your favorites",
      });
    }
  });

  // Helper function to check if product is favorited
  const isProductFavorited = (productId: string): boolean => {
    return favorites.some((fav: any) => fav.productId === productId);
  };

  // Toggle favorite function
  const toggleFavorite = () => {
    if (!product) return;
    
    const productData = {
      productId: product.ASIN,
      productTitle: product.title,
      productPrice: product.price,
      productImage: product.imageUrl,
      productBrand: product.brand,
      productCategory: product.category,
      productRating: product.rating
    };

    if (isProductFavorited(product.ASIN)) {
      removeFavoriteMutation.mutate(product.ASIN);
    } else {
      addFavoriteMutation.mutate(productData);
    }
  };

  // Purchase mutation
  const purchaseMutation = useMutation({
    mutationFn: async (purchaseData: {
      productId: string;
      quantity: number;
      cryptoCurrency: string;
      cryptoAmount: number;
      userId?: number;
    }) => {
      return apiRequest("POST", "/api/marketplace/purchase", purchaseData);
    },
    onSuccess: (data) => {
      setPurchaseStep("success");
      toast({
        title: "Purchase Successful!",
        description: `Transaction ID: ${data.transactionId}`,
      });
      // Invalidate purchase history cache to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/purchases'] });
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

  // Share product mutation
  const shareProductMutation = useMutation({
    mutationFn: async (data: { 
      conversationIds: number[];
      productId: string;
      productTitle: string;
      productPrice: string;
      productImage: string;
    }) => {
      return apiRequest("POST", "/api/messages/share-product", {
        ...data,
        userId: connectedUser?.id
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Product shared successfully",
        description: `Shared to ${variables.conversationIds.length} conversation${variables.conversationIds.length > 1 ? 's' : ''}`,
      });
      setShowShareModal(false);
    },
    onError: () => {
      toast({
        title: "Failed to share product",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddToCart = () => {
    if (!product) return;
    
    const cartItem = {
      asin: product.ASIN,
      title: product.title,
      price: product.price,
      image: product.imageUrl,
      quantity: quantity
    };
    
    // Get existing cart or create new one
    const existingCart = JSON.parse(localStorage.getItem('shopping-cart') || '[]');
    
    // Check if item already exists in cart
    const existingItemIndex = existingCart.findIndex((item: any) => 
      item.asin === cartItem.asin
    );
    
    if (existingItemIndex >= 0) {
      // Update quantity if item exists
      existingCart[existingItemIndex].quantity += quantity;
    } else {
      // Add new item to cart
      existingCart.push(cartItem);
    }
    
    // Save to localStorage
    localStorage.setItem('shopping-cart', JSON.stringify(existingCart));
    
    toast({
      title: "Added to cart",
      description: `${quantity} × ${product.title} added to your cart`,
      duration: 2000,
    });
  };

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
        description: `Please provide at least ${requiredCrypto.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 })} ${selectedCrypto}`,
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
      userId: connectedUser?.id || 5, // Add the connected user's ID
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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 overflow-x-hidden">
      <div className="relative z-10">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/marketplace")}
              className="hover:bg-accent"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="hover:bg-accent"
                onClick={toggleFavorite}
                disabled={addFavoriteMutation.isPending || removeFavoriteMutation.isPending}
              >
                <Heart 
                  className={`h-5 w-5 ${
                    isProductFavorited(product?.ASIN || '') 
                      ? 'fill-red-500 text-red-500' 
                      : 'text-muted-foreground hover:text-red-500'
                  }`} 
                />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="hover:bg-accent relative"
                onClick={() => setShowCartModal(true)}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Button>

              {connectedUser && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="hover:bg-accent"
                  onClick={() => setShowShareModal(true)}
                >
                  <Share className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Product Images */}
          <div className="space-y-3 sm:space-y-4">
            <div className="relative aspect-square bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl overflow-hidden group shadow-xl border border-white/20 dark:border-slate-700/50">
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
              <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
          <div className="space-y-6 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-white/20 dark:border-slate-700/50 shadow-xl">
            {/* Title & Rating */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 leading-relaxed">{product.title}</h1>
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
            <div className="bg-gradient-to-r from-orange-100/60 to-cyan-100/60 dark:from-slate-700/60 dark:to-slate-600/60 backdrop-blur-sm p-6 rounded-xl border border-orange-200/50 dark:border-cyan-600/50 shadow-lg">
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-bold text-orange-600 dark:text-cyan-400">
                  ${formatPrice(product.price)}
                </span>
                <span className="text-lg text-muted-foreground">USD</span>
              </div>
              
              {/* Crypto Conversion - All 4 Currencies */}
              {cryptoRates && (
                <div>
                  <p className="text-sm text-muted-foreground font-medium mb-3">Conversion:</p>
                  <div className="bg-yellow-100/80 dark:bg-yellow-900/20 px-3 py-3 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <img src={coynLogoPath} alt="COYN" className="h-5 w-5 rounded-full" />
                      <span className="font-bold text-yellow-700 dark:text-yellow-400">≈ {(parseFloat(product.price) / cryptoRates.COYN).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COYN</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <SiBitcoin className="h-5 w-5 text-orange-500" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">≈ {(parseFloat(product.price) / cryptoRates.BTC).toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 })} BTC</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <SiBinance className="h-5 w-5 text-yellow-500" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">≈ {(parseFloat(product.price) / cryptoRates.BNB).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} BNB</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">₮</div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">≈ {(parseFloat(product.price) / cryptoRates.USDT).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Product Details & Reviews - Always Visible */}
            <div className="space-y-6">
              {/* Product Details */}
              {product.description && (
                <div className="p-4 bg-white/30 dark:bg-slate-800/30 rounded-lg border border-gray-200 dark:border-slate-700">
                  <h4 className="font-semibold text-foreground mb-2">Product Details</h4>
                  <p className="text-muted-foreground leading-relaxed">{product.description}</p>
                </div>
              )}
              
              {/* Specifications */}
              <div className="p-4 bg-white/30 dark:bg-slate-800/30 rounded-lg border border-gray-200 dark:border-slate-700">
                <h4 className="font-semibold text-foreground mb-2">Specifications</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-200/50 dark:border-slate-700/50">
                    <span className="text-muted-foreground">Brand:</span>
                    <span className="font-medium text-foreground">{product.brand}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200/50 dark:border-slate-700/50">
                    <span className="text-muted-foreground">Category:</span>
                    <span className="font-medium text-foreground">{product.category}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200/50 dark:border-slate-700/50">
                    <span className="text-muted-foreground">Rating:</span>
                    <span className="font-medium text-foreground">{product.rating}/5 stars</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200/50 dark:border-slate-700/50">
                    <span className="text-muted-foreground">Reviews:</span>
                    <span className="font-medium text-foreground">{product.reviewCount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              {/* Customer Reviews Preview */}
              <div className="p-4 bg-white/30 dark:bg-slate-800/30 rounded-lg border border-gray-200 dark:border-slate-700 animate-slide-in-right">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-foreground">Customer Reviews</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllReviews(true)}
                    className="text-orange-600 dark:text-cyan-400 border-orange-200 dark:border-cyan-600 hover:bg-orange-50 dark:hover:bg-cyan-900/20"
                  >
                    View All
                  </Button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {reviewsData.slice(0, 5).map((review, index) => (
                    <div 
                      key={index} 
                      className="flex-shrink-0 w-80 p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-gray-200/30 dark:border-slate-700/30 animate-slide-in-right"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{review.name}</span>
                          {review.verified && (
                            <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                              Verified
                            </span>
                          )}
                        </div>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${
                                i < review.rating
                                  ? "text-yellow-500 fill-current"
                                  : "text-gray-300 dark:text-gray-600"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                      <p className="text-xs text-muted-foreground mt-1">Marketplace Verified Purchase</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>



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

              <Button
                onClick={handleAddToCart}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 dark:from-cyan-500 dark:to-cyan-600 dark:hover:from-cyan-600 dark:hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                size="lg"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Cart
              </Button>
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
                      {requiredCrypto.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 })} {selectedCrypto}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      = ${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
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

      {/* Suggested Products */}
      <div className="container mx-auto px-4 py-6">
        <h2 className="text-xl font-bold text-foreground mb-4">You might also like</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {[
            { title: "Apple AirPods Pro (2nd Generation)", price: "249.00", image: "https://m.media-amazon.com/images/I/61SUj2aKoEL._AC_SL1500_.jpg", asin: "B087CQR456" },
            { title: "Samsung Galaxy Watch 4", price: "279.99", image: "https://m.media-amazon.com/images/I/61MWOGeVCJL._AC_SL1500_.jpg", asin: "B08GGGHLZD" },
            { title: "Sony WH-1000XM5 Wireless Headphones", price: "399.99", image: "https://m.media-amazon.com/images/I/71o8Q5XJS5L._AC_SL1500_.jpg", asin: "B0BSHF7LKS" },
            { title: "iPad Air (5th Generation)", price: "599.00", image: "https://m.media-amazon.com/images/I/61NGnpjoTDL._AC_SL1500_.jpg", asin: "B09JQMJHXY" },
            { title: "Nintendo Switch OLED Model", price: "349.99", image: "https://m.media-amazon.com/images/I/61-PblYntsL._AC_SL1500_.jpg", asin: "B08N5WRWNZ" },
            { title: "MacBook Air M2", price: "1199.00", image: "https://m.media-amazon.com/images/I/71jG+e7roXL._AC_SL1500_.jpg", asin: "B087XZQGBW" }
          ].map((item, index) => (
            <Card 
              key={index} 
              className="flex-shrink-0 w-40 group cursor-pointer hover:shadow-lg transition-shadow duration-300"
              onClick={() => setLocation(`/product/${item.asin}`)}
            >
              <CardContent className="p-3">
                <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg mb-3 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
                <h3 className="font-medium text-sm text-foreground line-clamp-2 mb-1">{item.title}</h3>
                <p className="font-bold text-orange-600 dark:text-cyan-400">${item.price}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* NFT Purchase Rewards */}
      <div className="container mx-auto px-4 py-6">
        <h2 className="text-xl font-bold text-foreground mb-4">NFT Purchase Rewards</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { tier: "Bronze", value: "$50+", color: "from-amber-600 to-amber-700", reward: "Bronze NFT" },
            { tier: "Silver", value: "$100+", color: "from-gray-400 to-gray-600", reward: "Silver NFT" },
            { tier: "Gold", value: "$250+", color: "from-yellow-400 to-yellow-600", reward: "Gold NFT" },
            { tier: "Diamond", value: "$500+", color: "from-cyan-400 to-blue-600", reward: "Diamond NFT" }
          ].map((reward, index) => (
            <Card key={index} className={`bg-gradient-to-br ${reward.color} text-white`}>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold mb-1">{reward.tier}</div>
                <div className="text-sm opacity-90 mb-2">{reward.value} purchase value</div>
                <div className="text-xs opacity-80">{reward.reward}</div>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-4 text-center">
          Earn NFT rewards with crypto purchases valued $50+. Each NFT provides exclusive benefits, early access, and rewards including shopping discounts, VIP perks, and special offers.
        </p>
      </div>

      {/* All Reviews Modal */}
      <Dialog open={showAllReviews} onOpenChange={setShowAllReviews}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-orange-200/50 dark:border-cyan-600/50">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground mb-4">
              Customer Reviews ({reviewsData.length})
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto pr-2 space-y-4 max-h-[60vh] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-slate-800 [&::-webkit-scrollbar-thumb]:bg-orange-300 dark:[&::-webkit-scrollbar-thumb]:bg-cyan-600 [&::-webkit-scrollbar-thumb]:rounded-full">
            {reviewsData.map((review, index) => (
              <div key={index} className="p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-slate-700/50 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-base">{review.name}</span>
                      {review.verified && (
                        <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                          Verified
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">{review.date}</span>
                  </div>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < review.rating
                            ? "text-yellow-500 fill-current"
                            : "text-gray-300 dark:text-gray-600"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-2">{review.comment}</p>
                <p className="text-xs text-muted-foreground">Marketplace Verified Purchase</p>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-700">
            <Button
              onClick={() => setShowAllReviews(false)}
              className="bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Share Modal */}
      <ProductShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        product={product}
        onShare={(conversationIds) => {
          if (product) {
            shareProductMutation.mutate({
              conversationIds,
              productId: product.ASIN,
              productTitle: product.title,
              productPrice: product.price,
              productImage: product.imageUrl,
            });
          }
        }}
        isSharing={shareProductMutation.isPending}
      />

      {/* Shopping Cart Modal */}
      <ShoppingCartComponent 
        isOpen={showCartModal} 
        onClose={() => {
          setShowCartModal(false);
          setCartCount(getCartCount()); // Update cart count when closing
        }} 
      />
      </div>
    </div>
  );
}

// Product Share Modal Content Component
interface ProductShareModalContentProps {
  product: Product | null;
  onShare: (conversationIds: number[]) => void;
  onClose: () => void;
  isSharing: boolean;
}

function ProductShareModalContent({ product, onShare, onClose, isSharing }: ProductShareModalContentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversations, setSelectedConversations] = useState<Set<number>>(new Set());

  // Get connected user from localStorage for conversation query
  const connectedUserString = localStorage.getItem('connectedUser');
  const connectedUser = connectedUserString ? JSON.parse(connectedUserString) : null;

  const { data: conversations = [] } = useQuery<any[]>({
    queryKey: ["/api/conversations", connectedUser?.id],
    queryFn: () => {
      if (!connectedUser?.id) return [];
      return fetch(`/api/conversations?userId=${connectedUser.id}`).then(res => res.json());
    },
    enabled: !!connectedUser?.id
  });

  const filteredConversations = conversations.filter(conv => 
    conv.otherUser?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.otherUser?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleConversationSelection = (conversationId: number) => {
    const newSelected = new Set(selectedConversations);
    if (newSelected.has(conversationId)) {
      newSelected.delete(conversationId);
    } else {
      newSelected.add(conversationId);
    }
    setSelectedConversations(newSelected);
  };

  const handleShare = () => {
    if (selectedConversations.size === 0) return;
    onShare(Array.from(selectedConversations));
  };

  if (!product) return null;

  return (
    <div className="flex flex-col max-h-[70vh]">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
      {/* Product Preview Card */}
      <div className="bg-gradient-to-r from-orange-50 to-pink-50 dark:from-orange-950/20 dark:to-pink-950/20 rounded-xl p-4 border border-orange-200/30 dark:border-orange-800/30">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-16 h-16 object-cover rounded-lg shadow-md"
            />
            <div className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full p-1">
              <Share className="h-3 w-3 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground line-clamp-2 mb-1">{product.title}</h3>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-orange-600 dark:text-orange-400">${formatPrice(product.price)}</span>
              <Badge variant="secondary" className="text-xs">{product.category}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Header */}
      <div className="space-y-3">
        <div className="text-center">
          <h4 className="text-sm font-medium text-foreground mb-1">Select Contacts</h4>
          <p className="text-xs text-muted-foreground">Choose who to share this product with</p>
        </div>
        
        <div className="relative">
          <Input
            type="text"
            placeholder="Search your contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-white/50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 focus:border-orange-400 dark:focus:border-orange-500"
          />
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      {/* Conversations List */}
      <div className="space-y-2">
        {filteredConversations.length > 0 ? (
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => toggleConversationSelection(conversation.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                  selectedConversations.has(conversation.id)
                    ? 'bg-gradient-to-r from-orange-100 to-pink-100 dark:from-orange-900/30 dark:to-pink-900/30 border-orange-300 dark:border-orange-600 shadow-md scale-[1.02]'
                    : 'bg-white/70 dark:bg-slate-800/70 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/70 hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              >
                <Avatar className="w-10 h-10 ring-2 ring-white dark:ring-slate-800">
                  <AvatarImage src={conversation.otherUser?.profilePicture || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-pink-500 text-white text-sm font-semibold">
                    {conversation.otherUser?.displayName?.charAt(0) || conversation.otherUser?.username?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {conversation.otherUser?.displayName || conversation.otherUser?.username || 'Unknown User'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {conversation.otherUser?.username && conversation.otherUser?.displayName !== conversation.otherUser?.username 
                      ? `@${conversation.otherUser.username}` 
                      : 'COYN Contact'}
                  </p>
                </div>
                <div className={`transition-all duration-200 ${
                  selectedConversations.has(conversation.id) ? 'scale-110' : 'scale-100'
                }`}>
                  {selectedConversations.has(conversation.id) ? (
                    <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 border-2 border-gray-300 dark:border-slate-600 rounded-full"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-gray-100 dark:bg-slate-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">No contacts found</h3>
            <p className="text-xs text-muted-foreground">
              {searchQuery ? 'Try a different search term' : 'Start chatting to see contacts here'}
            </p>
          </div>
        )}
      </div>

      {/* Selected Count */}
      {selectedConversations.size > 0 && (
        <div className="bg-gradient-to-r from-orange-100 to-pink-100 dark:from-orange-900/20 dark:to-pink-900/20 rounded-lg p-3 border border-orange-200/50 dark:border-orange-800/50">
          <p className="text-sm font-medium text-orange-700 dark:text-orange-300 text-center">
            {selectedConversations.size} contact{selectedConversations.size > 1 ? 's' : ''} selected
          </p>
        </div>
      )}


      </div>

      {/* Sticky Action Buttons */}
      <div className="sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-slate-700 p-4 mt-4">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-12 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800"
            disabled={isSharing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={selectedConversations.size === 0 || isSharing}
            className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white border-0 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSharing ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Sharing...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                <span>Share Product</span>
                {selectedConversations.size > 0 && (
                  <Badge variant="secondary" className="bg-white/20 text-white text-xs ml-1">
                    {selectedConversations.size}
                  </Badge>
                )}
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}