import { pgTable, text, serial, integer, boolean, timestamp, decimal, real, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  walletAddress: text("wallet_address").notNull(),
  profilePicture: text("profile_picture"),
  isOnline: boolean("is_online").default(false),
  isSetup: boolean("is_setup").default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
  // Mailing address fields for marketplace delivery
  fullName: text("full_name"),
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
  status: text("status").notNull().default("pending"), // pending, awaiting_funds, funded, confirming, released, cancelled, disputed
  description: text("description"),
  confirmationCount: integer("confirmation_count").default(0),
  requiredConfirmations: integer("required_confirmations").default(25),
  blockchainTxHash: text("blockchain_tx_hash"),
  notificationSent: boolean("notification_sent").default(false),
  
  // Enhanced escrow features
  escrowType: text("escrow_type").notNull().default("basic"), // basic, marketplace, service, custom
  priority: text("priority").notNull().default("normal"), // low, normal, high, urgent
  timeoutHours: integer("timeout_hours").default(72), // Auto-resolution timeout
  
  // Security and verification
  requiresVerification: boolean("requires_verification").default(false),
  verificationLevel: text("verification_level").default("standard"), // basic, standard, enhanced
  disputeReason: text("dispute_reason"),
  mediatorId: integer("mediator_id"),
  
  // Financial details
  escrowFeePercentage: decimal("escrow_fee_percentage", { precision: 5, scale: 4 }).default("0.01"), // 1% default
  networkFeeInitiator: decimal("network_fee_initiator", { precision: 18, scale: 8 }).default("0"),
  networkFeeParticipant: decimal("network_fee_participant", { precision: 18, scale: 8 }).default("0"),
  
  // Terms and conditions
  terms: text("terms"), // Custom terms for this escrow
  deliverables: text("deliverables"), // What needs to be delivered
  milestones: text("milestones"), // JSON array of milestones
  
  // Tracking and metadata
  tags: text("tags").array(), // Searchable tags
  metadata: text("metadata"), // JSON for additional data
  externalReference: text("external_reference"), // Link to external transaction/order
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  fundedAt: timestamp("funded_at"),
  releasedAt: timestamp("released_at"),
  lastActivity: timestamp("last_activity").defaultNow(),
  timeoutAt: timestamp("timeout_at"),
  disputedAt: timestamp("disputed_at"),
});

// Escrow milestones for complex transactions
export const escrowMilestones = pgTable("escrow_milestones", {
  id: serial("id").primaryKey(),
  escrowId: integer("escrow_id").notNull().references(() => escrows.id),
  title: text("title").notNull(),
  description: text("description"),
  requiredAmount: decimal("required_amount", { precision: 18, scale: 8 }).notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull().default("pending"), // pending, funded, completed, disputed
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Dispute resolution system
export const escrowDisputes = pgTable("escrow_disputes", {
  id: serial("id").primaryKey(),
  escrowId: integer("escrow_id").notNull().references(() => escrows.id),
  initiatorId: integer("initiator_id").notNull(),
  reason: text("reason").notNull(),
  description: text("description").notNull(),
  evidence: text("evidence"), // JSON array of evidence files/links
  status: text("status").notNull().default("open"), // open, under_review, resolved, escalated
  mediatorId: integer("mediator_id"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// Escrow templates for common transaction types
export const escrowTemplates = pgTable("escrow_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // marketplace, service, freelance, digital
  defaultTerms: text("default_terms"),
  defaultTimeout: integer("default_timeout").default(72),
  requiredFields: text("required_fields").array(), // JSON array
  suggestedTags: text("suggested_tags").array(),
  isPublic: boolean("is_public").default(false),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  productId: text("product_id").notNull(), // Amazon ASIN
  productTitle: text("product_title").notNull(),
  productPrice: text("product_price").notNull(),
  productImage: text("product_image").notNull(),
  productCategory: text("product_category").notNull(),
  productRating: real("product_rating").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  uniqueUserProduct: unique().on(table.userId, table.productId),
}));

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

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export const insertEscrowMilestoneSchema = createInsertSchema(escrowMilestones).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertEscrowDisputeSchema = createInsertSchema(escrowDisputes).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export const insertEscrowTemplateSchema = createInsertSchema(escrowTemplates).omit({
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
export type EscrowMilestone = typeof escrowMilestones.$inferSelect;
export type InsertEscrowMilestone = z.infer<typeof insertEscrowMilestoneSchema>;
export type EscrowDispute = typeof escrowDisputes.$inferSelect;
export type InsertEscrowDispute = z.infer<typeof insertEscrowDisputeSchema>;
export type EscrowTemplate = typeof escrowTemplates.$inferSelect;
export type InsertEscrowTemplate = z.infer<typeof insertEscrowTemplateSchema>;
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
