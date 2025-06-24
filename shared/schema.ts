import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  walletAddress: text("wallet_address").notNull(),
  profilePicture: text("profile_picture"),
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  participant1Id: integer("participant1_id").notNull(),
  participant2Id: integer("participant2_id").notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  senderId: integer("sender_id").notNull(),
  content: text("content"),
  messageType: text("message_type").notNull().default("text"), // text, crypto, system
  cryptoAmount: decimal("crypto_amount", { precision: 18, scale: 8 }),
  cryptoCurrency: text("crypto_currency"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const walletBalances = pgTable("wallet_balances", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  currency: text("currency").notNull(), // BTC, ETH, COYN, USDT
  balance: decimal("balance", { precision: 18, scale: 8 }).notNull(),
  usdValue: decimal("usd_value", { precision: 10, scale: 2 }),
  changePercent: decimal("change_percent", { precision: 5, scale: 2 }),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  lastSeen: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  lastMessageAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true,
});

export const insertWalletBalanceSchema = createInsertSchema(walletBalances).omit({
  id: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type WalletBalance = typeof walletBalances.$inferSelect;
export type InsertWalletBalance = z.infer<typeof insertWalletBalanceSchema>;
