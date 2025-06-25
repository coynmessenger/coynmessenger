import { storage } from "./storage";
import type { TimeProduct, InsertTimeProduct } from "@shared/schema";

export class TimeMarketplace {
  private static instance: TimeMarketplace;
  private priceUpdateInterval: NodeJS.Timeout | null = null;
  private manifestationInterval: NodeJS.Timeout | null = null;

  static getInstance(): TimeMarketplace {
    if (!TimeMarketplace.instance) {
      TimeMarketplace.instance = new TimeMarketplace();
    }
    return TimeMarketplace.instance;
  }

  async initialize() {
    console.log("Initializing Time Marketplace...");
    
    // Seed some initial time products
    await this.seedTimeProducts();
    
    // Start price volatility updates (every 30 seconds)
    this.startPriceVolatility();
    
    // Start manifestation/vanishing cycle (every minute)
    this.startManifestationCycle();
    
    console.log("Time Marketplace initialized successfully");
  }

  private async seedTimeProducts() {
    const now = new Date();
    const products: InsertTimeProduct[] = [
      {
        title: "Quantum Phone Case",
        description: "A phone case that exists only when observed. Schrödinger would be proud.",
        basePrice: "25.5",
        currency: "COYN",
        imageUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400",
        category: "Electronics",
        creatorId: 1,
        manifestTime: new Date(now.getTime() + 5 * 60 * 1000), // 5 minutes from now
        vanishTime: new Date(now.getTime() + 25 * 60 * 1000), // 25 minutes from now
        isActive: false,
        volatilityFactor: "1.8",
        priceMultiplier: "1.0",
        maxQuantity: 3,
        currentQuantity: 3,
        accessLevel: "public"
      },
      {
        title: "Temporal Coffee Mug",
        description: "Keeps your coffee at the perfect temperature across time dimensions.",
        basePrice: "15.0",
        currency: "COYN",
        imageUrl: "https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=400",
        category: "Home",
        creatorId: 1,
        manifestTime: new Date(now.getTime() + 2 * 60 * 1000), // 2 minutes from now
        vanishTime: new Date(now.getTime() + 15 * 60 * 1000), // 15 minutes from now
        isActive: false,
        volatilityFactor: "1.5",
        priceMultiplier: "1.0",
        maxQuantity: 5,
        currentQuantity: 5,
        accessLevel: "public"
      },
      {
        title: "Chrono Sneakers",
        description: "Step through time with every stride. Limited edition temporal footwear.",
        basePrice: "89.99",
        currency: "COYN",
        imageUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400",
        category: "Fashion",
        creatorId: 1,
        manifestTime: new Date(now.getTime() + 8 * 60 * 1000), // 8 minutes from now
        vanishTime: new Date(now.getTime() + 30 * 60 * 1000), // 30 minutes from now
        isActive: false,
        volatilityFactor: "2.2",
        priceMultiplier: "1.0",
        maxQuantity: 1,
        currentQuantity: 1,
        accessLevel: "premium"
      }
    ];

    for (const product of products) {
      try {
        await storage.createTimeProduct(product);
        console.log(`Created time product: ${product.title}`);
      } catch (error) {
        console.log(`Product ${product.title} already exists or error occurred`);
      }
    }
  }

  private startPriceVolatility() {
    this.priceUpdateInterval = setInterval(async () => {
      const activeProducts = await storage.getActiveTimeProducts();
      
      for (const product of activeProducts) {
        // Calculate new price based on volatility and time remaining
        const timeRemaining = new Date(product.vanishTime).getTime() - Date.now();
        const totalLifetime = new Date(product.vanishTime).getTime() - new Date(product.manifestTime).getTime();
        const urgencyFactor = 1 + (1 - timeRemaining / totalLifetime) * 0.5; // Price increases as time runs out
        
        // Add some randomness
        const volatility = parseFloat(product.volatilityFactor) || 1.0;
        const randomFactor = 0.8 + Math.random() * 0.4; // Between 0.8 and 1.2
        const newMultiplier = (volatility * urgencyFactor * randomFactor).toFixed(2);
        
        await storage.updateProductPrice(
          product.id,
          product.basePrice,
          newMultiplier
        );
      }
    }, 30000); // Every 30 seconds
  }

  private startManifestationCycle() {
    this.manifestationInterval = setInterval(async () => {
      const now = new Date();
      
      // Check for products that should manifest
      const allProducts = await this.getAllTimeProducts();
      
      for (const product of allProducts) {
        const manifestTime = new Date(product.manifestTime);
        const vanishTime = new Date(product.vanishTime);
        
        if (now >= manifestTime && now < vanishTime && !product.isActive) {
          await storage.manifestProduct(product.id);
          console.log(`Product manifested: ${product.title}`);
        } else if (now >= vanishTime && product.isActive) {
          await storage.vanishProduct(product.id);
          console.log(`Product vanished: ${product.title}`);
        }
      }
    }, 60000); // Every minute
  }

  private async getAllTimeProducts(): Promise<TimeProduct[]> {
    // This would need to be added to storage interface for getting all products, not just active ones
    // For now, we'll use a workaround
    return [];
  }

  calculateCurrentPrice(product: TimeProduct): number {
    const basePrice = parseFloat(product.basePrice);
    const multiplier = parseFloat(product.priceMultiplier) || 1.0;
    return basePrice * multiplier;
  }

  getTimeRemaining(product: TimeProduct): number {
    return Math.max(0, new Date(product.vanishTime).getTime() - Date.now());
  }

  formatTimeRemaining(milliseconds: number): string {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  async recordUserInteraction(productId: number, userId: number, type: string) {
    // Calculate crypto reward based on interaction type
    let reward = "0";
    switch (type) {
      case "view":
        reward = "0.1";
        break;
      case "desire":
        reward = "0.5";
        break;
      case "share":
        reward = "1.0";
        break;
      case "purchase":
        reward = "5.0";
        break;
    }

    await storage.recordInteraction({
      productId,
      userId,
      interactionType: type,
      cryptoReward: reward
    });
  }

  shutdown() {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
    }
    if (this.manifestationInterval) {
      clearInterval(this.manifestationInterval);
    }
    console.log("Time Marketplace shutdown");
  }
}

export const timeMarketplace = TimeMarketplace.getInstance();