import { 
  users, conversations, messages, walletBalances, favorites,
  type User, type InsertUser, 
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
  type WalletBalance, type InsertWalletBalance,
  type Favorite, type InsertFavorite
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByWalletAddress(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  // Conversations
  getConversation(id: number): Promise<Conversation | undefined>;
  findConversation(user1Id: number, user2Id: number): Promise<Conversation | undefined>;
  getUserConversations(userId: number): Promise<(Conversation & { otherUser: User; lastMessage?: Message })[]>;
  createConversation(user1Id: number, user2Id: number): Promise<Conversation>;

  // Messages
  getMessage(id: number): Promise<Message | undefined>;
  getConversationMessages(conversationId: number): Promise<(Message & { sender: User })[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessage(messageId: number, userId: number): Promise<boolean>;
  searchMessages(query: string, userId: number): Promise<Message[]>;
  searchMessagesInConversation(query: string, conversationId: number): Promise<Message[]>;
  getStarredMessages(userId: number): Promise<(Message & { sender: User; conversationId: number })[]>;
  toggleMessageStar(messageId: number, userId: number, isStarred: boolean): Promise<boolean>;

  // Wallet
  getUserWalletBalances(userId: number): Promise<WalletBalance[]>;
  getUserCurrencyBalance(userId: number, currency: string): Promise<WalletBalance | undefined>;
  createWalletBalance(balance: InsertWalletBalance): Promise<WalletBalance>;
  updateWalletBalance(userId: number, currency: string, newBalance: string): Promise<void>;
  transferCurrency(fromUserId: number, toUserId: number, currency: string, amount: number): Promise<boolean>;

  // Favorites
  getFavorites(userId: number): Promise<Favorite[]>;
  addToFavorites(userId: number, productId: string): Promise<Favorite>;
  removeFromFavorites(userId: number, productId: string): Promise<boolean>;
  toggleFavorite(userId: number, productId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        isSetup: insertUser.isSetup ?? true
      })
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users).where(eq(users.isSetup, true));
    return allUsers;
  }

  // Conversations
  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async findConversation(user1Id: number, user2Id: number): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        or(
          and(eq(conversations.participant1Id, user1Id), eq(conversations.participant2Id, user2Id)),
          and(eq(conversations.participant1Id, user2Id), eq(conversations.participant2Id, user1Id))
        )
      );
    return conversation || undefined;
  }

  async getUserConversations(userId: number): Promise<(Conversation & { otherUser: User; lastMessage?: Message })[]> {
    const userConversations = await db
      .select({
        conversation: conversations,
        otherUser: users,
        lastMessage: messages
      })
      .from(conversations)
      .leftJoin(users, or(
        and(eq(conversations.participant1Id, userId), eq(users.id, conversations.participant2Id)),
        and(eq(conversations.participant2Id, userId), eq(users.id, conversations.participant1Id))
      ))
      .leftJoin(messages, eq(messages.conversationId, conversations.id))
      .where(
        or(
          eq(conversations.participant1Id, userId),
          eq(conversations.participant2Id, userId)
        )
      )
      .orderBy(desc(conversations.lastMessageAt));

    // Group by conversation and get the latest message
    const conversationMap = new Map();
    for (const row of userConversations) {
      if (!row.conversation || !row.otherUser) continue;
      
      const key = row.conversation.id;
      if (!conversationMap.has(key)) {
        conversationMap.set(key, {
          ...row.conversation,
          otherUser: row.otherUser,
          lastMessage: row.lastMessage || undefined
        });
      } else {
        const existing = conversationMap.get(key);
        if (row.lastMessage && (!existing.lastMessage || (row.lastMessage.timestamp && existing.lastMessage.timestamp && row.lastMessage.timestamp > existing.lastMessage.timestamp))) {
          existing.lastMessage = row.lastMessage;
        }
      }
    }

    return Array.from(conversationMap.values());
  }

  async createConversation(user1Id: number, user2Id: number): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values({
        participant1Id: user1Id,
        participant2Id: user2Id
      })
      .returning();
    return conversation;
  }

  // Messages
  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || undefined;
  }

  async getConversationMessages(conversationId: number): Promise<(Message & { sender: User })[]> {
    const messagesWithSenders = await db
      .select({
        message: messages,
        sender: users
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.timestamp);

    return messagesWithSenders.map(row => ({
      ...row.message,
      sender: row.sender!
    }));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    
    // Update conversation's last message time
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, insertMessage.conversationId));

    return message;
  }

  async deleteMessage(messageId: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(messages)
      .where(and(eq(messages.id, messageId), eq(messages.senderId, userId)))
      .returning();
    
    return result.length > 0;
  }

  async searchMessages(query: string, userId: number): Promise<Message[]> {
    const userConversationIds = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        or(
          eq(conversations.participant1Id, userId),
          eq(conversations.participant2Id, userId)
        )
      );

    const conversationIds = userConversationIds.map(c => c.id);
    
    const searchResults = await db
      .select()
      .from(messages)
      .where(
        and(
          inArray(messages.conversationId, conversationIds),
          sql`${messages.content} ILIKE ${'%' + query + '%'}`
        )
      )
      .orderBy(desc(messages.timestamp));

    return searchResults;
  }

  async searchMessagesInConversation(query: string, conversationId: number): Promise<Message[]> {
    const searchResults = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          sql`${messages.content} ILIKE ${'%' + query + '%'}`
        )
      )
      .orderBy(desc(messages.timestamp));

    return searchResults;
  }

  async getStarredMessages(userId: number): Promise<(Message & { sender: User; conversationId: number })[]> {
    // Get user's conversation IDs
    const userConversationIds = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        or(
          eq(conversations.participant1Id, userId),
          eq(conversations.participant2Id, userId)
        )
      );

    const conversationIds = userConversationIds.map(c => c.id);
    
    if (conversationIds.length === 0) {
      return [];
    }

    // Get starred messages from user's conversations
    const starredMessages = await db
      .select({
        message: messages,
        sender: users
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(
        and(
          inArray(messages.conversationId, conversationIds),
          eq(messages.isStarred, true)
        )
      )
      .orderBy(desc(messages.timestamp));

    return starredMessages.map(row => ({
      ...row.message,
      sender: row.sender!,
      conversationId: row.message.conversationId
    }));
  }

  async toggleMessageStar(messageId: number, userId: number, isStarred: boolean): Promise<boolean> {
    // Verify the user has access to this message
    const messageWithConversation = await db
      .select({
        messageId: messages.id,
        conversationId: messages.conversationId,
        participant1Id: conversations.participant1Id,
        participant2Id: conversations.participant2Id
      })
      .from(messages)
      .leftJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(eq(messages.id, messageId))
      .limit(1);

    if (messageWithConversation.length === 0) {
      return false;
    }

    const { participant1Id, participant2Id } = messageWithConversation[0];
    
    // Check if user is part of this conversation
    if (participant1Id !== userId && participant2Id !== userId) {
      return false;
    }

    // Update the star status
    const result = await db
      .update(messages)
      .set({ isStarred })
      .where(eq(messages.id, messageId))
      .returning();

    return result.length > 0;
  }

  // Wallet
  async getUserWalletBalances(userId: number): Promise<WalletBalance[]> {
    const balances = await db
      .select()
      .from(walletBalances)
      .where(eq(walletBalances.userId, userId));
    return balances;
  }

  async getUserCurrencyBalance(userId: number, currency: string): Promise<WalletBalance | undefined> {
    const [balance] = await db
      .select()
      .from(walletBalances)
      .where(and(eq(walletBalances.userId, userId), eq(walletBalances.currency, currency)));
    return balance || undefined;
  }

  async createWalletBalance(insertBalance: InsertWalletBalance): Promise<WalletBalance> {
    const [balance] = await db
      .insert(walletBalances)
      .values(insertBalance)
      .returning();
    return balance;
  }

  async updateWalletBalance(userId: number, currency: string, newBalance: string): Promise<void> {
    await db
      .update(walletBalances)
      .set({ balance: newBalance })
      .where(and(eq(walletBalances.userId, userId), eq(walletBalances.currency, currency)));
  }

  async transferCurrency(fromUserId: number, toUserId: number, currency: string, amount: number): Promise<boolean> {
    try {
      // Get sender balance
      const senderBalance = await this.getUserCurrencyBalance(fromUserId, currency);
      if (!senderBalance || parseFloat(senderBalance.balance) < amount) {
        return false;
      }

      // Get or create receiver balance
      let receiverBalance = await this.getUserCurrencyBalance(toUserId, currency);
      if (!receiverBalance) {
        receiverBalance = await this.createWalletBalance({
          userId: toUserId,
          currency,
          balance: "0"
        });
      }

      // Update balances
      const newSenderBalance = (parseFloat(senderBalance.balance) - amount).toString();
      const newReceiverBalance = (parseFloat(receiverBalance.balance) + amount).toString();

      await this.updateWalletBalance(fromUserId, currency, newSenderBalance);
      await this.updateWalletBalance(toUserId, currency, newReceiverBalance);

      return true;
    } catch (error) {
      console.error("Transfer error:", error);
      return false;
    }
  }

  // Favorites
  async getFavorites(userId: number): Promise<Favorite[]> {
    const userFavorites = await db
      .select()
      .from(favorites)
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));
    return userFavorites;
  }

  async addToFavorites(userId: number, productId: string): Promise<Favorite> {
    // For simplified implementation, we'll create a basic favorite
    const [favorite] = await db
      .insert(favorites)
      .values({ 
        userId, 
        productId,
        productTitle: "Product",
        productPrice: "$0.00",
        productImage: "",
        productCategory: "General",
        productRating: 0
      })
      .returning();
    return favorite;
  }

  async removeFromFavorites(userId: number, productId: string): Promise<boolean> {
    const result = await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.productId, productId)))
      .returning();
    return result.length > 0;
  }

  async toggleFavorite(userId: number, productId: string): Promise<boolean> {
    const existing = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.productId, productId)));

    if (existing.length > 0) {
      await this.removeFromFavorites(userId, productId);
      return false;
    } else {
      await this.addToFavorites(userId, productId);
      return true;
    }
  }
}

export const storage = new DatabaseStorage();