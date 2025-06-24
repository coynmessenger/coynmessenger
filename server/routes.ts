import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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

  const httpServer = createServer(app);
  return httpServer;
}
