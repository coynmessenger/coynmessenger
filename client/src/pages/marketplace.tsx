import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Home, Search, Filter, Star, Coins, ShoppingCart, Zap, TrendingUp, Package, Users } from "lucide-react";
import coynLogoPath from "@assets/COYN-symbol-square_1750808237977.png";

interface MarketplaceItem {
  id: number;
  title: string;
  description: string;
  price: string;
  currency: string;
  seller: string;
  rating: number;
  category: string;
  image?: string;
  featured?: boolean;
}

export default function MarketplacePage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("featured");

  // Sample marketplace items
  const marketplaceItems: MarketplaceItem[] = [
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

  const filteredItems = marketplaceItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedItems = filteredItems.sort((a, b) => {
    switch (sortBy) {
      case "featured":
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white dark:bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src={coynLogoPath} 
                alt="COYN Logo" 
                className="w-10 h-10"
              />
              <div>
                <h1 className="text-2xl font-bold text-primary">COYN Marketplace</h1>
                <p className="text-sm text-muted-foreground">Discover, buy, and sell with crypto</p>
              </div>
            </div>
            <Button
              onClick={() => setLocation("/")}
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search marketplace..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
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
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Marketplace Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedItems.map((item) => (
            <Card key={item.id} className="bg-white dark:bg-card border-border hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-foreground line-clamp-1">
                      {item.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">by {item.seller}</p>
                  </div>
                  {item.featured && (
                    <Badge className="bg-orange-500 text-white ml-2">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {item.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="text-sm font-medium">{item.rating}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {categories.find(c => c.value === item.category)?.label}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center space-x-2">
                    <Coins className="h-5 w-5 text-primary" />
                    <span className="text-lg font-bold text-foreground">
                      {item.price} {item.currency}
                    </span>
                  </div>
                  <Button 
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Buy Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {sortedItems.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No items found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        )}

        {/* Statistics */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white dark:bg-card border-border text-center">
            <CardContent className="pt-6">
              <Package className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">{marketplaceItems.length}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
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