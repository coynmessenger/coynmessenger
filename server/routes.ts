import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { insertMessageSchema, insertUserSchema, conversations, messages, groupMembers, favorites } from "@shared/schema";
import { db } from "./db";
import { initializeDatabase } from "./db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { marketplaceAPI } from "./amazon-api";
import { blockchainService } from "./blockchain";
import { EncryptedWebRTCSignaling } from "./webrtc-signaling";

// Configure multer for avatar uploads
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

// Configure multer for message attachments
const attachmentUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(process.cwd(), 'uploads/attachments');
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
    fileSize: 50 * 1024 * 1024, // 50MB limit for attachments
  },
  fileFilter: (req, file, cb) => {
    // Allow all common file types
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // Videos
      'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm',
      // Documents
      'application/pdf', 'text/plain', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      // Archives
      'application/zip', 'application/x-rar-compressed',
      // Audio
      'audio/mpeg', 'audio/wav', 'audio/ogg'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

// Helper function to get effective display name with correct priority
function getEffectiveDisplayName(user: any): string {
  // Priority: 1. Sign-in name, 2. Profile display name, 3. @id format
  if (user.signInName) {
    return user.signInName;
  }
  if (user.displayName && !user.displayName.startsWith('@')) {
    return user.displayName;
  }
  // Fallback to @id format using last 6 characters of wallet address
  return `@${user.walletAddress.slice(-6)}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Initialize database
  await initializeDatabase();

  // Get current user - optimized with caching
  app.get("/api/user", async (req, res) => {
    try {
      let userId = 5; // Default user
      
      // Check if there's a specific user ID in query (for wallet connections)
      if (req.query.userId) {
        userId = parseInt(req.query.userId as string);
      }
      
      // Set cache headers for better performance
      res.set({
        'Cache-Control': 'public, max-age=120', // Cache for 2 minutes
        'ETag': `user-${userId}-${Date.now()}` // Simple ETag
      });
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return user with effective display name
      const userWithEffectiveName = {
        ...user,
        displayName: getEffectiveDisplayName(user)
      };
      
      res.json(userWithEffectiveName);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Get all users - only return properly setup users for contact list
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Filter to only show properly setup users (demo users, not auto-created wallet users)
      const setupUsers = users.filter(user => user.isSetup === true);
      res.json(setupUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  // Find or create user by wallet address
  app.post("/api/users/find-or-create", async (req, res) => {
    try {
      const { walletAddress, displayName } = req.body;
      console.log("Find-or-create request:", { walletAddress, displayName });
      
      if (!walletAddress) {
        return res.status(400).json({ message: "Wallet address is required" });
      }

      // Validate wallet address using blockchain service
      const isValidWallet = await blockchainService.validateWalletAddress(walletAddress);
      if (!isValidWallet) {
        return res.status(400).json({ message: "Invalid wallet address format" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByWalletAddress(walletAddress);
      if (existingUser) {
        // If display name was provided and it's different from sign-in name, update it
        if (displayName && displayName !== existingUser.signInName) {
          console.log(`Updating user ${existingUser.id} sign-in name from "${existingUser.signInName}" to "${displayName}"`);
          const updatedUser = await storage.updateUser(existingUser.id, {
            signInName: displayName
          });
          console.log("Updated user:", updatedUser);
          
          // Return user with effective display name
          const userWithEffectiveName = {
            ...updatedUser,
            displayName: getEffectiveDisplayName(updatedUser)
          };
          return res.json(userWithEffectiveName);
        }
        console.log(`User exists with same sign-in name: "${existingUser.signInName}"`);
        
        // Return user with effective display name
        const userWithEffectiveName = {
          ...existingUser,
          displayName: getEffectiveDisplayName(existingUser)
        };
        return res.json(userWithEffectiveName);
      }

      // Create new user with wallet address
      const userData = {
        username: walletAddress.slice(0, 8), // Use first 8 chars as username
        displayName: displayName || `@${walletAddress.slice(-6)}`, // Use display name or @id format
        signInName: displayName, // Store the sign-in name separately (can be null)
        walletAddress: walletAddress,
        isSetup: false, // Don't show automatically created wallet users in contact list
        isOnline: true,
        profileImage: null
      };

      const newUser = await storage.createUser(userData);
      
      // Fetch real blockchain balances for the wallet address
      console.log("Fetching blockchain balances for wallet:", walletAddress);
      const blockchainBalances = await blockchainService.getWalletBalances(walletAddress);
      
      // Create wallet balances with real blockchain data
      for (const balanceData of blockchainBalances) {
        await storage.createWalletBalance({
          userId: newUser.id,
          currency: balanceData.currency,
          balance: balanceData.balance,
          usdValue: balanceData.usdValue,
          changePercent: balanceData.changePercent || "0.00"
        });
      }

      console.log("Created user with real blockchain balances:", newUser.id);
      
      // Return user with effective display name
      const userWithEffectiveName = {
        ...newUser,
        displayName: getEffectiveDisplayName(newUser)
      };
      
      return res.json(userWithEffectiveName);
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
      console.error("Error getting conversations:", error);
      res.status(500).json({ message: "Failed to get conversations", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get messages for a conversation
  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }

      // Set cache headers for better performance
      res.set('Cache-Control', 'public, max-age=30'); // Cache for 30 seconds
      
      const messages = await storage.getConversationMessages(conversationId);
      
      // Enhance messages with effective display names
      const enhancedMessages = messages.map(message => ({
        ...message,
        sender: {
          ...message.sender,
          effectiveDisplayName: getEffectiveDisplayName(message.sender)
        }
      }));
      
      res.json(enhancedMessages);
    } catch (error) {
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  // Get group members for a conversation
  app.get("/api/conversations/:id/members", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }

      const members = await storage.getGroupMembers(conversationId);
      
      // Enhance members with effective display names
      const enhancedMembers = members.map(member => ({
        ...member,
        effectiveDisplayName: getEffectiveDisplayName(member)
      }));
      
      res.json(enhancedMembers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get group members" });
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

  // Upload attachment and send message
  app.post("/api/conversations/:id/messages/attachment", attachmentUpload.single('file'), async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const senderId = 5; // Current user
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Determine attachment type
      let attachmentType = 'file';
      if (file.mimetype.startsWith('image/')) {
        attachmentType = 'image';
      } else if (file.mimetype.startsWith('video/')) {
        attachmentType = 'video';
      }

      // Create the attachment URL (relative path)
      const attachmentUrl = `/uploads/attachments/${file.filename}`;

      // Create message with attachment
      const messageData = {
        conversationId,
        senderId,
        content: req.body.content || null, // Optional text content with the file
        messageType: "attachment" as const,
        attachmentUrl,
        attachmentType,
        attachmentName: file.originalname,
        attachmentSize: file.size
      };

      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "Failed to upload file" });
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
      // Get user ID from query parameter or default to 5
      const userId = req.query.userId ? parseInt(req.query.userId as string) : 5;
      const balances = await storage.getUserWalletBalances(userId);
      res.json(balances);
    } catch (error) {
      res.status(500).json({ message: "Failed to get wallet balances" });
    }
  });

  // Refresh wallet balances from blockchain
  app.post("/api/wallet/balances/refresh", async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      // Get user's wallet address
      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log("Refreshing blockchain balances for wallet:", user.walletAddress);
      
      // Fetch fresh blockchain balances
      const blockchainBalances = await blockchainService.getWalletBalances(user.walletAddress);
      
      // Update existing wallet balances
      for (const balanceData of blockchainBalances) {
        await storage.updateWalletBalance(parseInt(userId), balanceData.currency, {
          balance: balanceData.balance,
          usdValue: balanceData.usdValue,
          changePercent: balanceData.changePercent || "0.00"
        });
      }

      // Return updated balances
      const updatedBalances = await storage.getUserWalletBalances(parseInt(userId));
      console.log("Updated wallet balances for user:", userId);
      
      res.json(updatedBalances);
    } catch (error) {
      console.error("Error refreshing wallet balances:", error);
      res.status(500).json({ message: "Internal server error" });
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
      const { groupName, memberIds } = req.body;
      const createdBy = 5; // Current user
      
      if (!groupName || !memberIds || memberIds.length < 1) {
        return res.status(400).json({ message: "Group name and at least 1 member required" });
      }
      
      // Create group conversation using storage method
      const conversation = await storage.createGroupConversation(groupName, memberIds, createdBy);
      
      // Send system message about group creation
      await storage.createMessage({
        conversationId: conversation.id,
        senderId: createdBy,
        content: `Group "${groupName}" was created`,
        messageType: "system",
      });
      
      res.json({ 
        id: conversation.id, 
        conversation,
        message: "Group created successfully" 
      });
    } catch (error) {
      console.error("Failed to create group:", error);
      res.status(500).json({ message: "Failed to create group" });
    }
  });

  // Leave a group
  app.delete("/api/groups/:id/leave", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = 5; // Current user
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }
      
      // Check if conversation is a group
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || !conversation.isGroup) {
        return res.status(400).json({ message: "Not a group conversation" });
      }
      
      // Leave the group
      const success = await storage.leaveGroup(conversationId, userId);
      if (!success) {
        return res.status(404).json({ message: "User not found in group" });
      }
      
      // Send system message about user leaving
      const user = await storage.getUser(userId);
      if (user) {
        await storage.createMessage({
          conversationId,
          senderId: userId,
          content: `${user.displayName} left the group`,
          messageType: "system",
        });
      }
      
      res.json({ message: "Left group successfully" });
    } catch (error) {
      console.error("Failed to leave group:", error);
      res.status(500).json({ message: "Failed to leave group" });
    }
  });

  // Get group members
  app.get("/api/groups/:id/members", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }
      
      const members = await storage.getGroupMembers(conversationId);
      res.json(members);
    } catch (error) {
      console.error("Failed to get group members:", error);
      res.status(500).json({ message: "Failed to get group members" });
    }
  });

  // Share messages between conversations
  app.post("/api/messages/share", async (req, res) => {
    try {
      const { conversationIds, messageIds } = req.body;
      const userId = 5; // Current user
      
      if (!conversationIds || !messageIds || conversationIds.length === 0 || messageIds.length === 0) {
        return res.status(400).json({ message: "Missing conversation IDs or message IDs" });
      }

      // Get the original messages
      const messages = await storage.getMessagesByIds(messageIds);
      if (messages.length === 0) {
        return res.status(404).json({ message: "Messages not found" });
      }

      // Create shared messages in each target conversation
      for (const conversationId of conversationIds) {
        for (const message of messages) {
          const sharedMessage = {
            conversationId,
            senderId: userId,
            content: `📤 Shared: ${message.content}`,
            messageType: "text" as const,
            originalMessageId: message.id
          };
          await storage.createMessage(sharedMessage);
        }
      }

      res.json({ 
        message: "Messages shared successfully",
        sharedTo: conversationIds.length,
        messagesShared: messageIds.length
      });
    } catch (error) {
      console.error("Share messages error:", error);
      res.status(500).json({ message: "Failed to share messages" });
    }
  });

  // Share product to conversations
  app.post("/api/messages/share-product", async (req, res) => {
    try {
      const { conversationIds, productId, productTitle, productPrice, productImage } = req.body;
      const userId = 5; // Current user
      
      if (!conversationIds || conversationIds.length === 0 || !productId || !productTitle) {
        return res.status(400).json({ message: "Missing required product information" });
      }

      // Create product sharing messages in each target conversation
      for (const conversationId of conversationIds) {
        const productMessage = {
          conversationId,
          senderId: userId,
          content: `🛍️ Check out this product: ${productTitle} - $${productPrice}`,
          messageType: "product_share" as const,
          productId,
          productTitle,
          productPrice,
          productImage
        };
        await storage.createMessage(productMessage);
      }

      res.json({ 
        message: "Product shared successfully",
        sharedTo: conversationIds.length,
        productTitle
      });
    } catch (error) {
      console.error("Share product error:", error);
      res.status(500).json({ message: "Failed to share product" });
    }
  });

  // Favorites API routes
  app.get("/api/favorites", async (req, res) => {
    try {
      const userId = 5; // Current user
      const favorites = await storage.getFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Get favorites error:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post("/api/favorites", async (req, res) => {
    try {
      const userId = 5; // Current user
      const { productId, productTitle, productPrice, productImage, productCategory, productRating } = req.body;
      
      if (!productId || !productTitle) {
        return res.status(400).json({ message: "Product ID and title are required" });
      }

      // Add to favorites with proper data structure
      const favoriteData = {
        userId,
        productId,
        productTitle,
        productPrice: productPrice || "$0.00",
        productImage: productImage || "",
        productCategory: productCategory || "General",
        productRating: productRating || 0
      };

      const [favorite] = await db
        .insert(favorites)
        .values(favoriteData)
        .returning();

      res.json({ 
        message: "Added to favorites",
        favorite,
        action: "added"
      });
    } catch (error) {
      console.error("Add favorite error:", error);
      res.status(500).json({ message: "Failed to add to favorites" });
    }
  });

  app.delete("/api/favorites/:productId", async (req, res) => {
    try {
      const userId = 5; // Current user
      const { productId } = req.params;
      
      const success = await storage.removeFromFavorites(userId, productId);
      
      if (!success) {
        return res.status(404).json({ message: "Favorite not found" });
      }

      res.json({ 
        message: "Removed from favorites",
        action: "removed"
      });
    } catch (error) {
      console.error("Remove favorite error:", error);
      res.status(500).json({ message: "Failed to remove from favorites" });
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
      const { productId, quantity = 1, cryptoCurrency, cryptoAmount, shippingAddress, productTitle, totalValue, userId } = req.body;
      const actualUserId = userId || (req as any).session?.userId || 5; // Use passed userId or session fallback

      if (!productId || !cryptoCurrency || !cryptoAmount) {
        return res.status(400).json({ message: "Missing required payment information" });
      }

      const result = await marketplaceAPI.processPayment(
        productId,
        quantity,
        cryptoCurrency,
        cryptoAmount,
        actualUserId
      );

      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      // Create purchase record
      const purchaseValue = parseFloat(totalValue) || parseFloat(cryptoAmount);
      const purchase = await storage.createPurchase({
        userId: actualUserId,
        productId,
        productTitle: productTitle || `Product ${productId}`,
        quantity,
        totalValue: purchaseValue.toString(),
        currency: 'USD',
        paymentMethod: cryptoCurrency,
        transactionHash: result.transactionId,
        status: 'confirmed',
        shippingAddress: shippingAddress || '',
        orderNotes: ''
      });

      // Check for NFT reward eligibility
      const rewardTier = storage.checkRewardEligibility(purchaseValue);
      if (rewardTier) {
        await storage.createNFTReward({
          userId: actualUserId,
          tier: rewardTier,
          productId,
          productTitle: productTitle || `Product ${productId}`,
          purchaseValue: purchaseValue.toString(),
          currency: 'USD',
          isRedeemed: false
        });
        
        console.log(`[NFT REWARD] User ${actualUserId} earned ${rewardTier} tier NFT reward for purchase of $${purchaseValue}`);
      }

      console.log(`[PURCHASE] User ${actualUserId} purchased ${quantity}x ${productId} with ${cryptoAmount} ${cryptoCurrency}`);
      console.log(`[PURCHASE] Transaction ID: ${result.transactionId}`);
      
      res.json({
        success: true,
        transactionId: result.transactionId,
        message: "Purchase completed successfully",
        nftReward: rewardTier ? { tier: rewardTier, earned: true } : null
      });
    } catch (error) {
      console.error("[MARKETPLACE] Purchase error:", error);
      res.status(500).json({ message: "Purchase failed" });
    }
  });

  // NFT Rewards API
  app.get("/api/nft-rewards", async (req, res) => {
    try {
      const userId = (req as any).session?.userId || 5;
      const rewards = await storage.getNFTRewards(userId);
      res.json(rewards);
    } catch (error) {
      console.error("[NFT REWARDS] Error fetching rewards:", error);
      res.status(500).json({ message: "Failed to fetch NFT rewards" });
    }
  });

  app.post("/api/nft-rewards/:id/redeem", async (req, res) => {
    try {
      const userId = (req as any).session?.userId || 5;
      const rewardId = parseInt(req.params.id);
      
      const success = await storage.redeemNFTReward(rewardId, userId);
      if (success) {
        res.json({ 
          success: true, 
          message: "NFT reward redeemed successfully" 
        });
      } else {
        res.status(400).json({ message: "Failed to redeem NFT reward" });
      }
    } catch (error) {
      console.error("[NFT REWARDS] Error redeeming reward:", error);
      res.status(500).json({ message: "Failed to redeem NFT reward" });
    }
  });

  // Purchase history API
  app.get("/api/purchases", async (req, res) => {
    try {
      // Get user ID from query parameter or default to 5 for backward compatibility
      const userId = req.query.userId ? parseInt(req.query.userId as string) : 5;
      const purchases = await storage.getPurchases(userId);
      res.json(purchases);
    } catch (error) {
      console.error("[PURCHASES] Error fetching purchases:", error);
      res.status(500).json({ message: "Failed to fetch purchases" });
    }
  });

  // Create new purchase record
  app.post("/api/purchases", async (req, res) => {
    try {
      // Handle both single item and multiple items
      const items = req.body.items || [];
      const purchases = [];

      if (items.length > 0) {
        // Multiple items (from shopping cart)
        for (const item of items) {
          const purchaseData = {
            userId: req.body.userId,
            productId: item.id,
            productTitle: item.title,
            quantity: item.quantity,
            totalValue: (parseFloat(item.price.replace('$', '')) * item.quantity).toString(),
            currency: 'USD',
            paymentMethod: req.body.cryptoCurrency,
            transactionHash: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            status: req.body.status || 'confirmed',
            shippingAddress: typeof req.body.shippingAddress === 'object' 
              ? `${req.body.shippingAddress.fullName}, ${req.body.shippingAddress.addressLine1}, ${req.body.shippingAddress.city}, ${req.body.shippingAddress.state} ${req.body.shippingAddress.zipCode}, ${req.body.shippingAddress.country}`
              : req.body.shippingAddress,
            orderNotes: req.body.orderNotes
          };

          const purchase = await storage.createPurchase(purchaseData);
          purchases.push(purchase);
        }
      } else {
        // Single item (from product page)
        const purchaseData = {
          userId: req.body.userId,
          productId: req.body.productId,
          productTitle: req.body.productTitle,
          quantity: req.body.quantity || 1,
          totalValue: req.body.totalValue,
          currency: 'USD',
          paymentMethod: req.body.cryptoCurrency,
          transactionHash: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: req.body.status || 'confirmed',
          shippingAddress: req.body.shippingAddress,
          orderNotes: req.body.orderNotes
        };

        const purchase = await storage.createPurchase(purchaseData);
        purchases.push(purchase);
      }

      res.status(201).json({
        success: true,
        purchases,
        orderNumber: req.body.orderNumber,
        estimatedDelivery: req.body.estimatedDelivery
      });
    } catch (error) {
      console.error("[PURCHASES] Error creating purchase:", error);
      res.status(500).json({ message: "Failed to create purchase" });
    }
  });

  // Crypto rates endpoint
  app.get("/api/crypto/rates", async (req, res) => {
    try {
      const rates = await marketplaceAPI.getCryptoRates();
      res.json(rates);
    } catch (error) {
      console.error("[CRYPTO RATES] Error fetching rates:", error);
      res.status(500).json({ message: "Failed to fetch crypto rates" });
    }
  });

  const httpServer = createServer(app);
  
  // Initialize encrypted WebRTC signaling server
  const webrtcSignaling = new EncryptedWebRTCSignaling(httpServer);
  console.log('Encrypted WebRTC signaling server initialized');
  
  // Group API endpoints
  app.get("/api/groups/:conversationId/info", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation || !conversation.isGroup) {
        return res.status(404).json({ message: "Group not found" });
      }

      const memberCount = await storage.getGroupMemberCount(conversationId);
      
      res.json({
        id: conversation.id,
        groupName: conversation.groupName,
        groupDescription: conversation.groupDescription,
        groupIcon: conversation.groupIcon,
        createdBy: conversation.createdBy,
        createdAt: conversation.createdAt,
        memberCount
      });
    } catch (error) {
      console.error("Error fetching group info:", error);
      res.status(500).json({ message: "Failed to fetch group info" });
    }
  });

  app.get("/api/groups/:conversationId/members", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const members = await storage.getGroupMembers(conversationId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching group members:", error);
      res.status(500).json({ message: "Failed to fetch group members" });
    }
  });

  app.patch("/api/groups/:conversationId", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const { groupName, groupDescription } = req.body;
      
      const updatedGroup = await storage.updateGroup(conversationId, {
        groupName,
        groupDescription
      });
      
      res.json(updatedGroup);
    } catch (error) {
      console.error("Error updating group:", error);
      res.status(500).json({ message: "Failed to update group" });
    }
  });

  app.delete("/api/groups/:conversationId/members/:userId", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const userId = parseInt(req.params.userId);
      
      await storage.removeGroupMember(conversationId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing group member:", error);
      res.status(500).json({ message: "Failed to remove group member" });
    }
  });

  app.post("/api/groups/:conversationId/leave", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const userId = (req as any).session?.userId || 5;
      
      // Hide the conversation from the user's list
      await storage.hideConversation(conversationId, userId);
      
      // Add a system message that the user left
      await storage.createMessage({
        conversationId,
        senderId: userId,
        content: `User left the group`,
        messageType: 'system',
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error leaving group:", error);
      res.status(500).json({ message: "Failed to leave group" });
    }
  });

  // Initialize real-time messaging WebSocket server
  const { initializeMessagingWebSocket } = await import('./messaging-websocket');
  const messagingWS = initializeMessagingWebSocket(httpServer);
  console.log('Real-time messaging WebSocket server initialized');
  
  return httpServer;
}