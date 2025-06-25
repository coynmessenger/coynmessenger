import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  Zap, 
  Eye, 
  Heart, 
  Share, 
  Timer, 
  TrendingUp,
  Sparkles,
  Home
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface TimeProduct {
  id: number;
  title: string;
  description: string;
  basePrice: string;
  currency: string;
  imageUrl?: string;
  category: string;
  manifestTime: string;
  vanishTime: string;
  currentPrice: number;
  timeRemaining: number;
  timeRemainingFormatted: string;
  urgencyLevel: "normal" | "high" | "critical";
  maxQuantity: number;
  currentQuantity: number;
  accessLevel: string;
  priceMultiplier: string;
}

export default function TimeMarketplace() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  const { data: products = [] } = useQuery<TimeProduct[]>({
    queryKey: ["/api/time-products"],
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
  });

  const categories = ["all", ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = selectedCategory === "all" 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  const recordInteraction = async (productId: number, type: string) => {
    try {
      await apiRequest(`/api/time-products/${productId}/interact`, {
        method: "POST",
        body: JSON.stringify({ interactionType: type }),
      });
    } catch (error) {
      console.error("Failed to record interaction:", error);
    }
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case "critical": return "text-red-500 bg-red-50 dark:bg-red-900/20";
      case "high": return "text-orange-500 bg-orange-50 dark:bg-orange-900/20";
      default: return "text-green-500 bg-green-50 dark:bg-green-900/20";
    }
  };

  const getTimeProgress = (product: TimeProduct) => {
    const total = new Date(product.vanishTime).getTime() - new Date(product.manifestTime).getTime();
    const remaining = product.timeRemaining;
    return ((total - remaining) / total) * 100;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
              </Link>
              <div className="h-6 w-px bg-border" />
              <h1 className="text-2xl font-bold text-foreground flex items-center">
                <Sparkles className="h-6 w-6 mr-2 text-primary" />
                Time Marketplace
              </h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Products appear and vanish in real-time
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="capitalize"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Timer className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No Products Currently Manifested
            </h3>
            <p className="text-muted-foreground">
              Check back soon - new products appear throughout the day!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <Card 
                key={product.id} 
                className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 bg-card/80 backdrop-blur-sm"
                onMouseEnter={() => recordInteraction(product.id, "view")}
              >
                <CardHeader className="pb-3">
                  <div className="aspect-video relative overflow-hidden rounded-lg mb-3">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Sparkles className="h-12 w-12 text-primary" />
                      </div>
                    )}
                    
                    {/* Urgency Badge */}
                    <div className="absolute top-2 right-2">
                      <Badge className={getUrgencyColor(product.urgencyLevel)}>
                        <Zap className="h-3 w-3 mr-1" />
                        {product.urgencyLevel}
                      </Badge>
                    </div>

                    {/* Quantity Badge */}
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary">
                        {product.currentQuantity}/{product.maxQuantity} left
                      </Badge>
                    </div>
                  </div>

                  <CardTitle className="text-lg line-clamp-2">{product.title}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>

                  {/* Time Remaining */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Time Remaining</span>
                      <span className={`font-mono font-semibold ${
                        product.urgencyLevel === "critical" ? "text-red-500" : "text-foreground"
                      }`}>
                        {product.timeRemainingFormatted}
                      </span>
                    </div>
                    <Progress 
                      value={getTimeProgress(product)} 
                      className="h-2"
                    />
                  </div>

                  {/* Dynamic Pricing */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Current Price</span>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-3 w-3 text-primary" />
                        <span className="text-sm text-muted-foreground">
                          {parseFloat(product.priceMultiplier) > 1.1 ? "↗" :
                           parseFloat(product.priceMultiplier) < 0.9 ? "↙" : "→"} 
                          {((parseFloat(product.priceMultiplier) - 1) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {product.currentPrice.toFixed(2)} {product.currency}
                    </div>
                    {parseFloat(product.priceMultiplier) !== 1 && (
                      <div className="text-sm text-muted-foreground line-through">
                        {parseFloat(product.basePrice).toFixed(2)} {product.currency}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => recordInteraction(product.id, "desire")}
                      className="flex items-center"
                    >
                      <Heart className="h-3 w-3 mr-1" />
                      Want
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => recordInteraction(product.id, "share")}
                      className="flex items-center"
                    >
                      <Share className="h-3 w-3 mr-1" />
                      Share
                    </Button>
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90"
                      onClick={() => recordInteraction(product.id, "purchase")}
                    >
                      Buy Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}