import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { insertMessageSchema, insertUserSchema, conversations, messages, groupMembers, favorites, users, type User } from "@shared/schema";
import { db } from "./db";
import { initializeDatabase } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { marketplaceAPI } from "./amazon-api";
import { blockchainService } from "./blockchain";
import { generateWallet, encryptPrivateKey, decryptPrivateKey, sendBNBInternal, sendERC20Internal } from "./wallet-service";
import { EncryptedWebRTCSignaling } from "./webrtc-signaling";
import { requireAuth } from "./middleware/security";

import { sanitizeText, sanitizeDisplayName, sanitizeUrl, sanitizeEmail, sanitizeNumericString } from "./sanitize";
import { healthCheck, readinessCheck, livenessCheck } from "./health";
import { registerAudioRoutes } from "./replit_integrations/audio";
import { registerImageRoutes } from "./replit_integrations/image/routes";
import { registerGoogleDriveRoutes } from "./replit_integrations/google-drive";
import { globalLimiter, authLimiter, messageLimiter, uploadLimiter, walletLimiter, searchLimiter } from "./middleware/rate-limit";

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
      // Images (SVG excluded - can contain embedded scripts)
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
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
  // Priority: 1. Profile display name (if set and not @id), 2. Sign-in name, 3. @id format
  if (user.displayName && !user.displayName.startsWith('@')) {
    return user.displayName;
  }
  if (user.signInName) {
    return user.signInName;
  }
  // Fallback to @id format using last 6 characters of wallet address
  return `@${user.walletAddress.slice(-6)}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(globalLimiter);

  // Health check endpoints
  app.get('/health', healthCheck);
  app.get('/health/ready', readinessCheck);
  app.get('/health/live', livenessCheck);

  // Register AI integration routes
  registerAudioRoutes(app);
  registerImageRoutes(app);
  registerGoogleDriveRoutes(app);

  // GIPHY proxy - keeps API key server-side
  const GIPHY_API_KEY = process.env.GIPHY_API_KEY || process.env.VITE_GIPHY_API_KEY || '';
  app.get("/api/giphy/trending", searchLimiter, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const response = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=${limit}&rating=pg`);
      const data = await response.json();
      res.json(data);
    } catch {
      res.status(500).json({ message: "Failed to fetch GIFs" });
    }
  });

  app.get("/api/giphy/search", searchLimiter, async (req, res) => {
    try {
      const q = sanitizeText(req.query.q as string || '');
      if (!q) return res.status(400).json({ message: "Search query is required" });
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const response = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=${limit}&rating=pg`);
      const data = await response.json();
      res.json(data);
    } catch {
      res.status(500).json({ message: "Failed to search GIFs" });
    }
  });

  // Initialize database
  await initializeDatabase();

  // Get current user - optimized with caching
  app.get("/api/user", async (req, res) => {
    try {
      // Require user ID from query parameter
      if (!req.query.userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const userId = parseInt(req.query.userId as string);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Disable caching for user data to ensure real-time updates
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
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

  // Add contact - creates properly setup user for contact list
  app.post("/api/contacts/add", async (req, res) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ message: "Wallet address is required" });
      }

      // Validate wallet address using blockchain service
      const isValidWallet = await blockchainService.validateWalletAddress(walletAddress);
      if (!isValidWallet) {
        return res.status(400).json({ 
          message: "Invalid wallet address format. Please enter a valid wallet address (42 characters starting with 0x)" 
        });
      }

      // Get current user ID from request body
      const { currentUserId } = req.body;
      if (!currentUserId) {
        return res.status(400).json({ message: "Current user ID is required" });
      }

      // Parse and validate current user ID as integer
      const parsedCurrentUserId = parseInt(currentUserId);
      if (isNaN(parsedCurrentUserId)) {
        return res.status(400).json({ message: "Invalid current user ID" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByWalletAddress(walletAddress);
      let contactUser: User;
      
      if (existingUser) {
        // If user exists, ensure they're set up for contact list
        if (!existingUser.isSetup) {
          const updatedUser = await storage.updateUser(existingUser.id, {
            isSetup: true
          });
          
          
          if (updatedUser) {
            // Initialize wallet balances if not already done
            await storage.initializeWalletBalances(updatedUser.id);
            contactUser = updatedUser;
          } else {
            throw new Error("Failed to update user");
          }
        } else {
          contactUser = existingUser;
        }
      } else {
        // Create new user for contact list
        const username = `0x${walletAddress.slice(-6)}`; // Use last 6 chars for username
        contactUser = await storage.createUser({
          username,
          displayName: `@${walletAddress.slice(-6)}`, // Use wallet ID as default
          walletAddress,
          isSetup: true, // Mark as setup so they appear in contact list
          isOnline: false
        });

        // Initialize wallet balances for new user
        await storage.initializeWalletBalances(contactUser.id);
        
      }

      // Check if conversation already exists between current user and contact
      const existingConversation = await storage.getConversationBetweenUsers(parsedCurrentUserId, contactUser.id);
      
      if (!existingConversation) {
        // Create conversation between current user and new contact
        const newConversation = await storage.createConversation(parsedCurrentUserId, contactUser.id);
        
        
        // Don't create automatic welcome message to prevent unwanted highlighted conversations
      }
      
      const userWithEffectiveName = {
        ...contactUser,
        displayName: getEffectiveDisplayName(contactUser)
      };
      
      return res.json(userWithEffectiveName);
    } catch (error) {
      
      res.status(500).json({ message: "Failed to add contact" });
    }
  });

  // Find or create user by wallet address
  app.post("/api/users/find-or-create", authLimiter, async (req, res) => {
    try {
      const { walletAddress, displayName: rawDisplayName } = req.body;
      const displayName = sanitizeDisplayName(rawDisplayName);
      
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
        // Ensure user is properly set up for contact list (Web3 wallet users should appear as their own contact)
        let userToUpdate = existingUser;
        let needsUpdate = false;
        const updateData: any = {};
        
        // Update display name if provided and different
        if (displayName && displayName !== existingUser.signInName) {
          
          updateData.signInName = displayName;
          updateData.displayName = displayName; // Also update displayName to match sign-in name
          needsUpdate = true;
        }
        
        // Ensure user is set up for contact list
        if (!existingUser.isSetup) {
          
          updateData.isSetup = true;
          needsUpdate = true;
        }
        
        // Update user if needed
        if (needsUpdate) {
          const updatedUser = await storage.updateUser(existingUser.id, updateData);
          if (updatedUser) {
            userToUpdate = updatedUser;
            
          }
        }
        
        // Ensure user has a self-conversation for messaging themselves
        const selfConversation = await storage.getConversationBetweenUsers(existingUser.id, existingUser.id);
        if (!selfConversation) {
          
          await storage.createConversation(existingUser.id, existingUser.id);
        }
        
        // Return user with effective display name
        const userWithEffectiveName = {
          ...userToUpdate,
          displayName: getEffectiveDisplayName(userToUpdate)
        };
        return res.json(userWithEffectiveName);
      }

      // Create new user with wallet address
      const userData = {
        username: walletAddress.slice(0, 8), // Use first 8 chars as username
        displayName: displayName || `@${walletAddress.slice(-6)}`, // Use display name or @id format
        signInName: displayName, // Store the sign-in name separately (can be null)
        walletAddress: walletAddress,
        isSetup: true, // Set to true so Web3 wallet users appear as their own contact
        isOnline: true,
        profileImage: null
      };

      const newUser = await storage.createUser(userData);
      
      // Fetch real blockchain balances for the wallet address
      
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

      
      
      // Create self-conversation for messaging yourself
      const selfConversation = await storage.createConversation(newUser.id, newUser.id);
      
      
      // Return user with effective display name
      const userWithEffectiveName = {
        ...newUser,
        displayName: getEffectiveDisplayName(newUser)
      };
      
      return res.json(userWithEffectiveName);
    } catch (error) {
      
      res.status(500).json({ message: "Failed to find or create user" });
    }
  });

  // Get conversations for current user
  app.get("/api/conversations", async (req, res) => {
    try {
      // Require user ID from query parameter
      if (!req.query.userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const userId = parseInt(req.query.userId as string);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
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

      // No cache headers to ensure fresh data
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      
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

  // Send a message
  app.post("/api/conversations/:id/messages", messageLimiter, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }

      // Validate senderId from request body
      const senderId = req.body.senderId;
      if (!senderId) {
        return res.status(400).json({ message: "Sender ID is required" });
      }

      const actualSenderId = parseInt(senderId);
      if (isNaN(actualSenderId)) {
        return res.status(400).json({ message: "Invalid sender ID" });
      }

      // Sanitize content first, then validate
      const sanitizedContent = sanitizeText(req.body.content);
      
      if (req.body.messageType === 'text' && !sanitizedContent) {
        return res.status(400).json({ message: "Message content is required" });
      }

      // Check if conversation exists
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const messageData = {
        conversationId,
        senderId: actualSenderId,
        content: sanitizedContent,
        messageType: req.body.messageType || "text",
        replyToId: req.body.replyToId || null,
        replyToContent: sanitizeText(req.body.replyToContent),
        replyToSender: sanitizeDisplayName(req.body.replyToSender),
        cryptoAmount: sanitizeNumericString(req.body.cryptoAmount),
        cryptoCurrency: sanitizeText(req.body.cryptoCurrency),
        audioFilePath: sanitizeUrl(req.body.audioFilePath),
        transcription: sanitizeText(req.body.transcription),
        audioDuration: req.body.audioDuration || null,
        productId: req.body.productId || null,
        productTitle: sanitizeText(req.body.productTitle),
        productPrice: req.body.productPrice || null,
        productImage: sanitizeUrl(req.body.productImage),
        attachmentUrl: sanitizeUrl(req.body.attachmentUrl),
        attachmentType: sanitizeText(req.body.attachmentType),
        attachmentName: sanitizeText(req.body.attachmentName),
        attachmentSize: req.body.attachmentSize || null,
        gifUrl: sanitizeUrl(req.body.gifUrl),
        gifTitle: sanitizeText(req.body.gifTitle),
        gifId: req.body.gifId || null
      };

      const message = await storage.createMessage(messageData);
      
      if (!message) {
        return res.status(500).json({ message: "Failed to create message" });
      }

      // Get signaling system for instant notifications and real-time updates
      const webrtcSignaling = app.get('webrtcSignaling');
      
      if (webrtcSignaling) {
        try {
          // Get sender info for notification
          const sender = await storage.getUser(actualSenderId);
          const senderDisplayName = sender ? (sender.displayName || sender.signInName || `@${sender.username}`) : 'Unknown User';
          
          // Broadcast message to all users in the conversation room
          webrtcSignaling.broadcastNewMessage(conversationId.toString(), {
            ...message,
            sender: {
              ...sender,
              effectiveDisplayName: senderDisplayName
            }
          });
          
          // Send instant notifications to other participants
          let participants = [];
          if (conversation.isGroup) {
            participants = await storage.getGroupMembers(conversationId);
          } else {
            // For regular conversations, get participants by their IDs
            const participant1 = conversation.participant1Id ? await storage.getUser(conversation.participant1Id) : null;
            const participant2 = conversation.participant2Id ? await storage.getUser(conversation.participant2Id) : null;
            participants = [participant1, participant2].filter(Boolean);
          }
          
          participants.forEach(participant => {
            if (participant && participant.id !== actualSenderId) {
              let notificationBody = '';
              
              if (messageData.messageType === 'text') {
                notificationBody = messageData.content || 'New message';
              } else if (messageData.messageType === 'crypto') {
                notificationBody = `Sent ${messageData.cryptoAmount} ${messageData.cryptoCurrency}`;
              } else if (messageData.messageType === 'attachment') {
                notificationBody = `Sent a file: ${messageData.attachmentName}`;
              } else if (messageData.messageType === 'gif') {
                notificationBody = `Sent a GIF: ${messageData.gifTitle}`;
              } else if (messageData.messageType === 'product_share') {
                notificationBody = `Shared a product: ${messageData.productTitle}`;
              } else {
                notificationBody = 'New message';
              }
              
              webrtcSignaling.sendInstantNotification(participant.id.toString(), {
                type: 'message',
                title: `New message from ${senderDisplayName}`,
                body: notificationBody,
                conversationId: conversationId.toString(),
                messageId: message.id.toString(),
                fromUserId: actualSenderId.toString(),
                fromUserName: senderDisplayName
              });
            }
          });
        } catch (notificationError) {

          // Don't fail the message send if notifications fail
        }
      }

      res.status(201).json(message);
    } catch (error) {

      res.status(500).json({ 
        message: "Failed to send message", 
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined 
      });
    }
  });

  // Upload attachment and send message
  app.post("/api/conversations/:id/messages/attachment", uploadLimiter, attachmentUpload.single('file'), async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      // Use senderId from request body (current connected user)
      const senderId = req.body.senderId || 5; // Fallback to 5 for backward compatibility
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
        content: sanitizeText(req.body.content),
        messageType: "attachment" as const,
        attachmentUrl,
        attachmentType,
        attachmentName: file.originalname,
        attachmentSize: file.size
      };

      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      
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

  // Delete conversation (remove contact)
  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { currentUserId } = req.body;
      
      

      if (!conversationId) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }

      if (!currentUserId) {
        return res.status(400).json({ message: "Current user ID is required" });
      }

      // Delete all messages in the conversation first
      await storage.deleteMessagesByConversation(conversationId);
      
      // Then delete the conversation
      await storage.deleteConversation(conversationId, currentUserId);
      
      res.json({ message: "Contact deleted successfully" });
    } catch (error) {
      
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });

  // Get wallet balances
  app.get("/api/wallet/balances", async (req, res) => {
    try {
      // Require user ID from query parameter
      if (!req.query.userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const userId = parseInt(req.query.userId as string);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Get existing balances from database first
      let balances = await storage.getUserWalletBalances(userId);
      
      // Initialize wallet balances if user doesn't have any
      if (balances.length === 0) {
        await storage.initializeWalletBalances(userId);
        balances = await storage.getUserWalletBalances(userId);
      }
      
      res.json(balances);
    } catch (error) {
      console.error('Error fetching wallet balances:', error);
      res.status(500).json({ message: "Failed to get wallet balances" });
    }
  });

  // Refresh wallet balances with real-time blockchain data
  app.post("/api/wallet/balances/refresh", walletLimiter, async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      console.log(`Refreshing wallet balances for user ${userId}`);

      // Get user info to check if they have a real wallet address
      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Initialize wallet balances if user doesn't have any
      let currentBalances = await storage.getUserWalletBalances(parseInt(userId));
      if (currentBalances.length === 0) {
        await storage.initializeWalletBalances(parseInt(userId));
        currentBalances = await storage.getUserWalletBalances(parseInt(userId));
      }

      let refreshedBalances;

      if (user.walletAddress && user.walletAddress.startsWith('0x') && user.walletAddress.length === 42) {
        // Real Trust Wallet user - fetch actual blockchain balances
        console.log(`Fetching real blockchain balances for Trust Wallet user: ${user.walletAddress}`);
        refreshedBalances = await blockchainService.getWalletBalances(user.walletAddress);
        
        // Update all balances with real blockchain data
        for (const balance of refreshedBalances) {
          // Check if balance record exists
          const existingBalance = await storage.getUserCurrencyBalance(parseInt(userId), balance.currency);
          if (existingBalance) {
            await storage.updateWalletBalance(parseInt(userId), balance.currency, {
              balance: balance.balance, // Real blockchain amounts
              usdValue: balance.usdValue, // Real USD values
              changePercent: balance.changePercent
            });
          } else {
            // Create new balance record if it doesn't exist
            await storage.createWalletBalance({
              userId: parseInt(userId),
              currency: balance.currency,
              balance: balance.balance,
              usdValue: balance.usdValue,
              changePercent: balance.changePercent
            });
          }
        }
        
      } else {
        // Demo user - use demo-friendly refresh to maintain balances and update USD values
        console.log(`Refreshing demo balances for user ${userId}`);
        refreshedBalances = await blockchainService.refreshDemoBalances(currentBalances);
        
        // Update USD values in database
        for (const balance of refreshedBalances) {
          await storage.updateWalletBalance(parseInt(userId), balance.currency, {
            balance: balance.balance, // Keep existing crypto amounts for demo users
            usdValue: balance.usdValue, // Update USD value with current prices
            changePercent: balance.changePercent
          });
        }
      }

      // Return updated balances
      const updatedBalances = await storage.getUserWalletBalances(parseInt(userId));
      
      console.log(`Successfully refreshed balances for user ${userId}:`, updatedBalances);
      res.json(updatedBalances);
    } catch (error) {
      console.error('Error refreshing wallet balances:', error);
      res.status(500).json({ message: "Failed to refresh wallet balances" });
    }
  });

  // Send cryptocurrency via chat
  app.post("/api/wallet/send", walletLimiter, async (req, res) => {
    try {
      const { toUserId, currency: rawCurrency, amount, conversationId, fromUserId, transactionHash: rawTxHash, isBlockchainTransaction, senderAddress, recipientAddress } = req.body;
      const currency = sanitizeText(rawCurrency);
      const transactionHash = sanitizeText(rawTxHash);
      // Get actual authenticated user ID
      const actualFromUserId = fromUserId || (req as any).session?.userId || 5;

      if (!toUserId || !currency || !amount) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      // Get recipient user to verify wallet address
      const recipientUser = await storage.getUser(toUserId);
      if (!recipientUser) {
        return res.status(404).json({ message: "Recipient not found" });
      }

      // For BNB transactions, validate recipient has proper BNB wallet address
      if (currency === 'BNB') {
        if (!recipientUser.walletAddress || 
            !recipientUser.walletAddress.startsWith('0x') || 
            recipientUser.walletAddress.length !== 42) {
          return res.status(400).json({ 
            message: "Recipient does not have a valid BNB-compatible wallet address. BNB requires a BSC-compatible address." 
          });
        }
      }

      // Check if sender has sufficient balance
      const senderBalance = await storage.getUserCurrencyBalance(actualFromUserId, currency);
      if (!senderBalance || parseFloat(senderBalance.balance) < numAmount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // For BNB with blockchain transaction
      if (currency === 'BNB' && isBlockchainTransaction) {
        // Get sender info
        const senderUser = await storage.getUser(actualFromUserId);
        if (!senderUser || !senderUser.walletAddress) {
          return res.status(400).json({ message: "Sender wallet address not found" });
        }

        console.log(`✅ Real BNB blockchain transaction completed:`);
        console.log(`From: ${senderAddress || senderUser.walletAddress}`);
        console.log(`To: ${recipientAddress || recipientUser.walletAddress}`);
        console.log(`Amount: ${numAmount} BNB`);
        console.log(`Transaction Hash: ${transactionHash}`);
        
        // Update internal balances to reflect blockchain transaction
        const success = await storage.transferCurrency(actualFromUserId, toUserId, currency, numAmount);
        if (!success) {
          return res.status(500).json({ message: "Failed to update internal balances after blockchain transaction" });
        }
        
      } else if (currency === 'BNB') {
        // BNB without blockchain (shouldn't happen, but fallback)
        console.log(`⚠️ BNB transaction without blockchain - using internal transfer`);
        const success = await storage.transferCurrency(actualFromUserId, toUserId, currency, numAmount);
        if (!success) {
          return res.status(500).json({ message: "Transfer failed" });
        }
      } else {
        // For other currencies, use internal transfer
        const success = await storage.transferCurrency(actualFromUserId, toUserId, currency, numAmount);
        if (!success) {
          return res.status(500).json({ message: "Transfer failed" });
        }
      }

      // Create transfer message
      const transferMessage = {
        conversationId: conversationId || 1, // Use passed conversationId or default
        senderId: actualFromUserId,
        content: `Sent ${amount} ${currency}`,
        messageType: "crypto_transfer" as const,
        cryptoAmount: amount,
        cryptoCurrency: currency,
        transactionHash: transactionHash || null
      };

      await storage.createMessage(transferMessage);

      res.json({ 
        message: "Transfer successful",
        recipientAddress: recipientUser.walletAddress,
        currency: currency,
        amount: numAmount,
        transactionHash: transactionHash || null,
        isBlockchainTransaction: isBlockchainTransaction || false
      });
    } catch (error) {
      
      res.status(500).json({ message: "Failed to send cryptocurrency" });
    }
  });

  // Send cryptocurrency via wallet sidebar to external address
  app.post("/api/wallet/send-external", (_req, res) => {
    res.status(410).json({ message: "This endpoint has been removed. Use /api/wallet/send instead." });
  });

  // Ensure user has an internal server-managed BSC wallet (generate if missing)
  app.post("/api/wallet/ensure-internal-wallet", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ message: "userId required" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (user.internalWalletAddress && user.encryptedPrivateKey) {
        return res.json({ walletAddress: user.internalWalletAddress, created: false });
      }

      const { address, privateKey } = generateWallet();
      const encrypted = encryptPrivateKey(privateKey);
      await storage.updateUser(userId, {
        internalWalletAddress: address,
        encryptedPrivateKey: encrypted,
      });

      console.log(`✅ Internal wallet generated for user ${userId}: ${address}`);
      return res.json({ walletAddress: address, created: true });
    } catch (error: any) {
      console.error("Failed to ensure internal wallet:", error);
      res.status(500).json({ message: "Failed to create internal wallet" });
    }
  });

  // Get (or auto-create) a user's internal BSC wallet address — used by frontend before sending on-chain
  app.get("/api/wallet/internal-address", async (req, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      if (!userId) return res.status(400).json({ message: "userId required" });

      let user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (!user.internalWalletAddress) {
        const { address, privateKey } = generateWallet();
        const encrypted = encryptPrivateKey(privateKey);
        await storage.updateUser(userId, { internalWalletAddress: address, encryptedPrivateKey: encrypted });
        user.internalWalletAddress = address;
      }

      return res.json({ walletAddress: user.internalWalletAddress });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get wallet address" });
    }
  });

  // Record a completed on-chain transfer — called by frontend after Thirdweb broadcasts the tx
  // Updates DB balances and creates the chat message. Does NOT sign anything.
  app.post("/api/wallet/record-transfer", walletLimiter, async (req, res) => {
    try {
      const {
        fromUserId,
        toUserId,
        toAddress,
        currency: rawCurrency,
        amount,
        transactionHash,
        conversationId,
      } = req.body;

      const currency = sanitizeText(rawCurrency);
      if (!fromUserId || !currency || !amount || !transactionHash) {
        return res.status(400).json({ message: "fromUserId, currency, amount, and transactionHash are required" });
      }
      if (!toUserId && !toAddress) {
        return res.status(400).json({ message: "toUserId or toAddress required" });
      }

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      // Update internal DB balances to reflect the completed on-chain transfer
      if (toUserId) {
        // User-to-user: ensure both users have internal wallets and transfer DB balance
        const recipientUser = await storage.getUser(toUserId);
        if (!recipientUser) return res.status(404).json({ message: "Recipient not found" });

        if (!recipientUser.internalWalletAddress) {
          const { address: rAddr, privateKey: rKey } = generateWallet();
          await storage.updateUser(toUserId, {
            internalWalletAddress: rAddr,
            encryptedPrivateKey: encryptPrivateKey(rKey),
          });
        }

        await storage.transferCurrency(fromUserId, toUserId, currency, numAmount);
      } else {
        // External send: deduct from sender DB balance only
        const senderBal = await storage.getUserCurrencyBalance(fromUserId, currency);
        if (senderBal) {
          const newBalance = (parseFloat(senderBal.balance) - numAmount).toFixed(8);
          await storage.updateWalletBalance(fromUserId, currency, { balance: newBalance });
        }
      }

      // Create chat message with the real BSCScan hash
      if (conversationId && toUserId) {
        await storage.createMessage({
          conversationId,
          senderId: fromUserId,
          content: `Sent ${amount} ${currency}`,
          messageType: "crypto_transfer" as const,
          cryptoAmount: amount,
          cryptoCurrency: currency,
          transactionHash,
        });
      }

      console.log(`✅ On-chain transfer recorded: ${numAmount} ${currency}, hash: ${transactionHash}`);
      return res.json({ message: "Transfer recorded", transactionHash, currency, amount: numAmount });
    } catch (error: any) {
      console.error("record-transfer error:", error);
      res.status(500).json({ message: error.message || "Failed to record transfer" });
    }
  });

  // Server-side blockchain transaction — no external wallet popup needed
  // Accepts toUserId (COYN user) or toAddress (any BSC address)
  app.post("/api/wallet/send-internal", walletLimiter, async (req, res) => {
    try {
      const { fromUserId, toUserId, toAddress: rawToAddress, currency: rawCurrency, amount, conversationId } = req.body;
      const currency = sanitizeText(rawCurrency) as 'BNB' | 'USDT' | 'COYN';
      const toAddress = rawToAddress ? sanitizeText(rawToAddress) : null;

      if (!fromUserId || (!toUserId && !toAddress) || !currency || !amount) {
        return res.status(400).json({ message: "Missing required fields: fromUserId, (toUserId or toAddress), currency, amount" });
      }

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const senderUser = await storage.getUser(fromUserId);
      if (!senderUser) return res.status(404).json({ message: "Sender not found" });

      // Auto-generate internal wallet for sender if missing
      if (!senderUser.internalWalletAddress || !senderUser.encryptedPrivateKey) {
        const { address, privateKey } = generateWallet();
        const encrypted = encryptPrivateKey(privateKey);
        await storage.updateUser(fromUserId, { internalWalletAddress: address, encryptedPrivateKey: encrypted });
        senderUser.internalWalletAddress = address;
        senderUser.encryptedPrivateKey = encrypted;
        console.log(`✅ Auto-generated internal wallet for sender ${fromUserId}: ${address}`);
      }

      // Check sender has sufficient internal balance
      const senderBalance = await storage.getUserCurrencyBalance(fromUserId, currency);
      if (!senderBalance || parseFloat(senderBalance.balance) < numAmount) {
        return res.status(400).json({ message: `Insufficient ${currency} balance` });
      }

      // Determine recipient address
      let recipientAddress: string;
      let recipientUser: any = null;

      if (toUserId) {
        recipientUser = await storage.getUser(toUserId);
        if (!recipientUser) return res.status(404).json({ message: "Recipient not found" });

        if (!recipientUser.internalWalletAddress) {
          const { address: rAddr, privateKey: rKey } = generateWallet();
          await storage.updateUser(toUserId, { internalWalletAddress: rAddr, encryptedPrivateKey: encryptPrivateKey(rKey) });
          recipientUser.internalWalletAddress = rAddr;
          console.log(`✅ Auto-generated internal wallet for recipient ${toUserId}: ${rAddr}`);
        }
        recipientAddress = recipientUser.internalWalletAddress;
      } else {
        // External BSC address send
        if (!toAddress || !toAddress.startsWith('0x') || toAddress.length !== 42) {
          return res.status(400).json({ message: "Invalid recipient BSC address" });
        }
        recipientAddress = toAddress;
      }

      // Transaction routing:
      // - User-to-user: COYN internal DB transfer only (no on-chain attempt). Works like PayPal internal transfers.
      // - External address: must succeed on-chain or hard fail — never silently deduct DB balance.
      let transactionHash: string | null = null;

      if (toUserId) {
        // Internal COYN platform transfer — DB only, instant, no gas required
        const success = await storage.transferCurrency(fromUserId, toUserId, currency, numAmount);
        if (!success) return res.status(500).json({ message: "Failed to update balances" });
        console.log(`✅ Internal COYN transfer: ${numAmount} ${currency} from user ${fromUserId} to user ${toUserId}`);
      } else {
        // External blockchain send — attempt on-chain. Hard fail if it doesn't go through.
        try {
          if (currency === 'BNB') {
            const result = await sendBNBInternal(senderUser.encryptedPrivateKey!, recipientAddress, amount);
            transactionHash = result.transactionHash;
          } else if (currency === 'USDT' || currency === 'COYN') {
            const result = await sendERC20Internal(senderUser.encryptedPrivateKey!, currency as 'USDT' | 'COYN', recipientAddress, amount);
            transactionHash = result.transactionHash;
          }
          console.log(`✅ On-chain ${currency} tx: ${transactionHash}`);
        } catch (chainErr: any) {
          console.error(`❌ External on-chain send failed: ${chainErr.message}`);
          return res.status(400).json({
            message: `On-chain transaction failed: ${chainErr.message}`,
            onChain: false,
          });
        }
        // Only deduct DB balance after confirmed on-chain success
        const senderBal = await storage.getUserCurrencyBalance(fromUserId, currency);
        if (senderBal) {
          const newBalance = (parseFloat(senderBal.balance) - numAmount).toFixed(8);
          await storage.updateWalletBalance(fromUserId, currency, { balance: newBalance });
        }
      }

      // Create crypto transfer message if in a conversation
      if (conversationId && toUserId) {
        await storage.createMessage({
          conversationId,
          senderId: fromUserId,
          content: `Sent ${amount} ${currency}`,
          messageType: "crypto_transfer" as const,
          cryptoAmount: amount,
          cryptoCurrency: currency,
          transactionHash: transactionHash || undefined,
        });
      }

      return res.json({
        message: "Transfer successful",
        transactionHash,
        currency,
        amount: numAmount,
        fromAddress: senderUser.internalWalletAddress,
        toAddress: recipientAddress,
        onChain: !!transactionHash,
      });
    } catch (error: any) {
      console.error("Internal send failed:", error);
      res.status(500).json({ message: "Failed to send cryptocurrency" });
    }
  });

  // Delete a message
  app.delete("/api/messages/:id", async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const userId = req.body.userId || 5; // Use userId from request body (current connected user)

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
      // Get user ID from query parameter or default to 5 for backward compatibility
      const userId = req.query.userId ? parseInt(req.query.userId as string) : 5;
      const starredMessages = await storage.getStarredMessages(userId);
      res.json(starredMessages);
    } catch (error) {
      
      res.status(500).json({ message: "Failed to get starred messages" });
    }
  });

  // Get transaction history
  app.get("/api/transactions/history", async (req, res) => {
    try {
      // Get user ID from query parameter or default to 5 for backward compatibility
      const userId = req.query.userId ? parseInt(req.query.userId as string) : 5;
      const transactions = await storage.getUserTransactionHistory(userId);
      res.json(transactions);
    } catch (error) {
      
      res.status(500).json({ message: "Failed to get transaction history" });
    }
  });

  // Toggle star on a message
  app.patch("/api/messages/:id/star", async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      // Get user ID from query parameter or default to 5 for backward compatibility
      const userId = req.query.userId ? parseInt(req.query.userId as string) : 5;
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
      const { walletAddress, displayName: rawDisplayName } = req.body;
      const displayName = sanitizeDisplayName(rawDisplayName);
      
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
          if (key === 'email') {
            updates[key] = sanitizeEmail(value as string);
          } else if (key === 'profilePicture') {
            updates[key] = sanitizeUrl(value as string);
          } else {
            updates[key] = sanitizeDisplayName(value as string);
          }
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ 
          message: "No valid fields to update" 
        });
      }
      
      
      
      const user = await storage.updateUser(userId, updates);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      
      res.json(user);
    } catch (error) {
      
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
  app.post("/api/user/upload-avatar", uploadLimiter, upload.single('profileImage'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Get user ID from query parameter (frontend manages auth via localStorage)
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      const profilePicture = `/uploads/avatars/${req.file.filename}`;
      
      
      
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
      
      res.status(500).json({ message: "Failed to upload profile picture" });
    }
  });

  // Clear all user data
  app.delete("/api/user/clear-all-data", async (req, res) => {
    try {
      const userId = req.body.userId;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      
      
      // Clear all user data from database
      const success = await storage.clearAllUserData(userId);
      
      if (!success) {
        return res.status(404).json({ message: "User not found or failed to clear data" });
      }
      
      res.json({ 
        message: "All user data cleared successfully" 
      });
    } catch (error) {
      
      res.status(500).json({ message: "Failed to clear user data" });
    }
  });



  // Create a new group chat
  app.post("/api/groups", async (req, res) => {
    try {
      const { groupName: rawGroupName, memberIds } = req.body;
      const groupName = sanitizeText(rawGroupName);
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
      
      res.status(500).json({ message: "Failed to get group members" });
    }
  });

  // Share messages between conversations
  app.post("/api/messages/share", async (req, res) => {
    try {
      const { conversationIds, messageIds, userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const parsedUserId = parseInt(userId);
      if (isNaN(parsedUserId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
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
            senderId: parsedUserId,
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
      
      res.status(500).json({ message: "Failed to share messages" });
    }
  });

  // Share product to conversations
  app.post("/api/messages/share-product", async (req, res) => {
    try {
      const { conversationIds, productId, productTitle: rawTitle, productPrice, productImage: rawImage, userId } = req.body;
      const productTitle = sanitizeText(rawTitle);
      const productImage = sanitizeUrl(rawImage);
      
      if (!conversationIds || conversationIds.length === 0 || !productId || !productTitle || !userId) {
        return res.status(400).json({ message: "Missing required product information or user ID" });
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
      
      res.status(500).json({ message: "Failed to share product" });
    }
  });



  // Favorites API routes
  app.get("/api/favorites", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const favorites = await storage.getFavorites(userId);
      res.json(favorites);
    } catch (error) {
      
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post("/api/favorites", async (req, res) => {
    try {
      const { userId, productId, productTitle, productPrice, productImage, productCategory, productRating } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
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
      
      res.status(500).json({ message: "Failed to add to favorites" });
    }
  });

  app.delete("/api/favorites/:productId", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      const { productId } = req.params;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const success = await storage.removeFromFavorites(userId, productId);
      
      if (!success) {
        return res.status(404).json({ message: "Favorite not found" });
      }

      res.json({ 
        message: "Removed from favorites",
        action: "removed"
      });
    } catch (error) {
      
      res.status(500).json({ message: "Failed to remove from favorites" });
    }
  });

  // Enhanced Marketplace API routes - returns all products when no query provided
  app.get("/api/marketplace/search", async (req, res) => {
    try {
      const { query = "", category = "", minPrice, maxPrice } = req.query;
      const searchQuery = query as string;
      const searchCategory = category as string;
      
      const products = await marketplaceAPI.searchProducts(
        searchQuery,
        searchCategory,
        minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice ? parseFloat(maxPrice as string) : undefined
      );
      
      
      res.json(products);
    } catch (error) {
      
      res.status(500).json({ message: "Failed to search products" });
    }
  });

  // Individual product details
  app.get("/api/marketplace/product/:asin", async (req, res) => {
    try {
      const { asin } = req.params;
      // Find product in catalog
      const allProducts = marketplaceAPI.getAmazonCatalogProducts();
      const product = allProducts.find(p => p.ASIN === asin);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      
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

      // Simple payment simulation - in a real app this would integrate with payment processors
      
      
      // Simulate payment processing success
      const result = { success: true, transactionId: `tx_${Date.now()}` };

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
        
        
      }

      
      
      
      res.json({
        success: true,
        transactionId: result.transactionId,
        message: "Purchase completed successfully",
        nftReward: rewardTier ? { tier: rewardTier, earned: true } : null
      });
    } catch (error) {
      
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
      
      res.status(500).json({ message: "Failed to create purchase" });
    }
  });

  // Crypto rates endpoint
  app.get("/api/crypto/rates", async (req, res) => {
    try {
      const rates = await marketplaceAPI.getCryptoRates();
      res.json(rates);
    } catch (error) {
      
      res.status(500).json({ message: "Failed to fetch crypto rates" });
    }
  });



  // Link preview endpoint - fetches metadata from URLs
  app.get("/api/link-preview", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      // Validate URL
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          return res.status(400).json({ error: "Invalid URL protocol" });
        }
      } catch {
        return res.status(400).json({ error: "Invalid URL" });
      }

      // Fetch the page
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
          'Accept': 'text/html'
        }
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return res.status(404).json({ error: "Could not fetch URL" });
      }

      const html = await response.text();
      
      // Extract metadata using regex (simple approach without external dependencies)
      const getMetaContent = (property: string): string | null => {
        const ogMatch = html.match(new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'));
        if (ogMatch) return ogMatch[1];
        const ogMatch2 = html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i'));
        if (ogMatch2) return ogMatch2[1];
        const nameMatch = html.match(new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'));
        if (nameMatch) return nameMatch[1];
        const nameMatch2 = html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${property}["']`, 'i'));
        return nameMatch2 ? nameMatch2[1] : null;
      };

      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      
      const metadata = {
        url: url,
        title: getMetaContent('og:title') || getMetaContent('twitter:title') || (titleMatch ? titleMatch[1].trim() : null),
        description: getMetaContent('og:description') || getMetaContent('twitter:description') || getMetaContent('description'),
        image: getMetaContent('og:image') || getMetaContent('twitter:image'),
        siteName: getMetaContent('og:site_name') || parsedUrl.hostname,
        favicon: `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`
      };

      // Make image URL absolute if relative
      if (metadata.image && !metadata.image.startsWith('http')) {
        metadata.image = new URL(metadata.image, url).href;
      }

      res.json(metadata);
    } catch (error: any) {
      console.error("Link preview error:", error.message);
      res.status(500).json({ error: "Failed to fetch link preview" });
    }
  });

  const httpServer = createServer(app);
  
  // Initialize encrypted WebRTC signaling server
  const webrtcSignaling = new EncryptedWebRTCSignaling(httpServer);
  
  // Make signaling system available for message broadcasting
  app.set('webrtcSignaling', webrtcSignaling);
  
  
  return httpServer;
}