import { pgTable, text, serial, integer, boolean, timestamp, decimal, real, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  signInName: text("sign_in_name"), // Name provided during wallet sign-in
  walletAddress: text("wallet_address").notNull(),
  profilePicture: text("profile_picture"),
  isOnline: boolean("is_online").default(false),
  isSetup: boolean("is_setup").default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
  internalWalletAddress: text("internal_wallet_address"),
  encryptedPrivateKey: text("encrypted_private_key"),
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
  participant1Id: integer("participant1_id"),
  participant2Id: integer("participant2_id"),
  isGroup: boolean("is_group").default(false),
  groupName: text("group_name"),
  groupDescription: text("group_description"),
  createdBy: integer("created_by"),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
});

export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  userId: integer("user_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
  role: text("role").default("member"), // admin, member
}, (table) => ({
  unique: unique().on(table.conversationId, table.userId),
}));

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  senderId: integer("sender_id").notNull(),
  content: text("content"),
  messageType: text("message_type").notNull().default("text"), // text, crypto, system, voice, product_share, attachment, gif, ai_image
  replyToId: integer("reply_to_id"), // ID of message being replied to
  replyToContent: text("reply_to_content"), // Cached content of replied message
  replyToSender: text("reply_to_sender"), // Cached sender name of replied message
  cryptoAmount: decimal("crypto_amount", { precision: 18, scale: 8 }),
  cryptoCurrency: text("crypto_currency"),
  audioFilePath: text("audio_file_path"), // for voice messages
  transcription: text("transcription"), // AI transcribed text
  audioDuration: integer("audio_duration"), // duration in seconds
  // Product sharing fields
  productId: text("product_id"), // Product ASIN for shared products
  productTitle: text("product_title"), // Product title for shared products
  productPrice: text("product_price"), // Product price for shared products
  productImage: text("product_image"), // Product image URL for shared products
  // File attachment fields
  attachmentUrl: text("attachment_url"), // File URL in uploads folder
  attachmentType: text("attachment_type"), // image, video, file
  attachmentName: text("attachment_name"), // Original filename
  attachmentSize: integer("attachment_size"), // File size in bytes
  // GIF fields
  gifUrl: text("gif_url"), // GIF URL from GIPHY
  gifTitle: text("gif_title"), // GIF title/description
  gifId: text("gif_id"), // GIPHY ID for the GIF
  // AI Image fields
  aiImageData: text("ai_image_data"), // Base64 or URL of AI-generated image
  aiImagePrompt: text("ai_image_prompt"), // Prompt used to generate the image
  // Blockchain transaction fields
  transactionHash: text("transaction_hash"), // Blockchain transaction hash for crypto transfers
  isStarred: boolean("is_starred").default(false),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const walletBalances = pgTable("wallet_balances", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  currency: text("currency").notNull(), // BNB, COYN, USDT
  balance: decimal("balance", { precision: 18, scale: 8 }).notNull(),
  usdValue: decimal("usd_value", { precision: 15, scale: 2 }),
  changePercent: decimal("change_percent", { precision: 5, scale: 2 }),
}, (table) => ({
  unique: unique().on(table.userId, table.currency),
}));



// Dispute resolution system


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

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export const nftRewards = pgTable("nft_rewards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  tier: text("tier").notNull(), // bronze, silver, gold, diamond
  productId: text("product_id").notNull(),
  productTitle: text("product_title").notNull(),
  purchaseValue: decimal("purchase_value", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  nftTokenId: text("nft_token_id"),
  isRedeemed: boolean("is_redeemed").default(false),
  earnedAt: timestamp("earned_at").defaultNow(),
  redeemedAt: timestamp("redeemed_at"),
});

export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: text("product_id").notNull(),
  productTitle: text("product_title").notNull(),
  quantity: integer("quantity").notNull().default(1),
  totalValue: decimal("total_value", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  paymentMethod: text("payment_method").notNull(), // BTC, BNB, USDT, COYN
  transactionHash: text("transaction_hash"),
  status: text("status").notNull().default("pending"), // pending, confirmed, shipped, delivered
  shippingAddress: text("shipping_address"),
  orderNotes: text("order_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNFTRewardSchema = createInsertSchema(nftRewards).omit({
  id: true,
  earnedAt: true,
  redeemedAt: true,
});

export const insertPurchaseSchema = createInsertSchema(purchases).omit({
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
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type NFTReward = typeof nftRewards.$inferSelect;
export type InsertNFTReward = z.infer<typeof insertNFTRewardSchema>;
export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
