import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Home, Search, Filter, Star, Coins, ShoppingCart, Zap, TrendingUp, Package, Users, CreditCard, ArrowRight, X } from "lucide-react";
import coynLogoPath from "@assets/COYN-symbol-square_1750808237977.png";

interface AmazonProduct {
  ASIN: string;
  title: string;
  price: string;
  currency: string;
  imageUrl: string;
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
  product: AmazonProduct | null;
  isOpen: boolean;
  onClose: () => void;
  cryptoRates: CryptoRates;
}

function PurchaseModal({ product, isOpen, onClose, cryptoRates }: PurchaseModalProps) {
  const [selectedCrypto, setSelectedCrypto] = useState("COYN");
  const { toast } = useToast();

  if (!product) return null;

  const usdPrice = parseFloat(product.price);
  const cryptoPrices = {
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
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [selectedProduct, setSelectedProduct] = useState<AmazonProduct | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  // Fetch Amazon products with debounced search
  const { data: amazonProducts = [], isLoading: isLoadingProducts } = useQuery<AmazonProduct[]>({
    queryKey: ["/api/amazon/search", searchQuery, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      
      const res = await fetch(`/api/amazon/search?${params}`);
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
    { value: "all", label: "All Categories", icon: Package },
    { value: "services", label: "Services", icon: Users },
    { value: "nft", label: "NFTs", icon: Star },
    { value: "tools", label: "Tools", icon: Zap },
    { value: "education", label: "Education", icon: TrendingUp },
    { value: "real-estate", label: "Real Estate", icon: Home }
  ];

  const allItems = [...amazonProducts, ...legacyItems];
  
  // Filter out items without images and apply search/category filters
  const filteredItems = allItems.filter(item => {
    // Check if item has a valid image
    const hasImage = isAmazonProduct ? item.imageUrl && item.imageUrl.trim() !== '' : item.image && item.image.trim() !== '';
    if (!hasImage) return false;
    
    const isAmazonProduct = 'ASIN' in item;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (isAmazonProduct ? item.brand?.toLowerCase() : item.seller?.toLowerCase())?.includes(searchQuery.toLowerCase());
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

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-slate-900 dark:to-slate-800 border-b border-orange-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img 
                    src={coynLogoPath} 
                    alt="COYN Logo" 
                    className="w-12 h-12 drop-shadow-md"
                  />
                  <div className="absolute -inset-1 bg-orange-400/20 dark:bg-cyan-400/20 rounded-full blur-sm -z-10"></div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 dark:from-cyan-400 dark:to-cyan-600 bg-clip-text text-transparent">
                    COYN Marketplace
                  </h1>
                  <p className="text-sm text-orange-700 dark:text-cyan-300 font-medium">
                    Shop Amazon with Cryptocurrency • Powered by COYN
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="hidden md:flex items-center space-x-2 text-sm text-orange-600 dark:text-cyan-400">
                <Coins className="h-4 w-4" />
                <span className="font-medium">Pay with BTC, BNB, USDT, COYN</span>
              </div>
              <Button
                onClick={() => setLocation("/")}
                className="bg-orange-500 hover:bg-orange-600 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white shadow-md transition-all duration-200 hover:shadow-lg"
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Advanced Search Engine */}
        <div className="mb-8 space-y-6">
          {/* Main Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              placeholder="Search for products on Amazon... (e.g. 'wireless headphones', 'coffee maker', 'gaming laptop')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-lg bg-white dark:bg-card border-2 border-gray-200 dark:border-slate-600 focus:border-orange-500 dark:focus:border-cyan-400"
            />
            {searchQuery && (
              <Button
                onClick={() => setSearchQuery("")}
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Search Suggestions */}
          {!searchQuery && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground mr-2">Popular searches:</span>
              {['wireless earbuds', 'smart watch', 'laptop', 'coffee maker', 'gaming mouse'].map((suggestion) => (
                <Button
                  key={suggestion}
                  onClick={() => setSearchQuery(suggestion)}
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-xs border-gray-300 dark:border-slate-600 hover:border-orange-500 dark:hover:border-cyan-400"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          )}

          {/* Filters and Sort */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex gap-2 flex-1">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
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
              const imageUrl = isAmazonProduct ? item.imageUrl : item.image;
              
              return (
                <Card key={itemKey} className="bg-white dark:bg-card border-border hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-foreground line-clamp-1">
                          {item.title}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          by {isAmazonProduct ? item.brand || 'Amazon' : seller}
                        </p>
                      </div>
                      {(isAmazonProduct || item.featured) && (
                        <Badge className="bg-orange-500 text-white ml-2">
                          <Star className="h-3 w-3 mr-1" />
                          {isAmazonProduct ? 'Amazon' : 'Featured'}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                      <img 
                        src={imageUrl || 'https://via.placeholder.com/400x300?text=No+Image'} 
                        alt={item.title}
                        className="w-full h-full object-contain hover:object-cover transition-all duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
                        }}
                      />
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.description || 'No description available'}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="text-sm font-medium">{item.rating}</span>
                        {isAmazonProduct && item.reviewCount > 0 && (
                          <span className="text-xs text-muted-foreground">({item.reviewCount})</span>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {item.category}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-bold text-foreground">
                            ${item.price}
                          </span>
                        </div>
                        {isAmazonProduct && (
                          <div className="text-xs text-muted-foreground">
                            ≈ {(parseFloat(item.price) / cryptoRates.COYN).toFixed(0)} COYN
                          </div>
                        )}
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => handleProductClick(item)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        {isAmazonProduct ? 'Buy with Crypto' : 'Contact Seller'}
                      </Button>
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
    </div>
  );
}