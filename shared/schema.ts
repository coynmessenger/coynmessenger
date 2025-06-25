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
  // Mailing address fields for marketplace delivery
  fullName: text("full_name"),
  phoneNumber: text("phone_number"),
  addressLine1: text("address_line_1"),
  addressLine2: text("address_line_2"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country"),
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
  messageType: text("message_type").notNull().default("text"), // text, crypto, system, voice
  cryptoAmount: decimal("crypto_amount", { precision: 18, scale: 8 }),
  cryptoCurrency: text("crypto_currency"),
  audioFilePath: text("audio_file_path"), // for voice messages
  transcription: text("transcription"), // AI transcribed text
  audioDuration: integer("audio_duration"), // duration in seconds
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

export const escrows = pgTable("escrows", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  initiatorId: integer("initiator_id").notNull(),
  participantId: integer("participant_id").notNull(),
  initiatorCurrency: text("initiator_currency").notNull(),
  participantCurrency: text("participant_currency").notNull(),
  initiatorRequiredAmount: decimal("initiator_required_amount", { precision: 18, scale: 8 }).notNull(),
  participantRequiredAmount: decimal("participant_required_amount", { precision: 18, scale: 8 }).notNull(),
  initiatorAmount: decimal("initiator_amount", { precision: 18, scale: 8 }).default("0"),
  participantAmount: decimal("participant_amount", { precision: 18, scale: 8 }).default("0"),
  status: text("status").notNull().default("pending"), // pending, funded, released, cancelled
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  releasedAt: timestamp("released_at"),
});

export const timeProducts = pgTable("time_products", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  basePrice: decimal("base_price", { precision: 18, scale: 8 }).notNull(),
  currency: text("currency").notNull().default("COYN"),
  imageUrl: text("image_url"),
  category: text("category").notNull(),
  creatorId: integer("creator_id").references(() => users.id),
  
  // Time-based mechanics
  manifestTime: timestamp("manifest_time").notNull(),
  vanishTime: timestamp("vanish_time").notNull(),
  isActive: boolean("is_active").default(true),
  
  // Dynamic pricing
  volatilityFactor: decimal("volatility_factor", { precision: 4, scale: 2 }).default("1.0"),
  priceMultiplier: decimal("price_multiplier", { precision: 4, scale: 2 }).default("1.0"),
  
  // Rarity and access
  maxQuantity: integer("max_quantity").default(1),
  currentQuantity: integer("current_quantity").default(1),
  accessLevel: text("access_level").default("public"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const productInteractions = pgTable("product_interactions", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => timeProducts.id),
  userId: integer("user_id").references(() => users.id),
  interactionType: text("interaction_type").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  cryptoReward: decimal("crypto_reward", { precision: 18, scale: 8 }),
});

export const productDesires = pgTable("product_desires", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => timeProducts.id),
  userId: integer("user_id").references(() => users.id),
  desireStrength: integer("desire_strength").default(1),
  cryptoStaked: decimal("crypto_staked", { precision: 18, scale: 8 }),
  createdAt: timestamp("created_at").defaultNow(),
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

export const insertEscrowSchema = createInsertSchema(escrows).omit({
  id: true,
  createdAt: true,
  releasedAt: true,
});

export const insertTimeProductSchema = createInsertSchema(timeProducts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductInteractionSchema = createInsertSchema(productInteractions).omit({
  id: true,
  timestamp: true,
});

export const insertProductDesireSchema = createInsertSchema(productDesires).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type WalletBalance = typeof walletBalances.$inferSelect;
export type InsertWalletBalance = z.infer<typeof insertWalletBalanceSchema>;
export type Escrow = typeof escrows.$inferSelect;
export type InsertEscrow = z.infer<typeof insertEscrowSchema>;
export type TimeProduct = typeof timeProducts.$inferSelect;
export type InsertTimeProduct = z.infer<typeof insertTimeProductSchema>;
export type ProductInteraction = typeof productInteractions.$inferSelect;
export type InsertProductInteraction = z.infer<typeof insertProductInteractionSchema>;
export type ProductDesire = typeof productDesires.$inferSelect;
export type InsertProductDesire = z.infer<typeof insertProductDesireSchema>;
