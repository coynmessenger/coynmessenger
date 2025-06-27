import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { insertMessageSchema, insertUserSchema, conversations, messages, groupMembers } from "@shared/schema";
import { db } from "./db";
import { initializeDatabase } from "./db";
import { z } from "zod";
import { marketplaceAPI } from "./amazon-api";

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(process.cwd(), 'uploads/avatars');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Initialize database
  await initializeDatabase();

  // Get current user
  app.get("/api/user", async (req, res) => {
    try {
      let userId = 5; // Default user
      
      // Check if there's a specific user ID in query (for wallet connections)
      if (req.query.userId) {
        userId = parseInt(req.query.userId as string);
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Get all users
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  // Find or create user by wallet address
  app.post("/api/users/find-or-create", async (req, res) => {
    try {
      const { walletAddress, displayName } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ message: "Wallet address is required" });
      }

      // Only find existing users, don't create new ones
      const existingUser = await storage.getUserByWalletAddress(walletAddress);
      if (existingUser) {
        return res.json(existingUser);
      }

      // Return error for unregistered addresses
      return res.status(404).json({ 
        message: "No user found with this wallet address. Please contact administrator to register your address." 
      });
    } catch (error) {
      console.error("Find/create user error:", error);
      res.status(500).json({ message: "Failed to find or create user" });
    }
  });

  // Get conversations for current user
  app.get("/api/conversations", async (req, res) => {
    try {
      const userId = 5; // Current user
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to get conversations" });
    }
  });

  // Get messages for a conversation
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

  // Send a message
  app.post("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }

      const messageData = {
        conversationId,
        senderId: 5, // Current user
        content: req.body.content,
        messageType: req.body.messageType || "text",
        cryptoAmount: req.body.cryptoAmount,
        cryptoCurrency: req.body.cryptoCurrency,
        audioFilePath: req.body.audioFilePath,
        transcription: req.body.transcription,
        audioDuration: req.body.audioDuration
      };

      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Create or get conversation
  app.post("/api/conversations", async (req, res) => {
    try {
      const { otherUserId } = req.body;
      const currentUserId = 5; // Current user

      if (!otherUserId || otherUserId === currentUserId) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Check if conversation already exists
      const existingConversation = await storage.findConversation(currentUserId, otherUserId);
      if (existingConversation) {
        return res.json(existingConversation);
      }

      // Create new conversation
      const conversation = await storage.createConversation(currentUserId, otherUserId);
      res.status(201).json(conversation);
    } catch (error) {
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  // Get wallet balances
  app.get("/api/wallet/balances", async (req, res) => {
    try {
      const userId = 5; // Current user
      const balances = await storage.getUserWalletBalances(userId);
      res.json(balances);
    } catch (error) {
      res.status(500).json({ message: "Failed to get wallet balances" });
    }
  });

  // Send cryptocurrency
  app.post("/api/wallet/send", async (req, res) => {
    try {
      const { toUserId, currency, amount } = req.body;
      const fromUserId = 5; // Current user

      if (!toUserId || !currency || !amount) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      // Check if sender has sufficient balance
      const senderBalance = await storage.getUserCurrencyBalance(fromUserId, currency);
      if (!senderBalance || parseFloat(senderBalance.balance) < numAmount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Process the transfer
      const success = await storage.transferCurrency(fromUserId, toUserId, currency, numAmount);
      if (!success) {
        return res.status(500).json({ message: "Transfer failed" });
      }

      // Create transfer message
      const transferMessage = {
        conversationId: req.body.conversationId || 1, // Default conversation
        senderId: fromUserId,
        content: `Sent ${amount} ${currency}`,
        messageType: "crypto_transfer" as const,
        cryptoAmount: amount,
        cryptoCurrency: currency
      };

      await storage.createMessage(transferMessage);

      res.json({ message: "Transfer successful" });
    } catch (error) {
      console.error("Crypto send error:", error);
      res.status(500).json({ message: "Failed to send cryptocurrency" });
    }
  });

  // Delete a message
  app.delete("/api/messages/:id", async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const userId = 5; // Current user

      if (isNaN(messageId)) {
        return res.status(400).json({ message: "Invalid message ID" });
      }

      const deleted = await storage.deleteMessage(messageId, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Message not found or unauthorized" });
      }

      res.json({ message: "Message deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  // Get starred messages
  app.get("/api/messages/starred", async (req, res) => {
    try {
      const userId = 5; // Current user
      const starredMessages = await storage.getStarredMessages(userId);
      res.json(starredMessages);
    } catch (error) {
      console.error("Get starred messages error:", error);
      res.status(500).json({ message: "Failed to get starred messages" });
    }
  });

  // Toggle star on a message
  app.patch("/api/messages/:id/star", async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const userId = 5; // Current user
      const { isStarred } = req.body;

      if (isNaN(messageId)) {
        return res.status(400).json({ message: "Invalid message ID" });
      }

      const updated = await storage.toggleMessageStar(messageId, userId, isStarred);
      if (!updated) {
        return res.status(404).json({ message: "Message not found or unauthorized" });
      }

      res.json({ message: "Message star status updated", isStarred });
    } catch (error) {
      console.error("Toggle star error:", error);
      res.status(500).json({ message: "Failed to update star status" });
    }
  });

  // Search messages
  app.get("/api/search", async (req, res) => {
    try {
      const { q: query, conversationId } = req.query;
      
      if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Search query is required" });
      }

      const userId = 5; // Current user
      let results;

      if (conversationId) {
        const convId = parseInt(conversationId as string);
        if (isNaN(convId)) {
          return res.status(400).json({ message: "Invalid conversation ID" });
        }
        results = await storage.searchMessagesInConversation(query, convId);
      } else {
        results = await storage.searchMessages(query, userId);
      }

      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Search failed" });
    }
  });

  // Add contact
  app.post("/api/contacts", async (req, res) => {
    try {
      const { walletAddress, displayName } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ message: "Wallet address is required" });
      }

      // Check if user exists
      let user = await storage.getUserByWalletAddress(walletAddress);
      
      if (!user) {
        // Create new user
        const newUser = {
          username: `user_${Date.now()}`,
          displayName: displayName || "New User",
          walletAddress,
          isSetup: false // Mark as not setup so they don't appear in contact list until configured
        };
        
        user = await storage.createUser(newUser);
      }

      res.json(user);
    } catch (error) {
      console.error("Add contact error:", error);
      res.status(500).json({ message: "Failed to add contact" });
    }
  });

  // Update user profile
  app.patch("/api/user", async (req, res) => {
    try {
      // Get user ID from query parameter or default to session user (5)
      const userId = req.query.userId ? parseInt(req.query.userId as string) : 5;
      
      // Simple validation for user update
      const allowedFields = ['displayName', 'fullName', 'email', 'addressLine1', 'addressLine2', 'city', 'state', 'zipCode', 'country', 'profilePicture'];
      const updates: any = {};
      
      for (const [key, value] of Object.entries(req.body)) {
        if (allowedFields.includes(key)) {
          updates[key] = value;
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ 
          message: "No valid fields to update" 
        });
      }
      
      console.log("Updating user", userId, "with data:", updates);
      
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

  // Upload profile picture
  app.post("/api/user/upload-avatar", upload.single('profileImage'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Get user ID from query parameter or default to session user (5)
      const userId = req.query.userId ? parseInt(req.query.userId as string) : 5;
      const profilePicture = `/uploads/avatars/${req.file.filename}`;
      
      console.log("Uploading avatar for user:", userId, "file:", req.file.filename);
      
      // Update user's profile picture in database
      const user = await storage.updateUser(userId, { profilePicture });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ 
        message: "Profile picture uploaded successfully",
        profilePicture,
        user
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to upload profile picture" });
    }
  });

  // Create a new group chat
  app.post("/api/groups", async (req, res) => {
    try {
      const { groupName, memberIds, createdBy } = req.body;
      
      if (!groupName || !memberIds || memberIds.length < 2) {
        return res.status(400).json({ message: "Group name and at least 2 members required" });
      }
      
      // Create group conversation
      const conversation = await db.insert(conversations).values({
        isGroup: true,
        groupName,
        createdBy,
        lastMessageAt: new Date(),
      }).returning();
      
      const conversationId = conversation[0].id;
      
      // Add all members to the group
      const memberData = memberIds.map((userId: number) => ({
        conversationId,
        userId,
        role: userId === createdBy ? 'admin' : 'member',
      }));
      
      await db.insert(groupMembers).values(memberData);
      
      // Send system message about group creation
      await db.insert(messages).values({
        conversationId,
        senderId: createdBy,
        content: `Group "${groupName}" was created`,
        messageType: "system",
      });
      
      res.json({ id: conversationId, message: "Group created successfully" });
    } catch (error) {
      console.error("Failed to create group:", error);
      res.status(500).json({ message: "Failed to create group" });
    }
  });

  // Enhanced Marketplace API routes
  app.get("/api/marketplace/search", async (req, res) => {
    try {
      const { query = "", category = "", minPrice, maxPrice } = req.query;
      const products = await marketplaceAPI.searchProducts(
        query as string,
        category as string,
        minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice ? parseFloat(maxPrice as string) : undefined
      );
      res.json(products);
    } catch (error) {
      console.error("[MARKETPLACE] Search error:", error);
      res.status(500).json({ message: "Failed to search products" });
    }
  });

  // Individual product details
  app.get("/api/marketplace/product/:asin", async (req, res) => {
    try {
      const { asin } = req.params;
      const product = await marketplaceAPI.getProductDetails(asin);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      console.error("[MARKETPLACE] Product details error:", error);
      res.status(500).json({ message: "Failed to fetch product details" });
    }
  });

  // Purchase product with cryptocurrency
  app.post("/api/marketplace/purchase", async (req, res) => {
    try {
      const { productId, quantity = 1, cryptoCurrency, cryptoAmount, shippingAddress } = req.body;
      const userId = (req as any).session?.userId || 5; // Default to demo user

      if (!productId || !cryptoCurrency || !cryptoAmount) {
        return res.status(400).json({ message: "Missing required payment information" });
      }

      const result = await marketplaceAPI.processPayment(
        productId,
        quantity,
        cryptoCurrency,
        cryptoAmount,
        userId
      );

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      // Store purchase record (in real app, this would be in database)
      console.log(`[PURCHASE] User ${userId} purchased ${quantity}x ${productId} with ${cryptoAmount} ${cryptoCurrency}`);
      console.log(`[PURCHASE] Transaction ID: ${result.transactionId}`);
      
      res.json({
        success: true,
        transactionId: result.transactionId,
        message: "Purchase completed successfully"
      });
    } catch (error) {
      console.error("[MARKETPLACE] Purchase error:", error);
      res.status(500).json({ message: "Purchase failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}