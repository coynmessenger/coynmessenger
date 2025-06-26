import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { insertMessageSchema, insertEscrowSchema, insertUserSchema } from "@shared/schema";
import { initializeDatabase } from "./db";
import { z } from "zod";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${extension}`);
  }
});

const upload = multer({
  storage: storage_multer,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize database connection
  const dbConnected = await initializeDatabase();
  if (!dbConnected) {
    console.warn('Database connection failed, some features may not work');
  }

  // Serve uploaded files statically
  app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", database: dbConnected });
  });

  // Get current user (hardcoded as user ID 5 for demo)
  app.get("/api/user", async (req, res) => {
    try {
      const user = await storage.getUser(5); // Current user
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Get user conversations
  app.get("/api/conversations", async (req, res) => {
    try {
      const conversations = await storage.getUserConversations(5); // Current user
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to get conversations" });
    }
  });

  // Create new conversation
  app.post("/api/conversations", async (req, res) => {
    try {
      const { otherUserId } = req.body;
      const currentUserId = 5; // Current user
      
      if (!otherUserId) {
        return res.status(400).json({ message: "Other user ID is required" });
      }

      // Check if conversation already exists
      const existingConversation = await storage.getConversationByParticipants(currentUserId, otherUserId);
      if (existingConversation) {
        return res.json(existingConversation);
      }

      // Create new conversation
      const newConversation = await storage.createConversation({
        participant1Id: currentUserId,
        participant2Id: otherUserId,
      });

      res.json(newConversation);
    } catch (error) {
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  // Get conversation messages
  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }

      const messages = await storage.getConversationMessages(conversationId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  // Send message
  app.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }

      const messageData = insertMessageSchema.parse({
        ...req.body,
        conversationId,
        senderId: 5, // Current user
      });

      const message = await storage.createMessage(messageData);
      const messageWithSender = {
        ...message,
        sender: await storage.getUser(message.senderId),
      };

      res.json(messageWithSender);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Get wallet balances
  app.get("/api/wallet/balances", async (req, res) => {
    try {
      const balances = await storage.getUserWalletBalances(5); // Current user
      res.json(balances);
    } catch (error) {
      res.status(500).json({ message: "Failed to get wallet balances" });
    }
  });

  // Send crypto
  app.post("/api/wallet/send", async (req, res) => {
    try {
      const { toUserId, currency, amount } = req.body;
      
      if (!toUserId || !currency || !amount) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // In a real app, this would handle actual crypto transactions
      // For now, we'll just create a crypto message
      const conversation = await storage.getConversationByParticipants(5, toUserId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const message = await storage.createMessage({
        conversationId: conversation.id,
        senderId: 5,
        content: "",
        messageType: "crypto",
        cryptoAmount: amount,
        cryptoCurrency: currency,
      });

      // Update wallet balance (mock)
      const currentBalance = (await storage.getUserWalletBalances(5))
        .find(b => b.currency === currency);
      
      if (currentBalance) {
        const newBalance = (parseFloat(currentBalance.balance) - parseFloat(amount)).toString();
        await storage.updateWalletBalance(5, currency, newBalance);
      }

      res.json({ message: "Crypto sent successfully", transactionId: message.id });
    } catch (error) {
      res.status(500).json({ message: "Failed to send crypto" });
    }
  });

  // Delete message
  app.delete("/api/messages/:id", async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      if (isNaN(messageId)) {
        return res.status(400).json({ message: "Invalid message ID" });
      }

      const deleted = await storage.deleteMessage(messageId, 5); // Current user
      if (!deleted) {
        return res.status(404).json({ message: "Message not found or unauthorized" });
      }

      res.json({ message: "Message deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  // Get conversation escrows
  app.get("/api/conversations/:id/escrows", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }

      const escrows = await storage.getConversationEscrows(conversationId);
      res.json(escrows);
    } catch (error) {
      res.status(500).json({ message: "Failed to get escrows" });
    }
  });

  // Get user escrows
  app.get("/api/user/escrows", async (req, res) => {
    try {
      const userId = 5; // Current user
      const escrows = await storage.getUserEscrows(userId);
      res.json(escrows);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user escrows" });
    }
  });

  // Create escrow
  app.post("/api/escrows", async (req, res) => {
    try {
      const escrowData = insertEscrowSchema.parse({
        ...req.body,
        initiatorId: 5, // Current user
      });

      const escrow = await storage.createEscrow(escrowData);
      res.json(escrow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid escrow data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create escrow" });
    }
  });

  // Add funds to escrow
  app.post("/api/escrows/:id/fund", async (req, res) => {
    try {
      const escrowId = parseInt(req.params.id);
      const { amount } = req.body;

      if (isNaN(escrowId) || !amount) {
        return res.status(400).json({ message: "Invalid escrow ID or amount" });
      }

      const escrow = await storage.addFundsToEscrow(escrowId, 5, amount); // Current user
      if (!escrow) {
        return res.status(404).json({ message: "Escrow not found or unauthorized" });
      }

      res.json(escrow);
    } catch (error: any) {
      if (error.message.includes("Insufficient")) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Escrow funding error:", error);
      res.status(500).json({ message: "Failed to add funds to escrow" });
    }
  });

  // Release escrow
  app.post("/api/escrows/:id/release", async (req, res) => {
    try {
      const escrowId = parseInt(req.params.id);
      if (isNaN(escrowId)) {
        return res.status(400).json({ message: "Invalid escrow ID" });
      }

      const released = await storage.releaseEscrow(escrowId);
      if (!released) {
        return res.status(404).json({ message: "Escrow not found or already processed" });
      }

      res.json({ message: "Escrow released successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to release escrow" });
    }
  });

  // Cancel escrow
  app.post("/api/escrows/:id/cancel", async (req, res) => {
    try {
      const escrowId = parseInt(req.params.id);
      if (isNaN(escrowId)) {
        return res.status(400).json({ message: "Invalid escrow ID" });
      }

      const cancelled = await storage.cancelEscrow(escrowId, 5); // Current user
      if (!cancelled) {
        return res.status(404).json({ message: "Escrow not found or unauthorized" });
      }

      res.json({ message: "Escrow cancelled successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to cancel escrow" });
    }
  });

  // Marketplace API routes
  app.get("/api/marketplace/search", async (req, res) => {
    try {
      const { q: query = '', category, minPrice, maxPrice } = req.query;
      const { marketplaceAPI } = await import('./amazon-api');
      
      const products = await marketplaceAPI.searchProducts(
        query as string, 
        category as string, 
        minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice ? parseFloat(maxPrice as string) : undefined
      );
      
      res.json(products);
    } catch (error) {
      console.error("Marketplace search error:", error);
      res.status(500).json({ error: "Failed to search marketplace products" });
    }
  });

  // Crypto rates API
  app.get("/api/crypto/rates", async (req, res) => {
    try {
      const { marketplaceAPI } = await import('./amazon-api');
      const rates = await marketplaceAPI.getCryptoRates();
      res.json(rates);
    } catch (error) {
      console.error("Crypto rates error:", error);
      res.status(500).json({ error: "Failed to fetch crypto rates" });
    }
  });

  // Find or create user by wallet address
  app.post("/api/users/find-or-create", async (req, res) => {
    try {
      const { walletAddress, displayName } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ message: "Wallet address is required" });
      }

      // Check if user already exists
      let user = await storage.getUserByWalletAddress(walletAddress);
      
      if (!user) {
        // Create new user
        const userData = insertUserSchema.parse({
          username: `user_${Date.now()}`,
          displayName: displayName || `User ${walletAddress.slice(-6)}`,
          walletAddress,
          profilePicture: null,
          isOnline: true
        });
        
        user = await storage.createUser(userData);
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error finding/creating user:", error);
      res.status(500).json({ message: "Failed to find or create user" });
    }
  });

  // Update user profile
  app.put("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      console.log("Update request for user:", userId, "with data:", req.body);

      // Create a partial update schema that allows any subset of user fields
      const updateSchema = insertUserSchema.partial();
      const updates = updateSchema.parse(req.body);
      
      console.log("Parsed updates:", updates);
      
      const user = await storage.updateUser(userId, updates);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log("Updated user:", user);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid user data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Get all users (for adding contacts)
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error getting users:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  // Get user favorites
  app.get("/api/favorites", async (req, res) => {
    try {
      const userId = 5; // Current user
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error getting favorites:", error);
      res.status(500).json({ message: "Failed to get favorites" });
    }
  });

  // Toggle product in favorites (add if not exists, remove if exists)
  app.post("/api/favorites", async (req, res) => {
    try {
      const userId = 5; // Current user
      const { productId, productTitle, productPrice, productImage, productCategory, productRating } = req.body;
      
      if (!productId) {
        return res.status(400).json({ message: "Product ID is required" });
      }

      // Check if product is already in favorites
      const isAlreadyFavorite = await storage.isFavorite(userId, productId);
      
      if (isAlreadyFavorite) {
        // Remove from favorites
        const removed = await storage.removeFromFavorites(userId, productId);
        res.json({ action: "removed", isFavorite: false });
      } else {
        // Validate required fields for adding to favorites
        if (!productTitle || !productPrice || !productImage || !productCategory || productRating === undefined) {
          return res.status(400).json({ 
            message: "Missing required product information",
            required: ["productTitle", "productPrice", "productImage", "productCategory", "productRating"]
          });
        }

        // Add to favorites
        const favoriteData = {
          userId,
          productId,
          productTitle,
          productPrice,
          productImage,
          productCategory,
          productRating: Number(productRating),
        };
        const favorite = await storage.addToFavorites(favoriteData);
        res.json({ action: "added", isFavorite: true, favorite });
      }
    } catch (error) {
      console.error("Error toggling favorites:", error);
      res.status(500).json({ message: "Failed to update favorites" });
    }
  });

  // Remove product from favorites
  app.delete("/api/favorites/:productId", async (req, res) => {
    try {
      const userId = 5; // Current user
      const productId = req.params.productId;
      
      const removed = await storage.removeFromFavorites(userId, productId);
      if (!removed) {
        return res.status(404).json({ message: "Favorite not found" });
      }
      
      res.json({ message: "Removed from favorites" });
    } catch (error) {
      console.error("Error removing from favorites:", error);
      res.status(500).json({ message: "Failed to remove from favorites" });
    }
  });

  // Check if product is favorite
  app.get("/api/favorites/status", async (req, res) => {
    try {
      const userId = 5; // Current user
      const productId = req.query.productId as string;
      
      if (!productId) {
        return res.status(400).json({ message: "Product ID is required" });
      }
      
      const isFavorite = await storage.isFavorite(userId, productId);
      res.json({ isFavorite });
    } catch (error) {
      console.error("Error checking favorite status:", error);
      res.status(500).json({ message: "Failed to check favorite status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
