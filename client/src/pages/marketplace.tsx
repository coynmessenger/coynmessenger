import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Home, Search, Filter, Star, Coins, ShoppingCart, Zap, TrendingUp, Package, Users, CreditCard, ArrowRight, X, Settings, Info, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ArrowUp, Heart, Wallet } from "lucide-react";
import coynLogoPath from "@assets/COYN-symbol-square_1750892698348.png";
import SettingsModal from "@/components/settings-modal";
import MarketplaceCheckout from "@/components/marketplace-checkout";
import { addToCart, getCartCount } from "@/components/shopping-cart";
import WalletHover from "@/components/wallet-hover";

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

interface PurchaseModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  cryptoRates: CryptoRates;
}

function PurchaseModal({ product, isOpen, onClose, cryptoRates }: PurchaseModalProps) {
  const [selectedCrypto, setSelectedCrypto] = useState("COYN");
  const { toast } = useToast();

  if (!product) return null;

  const usdPrice = parseFloat(product.price);
  const cryptoPrices: Record<string, string> = {
    BTC: (usdPrice / cryptoRates.BTC).toFixed(8),
    BNB: (usdPrice / cryptoRates.BNB).toFixed(6),
    USDT: (usdPrice / cryptoRates.USDT).toFixed(2),
    COYN: (usdPrice / cryptoRates.COYN).toFixed(2)
  };

  const handlePurchase = () => {
    toast({
      title: "Purchase Initiated",
      description: `Converting ${cryptoPrices[selectedCrypto]} ${selectedCrypto} to USD for Amazon purchase...`,
    });
    
    setTimeout(() => {
      toast({
        title: "Purchase Successful",
        description: `${product.title} ordered successfully! Crypto converted and payment processed.`,
      });
      onClose();
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-orange-500 dark:text-cyan-400">Purchase with Crypto</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="flex space-x-4">
            <img 
              src={product.imageUrl} 
              alt={product.title}
              className="w-20 h-20 object-cover rounded-lg"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground line-clamp-2">{product.title}</h3>
              <p className="text-sm text-muted-foreground">{product.brand}</p>
              <p className="text-lg font-bold text-green-600">${product.price} USD</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Pay with Cryptocurrency:</label>
            <Select value={selectedCrypto} onValueChange={setSelectedCrypto}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(cryptoPrices).map(([crypto, price]) => (
                  <SelectItem key={crypto} value={crypto}>
                    <div className="flex justify-between items-center w-full">
                      <span>{crypto}</span>
                      <span className="text-muted-foreground ml-2">{price}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Payment Process:</h4>
            <div className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <p>1. Your {selectedCrypto} will be converted to USD</p>
              <p>2. Payment processed through Amazon</p>
              <p>3. Product shipped to your address</p>
              <p>4. Transaction secured via blockchain</p>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={handlePurchase}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Pay {cryptoPrices[selectedCrypto]} {selectedCrypto}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="border-gray-300 dark:border-slate-600"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MarketplacePage() {
  useScrollToTop();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [showWalletHover, setShowWalletHover] = useState(false);
  const walletButtonRef = useRef<HTMLButtonElement>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [imageIndexes, setImageIndexes] = useState<Map<string, number>>(new Map());
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { toast } = useToast();

  // Fetch marketplace products with debounced search
  const { data: marketplaceProducts = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/marketplace/search", searchQuery, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      
      const res = await fetch(`/api/marketplace/search?${params}`);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
    enabled: searchQuery.length >= 3 || searchQuery.length === 0 || selectedCategory !== 'all',
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false
  });

  // Fetch crypto rates
  const { data: cryptoRates = { BTC: 45000, BNB: 300, USDT: 1, COYN: 0.15 } } = useQuery<CryptoRates>({
    queryKey: ["/api/crypto/rates"],
    queryFn: async () => {
      const res = await fetch("/api/crypto/rates");
      if (!res.ok) throw new Error("Failed to fetch crypto rates");
      return res.json();
    },
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch user favorites
  const { data: favorites = [] } = useQuery({
    queryKey: ["/api/favorites"],
    queryFn: async () => {
      const res = await fetch("/api/favorites");
      if (!res.ok) throw new Error("Failed to fetch favorites");
      return res.json();
    }
  });

  const queryClient = useQueryClient();

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (product: any) => {
      const favoriteData = {
        productId: product.ASIN,
        productTitle: product.title,
        productPrice: product.price,
        productImage: product.imageUrl,
        productCategory: product.category,
        productRating: product.rating || 0
      };
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(favoriteData)
      });
      if (!res.ok) throw new Error("Failed to toggle favorite");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    }
  });

  // Helper function to check if product is favorited
  const isProductFavorited = (productId: string): boolean => {
    return favorites.some((fav: any) => fav.productId === productId);
  };

  // Legacy sample items for comparison
  const legacyItems = [
    {
      id: 1,
      title: "Premium COYN Staking Service",
      description: "Earn up to 12% APY with our professional staking service. Secure and reliable.",
      price: "100",
      currency: "COYN",
      seller: "StakeProfi",
      rating: 4.8,
      category: "services",
      featured: true
    },
    {
      id: 2,
      title: "NFT Collection: Digital Art Pack",
      description: "Exclusive digital art collection with 50 unique pieces. Limited edition.",
      price: "0.5",
      currency: "BNB",
      seller: "ArtistCrypto",
      rating: 4.6,
      category: "nft"
    },
    {
      id: 3,
      title: "Crypto Trading Bot License",
      description: "Automated trading bot with proven strategies. 30-day money back guarantee.",
      price: "250",
      currency: "USDT",
      seller: "TradeMaster",
      rating: 4.9,
      category: "tools",
      featured: true
    },
    {
      id: 4,
      title: "DeFi Yield Farming Guide",
      description: "Complete guide to maximize your DeFi earnings. Step-by-step tutorials included.",
      price: "50",
      currency: "COYN",
      seller: "DeFiExpert",
      rating: 4.7,
      category: "education"
    },
    {
      id: 5,
      title: "Smart Contract Audit Service",
      description: "Professional smart contract security audit by certified experts.",
      price: "2",
      currency: "BNB",
      seller: "SecureCode",
      rating: 5.0,
      category: "services"
    },
    {
      id: 6,
      title: "Metaverse Land Plot",
      description: "Prime virtual real estate in the COYN metaverse. Great investment opportunity.",
      price: "1500",
      currency: "COYN",
      seller: "MetaLands",
      rating: 4.5,
      category: "real-estate"
    }
  ];

  const categories = [
    { value: "all", label: "Categories", icon: Package },
    { value: "electronics", label: "Electronics", icon: Zap },
    { value: "home-garden", label: "Home & Garden", icon: Home },
    { value: "clothing", label: "Clothing & Fashion", icon: Star },
    { value: "books", label: "Books & Media", icon: TrendingUp },
    { value: "sports", label: "Sports & Outdoors", icon: Users }
  ];

  const allItems = [...marketplaceProducts, ...legacyItems];
  
  // Filter items and apply search/category filters
  const filteredItems = allItems.filter(item => {
    const isMarketplaceProduct = 'ASIN' in item;
    
    // Only filter out items that explicitly have no image URL at all
    const hasValidImageUrl = isMarketplaceProduct ? 
      item.imageUrl && item.imageUrl.trim() !== '' && !item.imageUrl.includes('placeholder') : 
      ('image' in item && typeof item.image === 'string' && item.image.trim() !== '' && !item.image.includes('placeholder'));
    
    // Allow items with valid image URLs or marketplace products (they have fallback handling)
    if (!hasValidImageUrl && !isMarketplaceProduct) return false;
    
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (isMarketplaceProduct ? item.brand?.toLowerCase() : item.seller?.toLowerCase())?.includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const sortedItems = filteredItems.sort((a, b) => {
    switch (sortBy) {
      case "featured":
        const aFeatured = 'featured' in a ? a.featured : false;
        const bFeatured = 'featured' in b ? b.featured : true; // Amazon products are "featured"
        return (bFeatured ? 1 : 0) - (aFeatured ? 1 : 0);
      case "price-low":
        return parseFloat(a.price) - parseFloat(b.price);
      case "price-high":
        return parseFloat(b.price) - parseFloat(a.price);
      case "rating":
        return b.rating - a.rating;
      default:
        return 0;
    }
  });

  const handleProductClick = (item: any) => {
    if ('ASIN' in item) {
      // Amazon product
      setSelectedProduct(item);
      setShowPurchaseModal(true);
    } else {
      // Legacy marketplace item - show info
      alert(`This is a marketplace service. Contact ${item.seller} for details.`);
    }
  };

  const toggleProductDetails = (itemKey: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(itemKey)) {
      newExpanded.delete(itemKey);
    } else {
      newExpanded.add(itemKey);
    }
    setExpandedProducts(newExpanded);
  };

  const nextImage = (productKey: string, totalImages: number) => {
    const current = imageIndexes.get(productKey) || 0;
    const next = (current + 1) % totalImages;
    setImageIndexes(new Map(imageIndexes.set(productKey, next)));
  };

  const prevImage = (productKey: string, totalImages: number) => {
    const current = imageIndexes.get(productKey) || 0;
    const prev = current === 0 ? totalImages - 1 : current - 1;
    setImageIndexes(new Map(imageIndexes.set(productKey, prev)));
  };

  const goToImage = (productKey: string, index: number) => {
    setImageIndexes(new Map(imageIndexes.set(productKey, index)));
  };

  // Handle scroll to top functionality
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Initialize cart count on page load
  useEffect(() => {
    setCartCount(getCartCount());
  }, []);

  // Listen for cart updates across components
  useEffect(() => {
    const handleCartUpdate = (event: CustomEvent) => {
      setCartCount(event.detail.count);
    };

    window.addEventListener('cartUpdated', handleCartUpdate as EventListener);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate as EventListener);
  }, []);

  // Update cart count when cart modal closes
  useEffect(() => {
    if (!showCart) {
      setCartCount(getCartCount());
    }
  }, [showCart]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 sm:px-4 py-3 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-3">
              <Button
                onClick={() => setLocation('/')}
                variant="ghost"
                size="icon"
                className="hover:bg-accent h-12 w-12 sm:h-9 sm:w-9 touch-manipulation"
              >
                <Home className="h-6 w-6 sm:h-4 sm:w-4" />
              </Button>
              <Button
                onClick={() => setLocation('/favorites')}
                variant="ghost"
                size="icon"
                className="hover:bg-accent h-12 w-12 sm:h-9 sm:w-9 touch-manipulation"
              >
                <Heart className="h-6 w-6 sm:h-4 sm:w-4" />
              </Button>
              <Button
                ref={walletButtonRef}
                onClick={() => setShowWalletHover(!showWalletHover)}
                variant="ghost"
                size="icon"
                className="hover:bg-accent relative h-12 w-12 sm:h-9 sm:w-9 touch-manipulation"
              >
                <Wallet className="h-6 w-6 sm:h-4 sm:w-4 text-orange-500 dark:text-cyan-400" />
              </Button>
            </div>
            <div className="flex items-center gap-2 sm:gap-2">
              <Button
                onClick={() => setShowCart(true)}
                variant="ghost"
                size="icon"
                className="hover:bg-accent relative h-12 w-12 sm:h-9 sm:w-9 touch-manipulation"
              >
                <ShoppingCart className="h-5 w-5 sm:h-4 sm:w-4" />
                {cartCount > 0 && (
                  <Badge 
                    className="absolute -top-2 -right-2 h-5 w-5 sm:h-4 sm:w-4 rounded-full p-0 flex items-center justify-center bg-orange-500 dark:bg-cyan-500 text-white text-xs sm:text-[10px]"
                  >
                    {cartCount}
                  </Badge>
                )}
              </Button>
              <Button
                onClick={() => setShowSettingsModal(true)}
                variant="ghost"
                size="icon"
                className="hover:bg-accent h-12 w-12 sm:h-9 sm:w-9 touch-manipulation"
              >
                <Settings className="h-6 w-6 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Advanced Search Engine */}
        <div className="mb-6 sm:mb-8 space-y-4 sm:space-y-6">
          {/* Main Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 sm:h-5 sm:w-5" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 sm:pl-12 h-14 sm:h-12 text-lg sm:text-lg bg-white dark:bg-card border-2 border-gray-200 dark:border-slate-600 focus:border-orange-500 dark:focus:border-cyan-400 touch-manipulation"
            />
            {searchQuery && (
              <Button
                onClick={() => setSearchQuery("")}
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-9 w-9 sm:h-8 sm:w-8 p-0"
              >
                <X className="h-4 w-4 sm:h-3 sm:w-3" />
              </Button>
            )}
          </div>



          {/* Filters and Sort */}
          <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
            <div className="flex gap-2 flex-1 overflow-x-auto">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40 sm:w-48 h-10 sm:h-9">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      <div className="flex items-center">
                        <category.icon className="h-4 w-4 mr-2" />
                        {category.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured Items</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search Stats */}
            <div className="flex items-center text-sm text-muted-foreground">
              {isLoadingProducts ? (
                <span>Searching...</span>
              ) : (
                <span>{sortedItems.length} products found</span>
              )}
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchQuery || selectedCategory !== 'all') && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {searchQuery && (
                <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300">
                  Search: "{searchQuery}"
                  <Button
                    onClick={() => setSearchQuery("")}
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-2"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              {selectedCategory !== 'all' && (
                <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                  Category: {categories.find(c => c.value === selectedCategory)?.label}
                  <Button
                    onClick={() => setSelectedCategory("all")}
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-2"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              <Button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Marketplace Grid */}
        {isLoadingProducts ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-white dark:bg-card border-border animate-pulse">
                <CardHeader className="pb-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-2"></div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedItems.map((item) => {
              const isAmazonProduct = 'ASIN' in item;
              const itemKey = isAmazonProduct ? item.ASIN : item.id;
              const seller = isAmazonProduct ? 'Amazon' : item.seller;
              const imageUrl = isAmazonProduct ? item.imageUrl : (item as any).image;
              const images = isAmazonProduct && item.images ? item.images : [imageUrl].filter(Boolean);
              const currentImageIndex = imageIndexes.get(itemKey.toString()) || 0;
              
              return (
                <Card 
                  key={itemKey} 
                  className="bg-white dark:bg-card border-border hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => isAmazonProduct ? setLocation(`/product/${item.ASIN}`) : handleProductClick(item)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-base font-semibold text-foreground line-clamp-2 leading-tight">
                          {item.title}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          by {isAmazonProduct ? item.brand || 'Amazon' : seller}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-accent"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavoriteMutation.mutate(item);
                          }}
                        >
                          <Heart 
                            className={`h-4 w-4 ${
                              isProductFavorited(itemKey.toString()) 
                                ? 'fill-red-500 text-red-500' 
                                : 'text-muted-foreground hover:text-red-500'
                            }`} 
                          />
                        </Button>
                        {(isAmazonProduct || item.featured) && (
                          <Badge className="bg-orange-500 text-white">
                            <Star className="h-3 w-3 mr-1" />
                            {isAmazonProduct ? 'Amazon' : 'Featured'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Product Image Carousel */}
                    <div className="relative w-full h-48 bg-gray-100 dark:bg-slate-800 rounded-lg overflow-hidden group">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-slate-700">
                              {images[currentImageIndex] && images[currentImageIndex].trim() !== '' ? (
                                <img
                                  src={images[currentImageIndex]}
                                  alt={`${item.title} - Image ${currentImageIndex + 1}`}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-help"
                                  loading="lazy"
                                  onLoad={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'block';
                                  }}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    // Try next image if available
                                    const nextIndex = (currentImageIndex + 1) % images.length;
                                    if (nextIndex !== currentImageIndex && images[nextIndex]) {
                                      setImageIndexes(prev => new Map(prev.set(itemKey.toString(), nextIndex)));
                                    }
                                  }}
                                  style={{ display: 'block' }}
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                  <div className="text-center p-4">
                                    <div className="w-16 h-16 mx-auto mb-2 bg-muted rounded-full flex items-center justify-center">
                                      <Package className="w-8 h-8" />
                                    </div>
                                    <p className="text-sm font-medium">{item.title}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Image not available</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <div className="space-y-2">
                              <p className="font-medium">{item.title}</p>
                              <p className="text-sm text-muted-foreground">{item.description || 'Premium quality product available for crypto purchase.'}</p>
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center">
                                  <Star className="h-4 w-4 text-yellow-500 fill-current mr-1" />
                                  <span className="text-sm">{item.rating}</span>
                                </div>
                                {isAmazonProduct && item.reviewCount > 0 && (
                                  <span className="text-sm text-muted-foreground">({item.reviewCount} reviews)</span>
                                )}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* Navigation Arrows - Only show if multiple images */}
                      {images.length > 1 && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              prevImage(itemKey.toString(), images.length);
                            }}
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              nextImage(itemKey.toString(), images.length);
                            }}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </>
                      )}

                      {/* Image Indicators - Only show if multiple images */}
                      {images.length > 1 && (
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {images.map((_, index) => (
                            <button
                              key={index}
                              onClick={(e) => {
                                e.stopPropagation();
                                goToImage(itemKey.toString(), index);
                              }}
                              className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                                index === currentImageIndex
                                  ? 'bg-white'
                                  : 'bg-white/50 hover:bg-white/75'
                              }`}
                            />
                          ))}
                        </div>
                      )}

                      {/* Image Counter - Only show if multiple images */}
                      {images.length > 1 && (
                        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {currentImageIndex + 1}/{images.length}
                        </div>
                      )}
                    </div>
                    
                    {/* Expandable Description Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleProductDetails(itemKey.toString())}
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Info className="h-3 w-3 mr-1" />
                          Details & Reviews
                          {expandedProducts.has(itemKey.toString()) ? (
                            <ChevronUp className="h-3 w-3 ml-1" />
                          ) : (
                            <ChevronDown className="h-3 w-3 ml-1" />
                          )}
                        </Button>
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="text-sm font-medium">{item.rating}</span>
                          {isAmazonProduct && item.reviewCount > 0 && (
                            <span className="text-xs text-muted-foreground">({item.reviewCount})</span>
                          )}
                        </div>
                      </div>

                      {expandedProducts.has(itemKey.toString()) && (
                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3 border-l-4 border-orange-500 dark:border-cyan-400">
                          {/* Description */}
                          <div>
                            <h4 className="text-sm font-medium text-foreground mb-2">Description</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {item.description || 'No detailed description available for this product.'}
                            </p>
                          </div>
                          
                          {/* Product Details */}
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            {isAmazonProduct && item.brand && (
                              <div>
                                <span className="text-muted-foreground">Brand:</span>
                                <span className="font-medium text-foreground ml-1">{item.brand}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-muted-foreground">Category:</span>
                              <span className="font-medium text-foreground ml-1">{item.category}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Rating:</span>
                              <span className="font-medium text-foreground ml-1">{item.rating}/5 stars</span>
                            </div>
                            {isAmazonProduct && item.reviewCount > 0 && (
                              <div>
                                <span className="text-muted-foreground">Reviews:</span>
                                <span className="font-medium text-foreground ml-1">{item.reviewCount} customer reviews</span>
                              </div>
                            )}
                          </div>

                          {/* Mock Reviews for Amazon Products */}
                          {isAmazonProduct && (
                            <div>
                              <h4 className="text-sm font-medium text-foreground mb-2">Recent Reviews</h4>
                              <div className="space-y-2">
                                <div className="bg-white dark:bg-slate-700 rounded p-2">
                                  <div className="flex items-center space-x-1 mb-1">
                                    <div className="flex">
                                      {[...Array(5)].map((_, i) => (
                                        <Star key={i} className="h-3 w-3 text-yellow-500 fill-current" />
                                      ))}
                                    </div>
                                    <span className="text-xs font-medium">Verified Purchase</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    "Great product! Exactly as described and arrived quickly. Highly recommend for anyone looking for quality."
                                  </p>
                                </div>
                                <div className="bg-white dark:bg-slate-700 rounded p-2">
                                  <div className="flex items-center space-x-1 mb-1">
                                    <div className="flex">
                                      {[...Array(4)].map((_, i) => (
                                        <Star key={i} className="h-3 w-3 text-yellow-500 fill-current" />
                                      ))}
                                      <Star className="h-3 w-3 text-gray-300" />
                                    </div>
                                    <span className="text-xs font-medium">Verified Purchase</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    "Very satisfied with this purchase. Good value for money and works as expected."
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-bold text-foreground">
                            ${item.price}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {item.category}
                          </Badge>
                        </div>
                        {isAmazonProduct && (
                          <div className="text-xs text-muted-foreground">
                            ≈ {(parseFloat(item.price) / cryptoRates.COYN).toFixed(0)} COYN
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isAmazonProduct) {
                              const newCount = addToCart(item);
                              setCartCount(newCount);
                              toast({
                                title: "Added to Cart",
                                description: `${item.title} has been added to your cart`
                              });
                            } else {
                              handleProductClick(item);
                            }
                          }}
                          className="flex-1 bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white"
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          {isAmazonProduct ? 'Cart' : 'Contact'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {sortedItems.length === 0 && !isLoadingProducts && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No products found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? `No results for "${searchQuery}". Try a different search term.`
                : "Try searching for a product or adjusting your filters"
              }
            </p>
            {searchQuery && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Suggestions:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['electronics', 'books', 'home', 'fashion', 'sports'].map((suggestion) => (
                    <Button
                      key={suggestion}
                      onClick={() => setSearchQuery(suggestion)}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      Search "{suggestion}"
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Purchase Modal */}
        <PurchaseModal 
          product={selectedProduct}
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
          cryptoRates={cryptoRates}
        />

        {/* Settings Modal */}
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          showShipping={true}
        />

        {/* Statistics */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white dark:bg-card border-border text-center">
            <CardContent className="pt-6">
              <Package className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">{allItems.length}+</div>
              <div className="text-sm text-muted-foreground">Amazon Products</div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-card border-border text-center">
            <CardContent className="pt-6">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">150+</div>
              <div className="text-sm text-muted-foreground">Active Sellers</div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-card border-border text-center">
            <CardContent className="pt-6">
              <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">$2.5M+</div>
              <div className="text-sm text-muted-foreground">Volume Traded</div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-card border-border text-center">
            <CardContent className="pt-6">
              <Star className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">4.8</div>
              <div className="text-sm text-muted-foreground">Avg Rating</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Marketplace Checkout Modal */}
      <MarketplaceCheckout 
        isOpen={showCart}
        onClose={() => setShowCart(false)}
      />

      {/* Wallet Hover Component */}
      <WalletHover
        isVisible={showWalletHover}
        onClose={() => setShowWalletHover(false)}
        anchorRef={walletButtonRef}
      />

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 rounded-full w-12 h-12 shadow-lg bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white"
          size="icon"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}