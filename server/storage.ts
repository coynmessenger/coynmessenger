import { 
  users, conversations, messages, walletBalances, escrows, favorites,
  type User, type InsertUser, 
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
  type WalletBalance, type InsertWalletBalance,
  type Escrow, type InsertEscrow,
  type Favorite, type InsertFavorite
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc } from "drizzle-orm";

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
  getConversationByParticipants(user1Id: number, user2Id: number): Promise<Conversation | undefined>;
  getUserConversations(userId: number): Promise<(Conversation & { otherUser: User; lastMessage?: Message })[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;

  // Messages
  getMessage(id: number): Promise<Message | undefined>;
  getConversationMessages(conversationId: number): Promise<(Message & { sender: User })[]>;
  getMessagesByIds(messageIds: number[]): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessage(messageId: number, userId: number): Promise<boolean>;

  // Wallet
  getUserWalletBalances(userId: number): Promise<WalletBalance[]>;
  createWalletBalance(balance: InsertWalletBalance): Promise<WalletBalance>;
  updateWalletBalance(userId: number, currency: string, newBalance: string): Promise<void>;

  // Escrow
  getConversationEscrows(conversationId: number): Promise<Escrow[]>;
  getUserEscrows(userId: number): Promise<Escrow[]>;
  createEscrow(escrow: InsertEscrow): Promise<Escrow>;
  addFundsToEscrow(escrowId: number, userId: number, amount: string): Promise<Escrow | null>;
  releaseEscrow(escrowId: number): Promise<boolean>;
  cancelEscrow(escrowId: number, userId: number): Promise<boolean>;

  // Favorites
  getUserFavorites(userId: number): Promise<Favorite[]>;
  addToFavorites(favorite: InsertFavorite): Promise<Favorite>;
  removeFromFavorites(userId: number, productId: string): Promise<boolean>;
  isFavorite(userId: number, productId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress));
    return user || undefined;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    try {
      console.log("DatabaseStorage: Updating user", id, "with:", updates);
      const [user] = await db.update(users)
        .set(updates)
        .where(eq(users.id, id))
        .returning();
      console.log("DatabaseStorage: Updated user result:", user);
      return user || undefined;
    } catch (error) {
      console.error("DatabaseStorage: Error updating user:", error);
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async getConversationByParticipants(user1Id: number, user2Id: number): Promise<Conversation | undefined> {
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
      .select()
      .from(conversations)
      .where(
        or(
          eq(conversations.participant1Id, userId),
          eq(conversations.participant2Id, userId)
        )
      )
      .orderBy(desc(conversations.lastMessageAt));

    const results = [];
    for (const conv of userConversations) {
      const otherUserId = conv.participant1Id === userId ? conv.participant2Id : conv.participant1Id;
      const [otherUser] = await db.select().from(users).where(eq(users.id, otherUserId));
      
      const [lastMessage] = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conv.id))
        .orderBy(desc(messages.timestamp))
        .limit(1);

      results.push({ ...conv, otherUser, lastMessage });
    }

    return results;
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values(insertConversation)
      .returning();
    return conversation;
  }

  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || undefined;
  }

  async getConversationMessages(conversationId: number): Promise<(Message & { sender: User })[]> {
    const messageResults = await db
      .select({
        message: messages,
        sender: users
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.timestamp);

    return messageResults.map(result => ({
      ...result.message,
      sender: result.sender
    }));
  }

  async getMessagesByIds(messageIds: number[]): Promise<Message[]> {
    if (messageIds.length === 0) return [];
    return await db.select().from(messages).where(
      or(...messageIds.map(id => eq(messages.id, id)))
    );
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();

    // Update conversation lastMessageAt
    await db
      .update(conversations)
      .set({ lastMessageAt: message.timestamp })
      .where(eq(conversations.id, insertMessage.conversationId));

    return message;
  }

  async deleteMessage(messageId: number, userId: number): Promise<boolean> {
    const [message] = await db.select().from(messages).where(eq(messages.id, messageId));
    if (!message || message.senderId !== userId) {
      return false;
    }
    
    await db.delete(messages).where(eq(messages.id, messageId));
    return true;
  }

  async getUserWalletBalances(userId: number): Promise<WalletBalance[]> {
    return await db.select().from(walletBalances).where(eq(walletBalances.userId, userId));
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

  async getConversationEscrows(conversationId: number): Promise<Escrow[]> {
    return await db.select().from(escrows).where(eq(escrows.conversationId, conversationId));
  }

  async getUserEscrows(userId: number): Promise<Escrow[]> {
    return await db.select().from(escrows).where(
      or(eq(escrows.initiatorId, userId), eq(escrows.participantId, userId))
    );
  }

  async createEscrow(insertEscrow: InsertEscrow): Promise<Escrow> {
    const [escrow] = await db
      .insert(escrows)
      .values(insertEscrow)
      .returning();
    return escrow;
  }

  async addFundsToEscrow(escrowId: number, userId: number, amount: string): Promise<Escrow | null> {
    const [escrow] = await db.select().from(escrows).where(eq(escrows.id, escrowId));
    if (!escrow) return null;

    const isInitiator = escrow.initiatorId === userId;
    const isParticipant = escrow.participantId === userId;
    
    if (!isInitiator && !isParticipant) return null;

    // Update the appropriate amount field
    const updateData = isInitiator 
      ? { initiatorAmount: amount }
      : { participantAmount: amount };

    const [updatedEscrow] = await db
      .update(escrows)
      .set(updateData)
      .where(eq(escrows.id, escrowId))
      .returning();

    // Check if both parties have funded the required amount
    const initiatorRequired = parseFloat(escrow.initiatorRequiredAmount);
    const participantRequired = parseFloat(escrow.participantRequiredAmount);
    const initiatorAmount = parseFloat(isInitiator ? amount : escrow.initiatorAmount || "0");
    const participantAmount = parseFloat(isParticipant ? amount : escrow.participantAmount || "0");

    if (initiatorAmount >= initiatorRequired && participantAmount >= participantRequired) {
      // Automatically release funds when both parties have contributed
      await this.releaseEscrow(escrowId);
    }

    return updatedEscrow;
  }

  async releaseEscrow(escrowId: number): Promise<boolean> {
    const [escrow] = await db.select().from(escrows).where(eq(escrows.id, escrowId));
    if (!escrow || escrow.status !== "pending") return false;

    // Update escrow status to released
    await db
      .update(escrows)
      .set({ 
        status: "released",
        releasedAt: new Date()
      })
      .where(eq(escrows.id, escrowId));

    // Release funds to the opposite party (trade completion)
    // Initiator gets participant's currency, participant gets initiator's currency
    if (escrow.initiatorAmount && parseFloat(escrow.initiatorAmount) > 0) {
      await this.updateWalletBalance(escrow.participantId, escrow.initiatorCurrency, escrow.initiatorAmount);
    }
    if (escrow.participantAmount && parseFloat(escrow.participantAmount) > 0) {
      await this.updateWalletBalance(escrow.initiatorId, escrow.participantCurrency, escrow.participantAmount);
    }

    return true;
  }

  async cancelEscrow(escrowId: number, userId: number): Promise<boolean> {
    const [escrow] = await db.select().from(escrows).where(eq(escrows.id, escrowId));
    if (!escrow || escrow.status !== "pending") return false;

    // Only initiator can cancel
    if (escrow.initiatorId !== userId) return false;

    // Return funds to original owners
    if (escrow.initiatorAmount && parseFloat(escrow.initiatorAmount) > 0) {
      await this.updateWalletBalance(escrow.initiatorId, escrow.initiatorCurrency, escrow.initiatorAmount);
    }
    if (escrow.participantAmount && parseFloat(escrow.participantAmount) > 0) {
      await this.updateWalletBalance(escrow.participantId, escrow.participantCurrency, escrow.participantAmount);
    }

    // Update status
    await db
      .update(escrows)
      .set({ status: "cancelled" })
      .where(eq(escrows.id, escrowId));

    return true;
  }

  async getUserFavorites(userId: number): Promise<Favorite[]> {
    const userFavorites = await db.select().from(favorites).where(eq(favorites.userId, userId));
    return userFavorites;
  }

  async addToFavorites(favorite: InsertFavorite): Promise<Favorite> {
    const [newFavorite] = await db
      .insert(favorites)
      .values(favorite)
      .returning();
    return newFavorite;
  }

  async removeFromFavorites(userId: number, productId: string): Promise<boolean> {
    const result = await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.productId, productId)));
    return (result.rowCount || 0) > 0;
  }

  async isFavorite(userId: number, productId: string): Promise<boolean> {
    const [favorite] = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.productId, productId)));
    return !!favorite;
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private conversations: Map<number, Conversation> = new Map();
  private messages: Map<number, Message> = new Map();
  private walletBalances: Map<number, WalletBalance> = new Map();
  
  private currentUserId = 1;
  private currentConversationId = 1;
  private currentMessageId = 1;
  private currentWalletBalanceId = 1;

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Create users
    const chris: User = {
      id: 1,
      username: "chris",
      displayName: "CHRIS",
      walletAddress: "0x84fa...3501",
      profilePicture: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=faces",
      isOnline: true,
      lastSeen: new Date(),
    };

    const jane: User = {
      id: 2,
      username: "jane",
      displayName: "JANE",
      walletAddress: "0x92ba...4602",
      profilePicture: "https://images.unsplash.com/photo-1494790108755-2616b332c2bd?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=faces",
      isOnline: true,
      lastSeen: new Date(),
    };

    const gstax: User = {
      id: 3,
      username: "gstax",
      displayName: "G STAX",
      walletAddress: "0x73cf...5703",
      profilePicture: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=faces",
      isOnline: false,
      lastSeen: new Date(Date.now() - 3600000), // 1 hour ago
    };

    const daniel: User = {
      id: 4,
      username: "daniel",
      displayName: "DANIEL",
      walletAddress: "0x12...0920",
      profilePicture: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=faces",
      isOnline: true,
      lastSeen: new Date(),
    };

    const currentUser: User = {
      id: 5,
      username: "user",
      displayName: "You",
      walletAddress: "0x51E073...ed3E",
      profilePicture: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=faces",
      isOnline: true,
      lastSeen: new Date(),
    };

    [chris, jane, gstax, daniel, currentUser].forEach(user => {
      this.users.set(user.id, user);
    });
    this.currentUserId = 6;

    // Create conversations
    const conversations = [
      { id: 1, participant1Id: 5, participant2Id: 1, lastMessageAt: new Date() },
      { id: 2, participant1Id: 5, participant2Id: 2, lastMessageAt: new Date(Date.now() - 3600000) },
      { id: 3, participant1Id: 5, participant2Id: 3, lastMessageAt: new Date(Date.now() - 7200000) },
      { id: 4, participant1Id: 5, participant2Id: 4, lastMessageAt: new Date(Date.now() - 10800000) },
    ];

    conversations.forEach(conv => {
      this.conversations.set(conv.id, conv);
    });
    this.currentConversationId = 5;

    // Create messages for Chris conversation
    const chrisMessages = [
      { id: 1, conversationId: 1, senderId: 1, content: "Hi, how are you?", messageType: "text", cryptoAmount: null, cryptoCurrency: null, audioFilePath: null, transcription: null, audioDuration: null, timestamp: new Date(Date.now() - 120000) },
      { id: 2, conversationId: 1, senderId: 5, content: "It's going well!! How are you?", messageType: "text", cryptoAmount: null, cryptoCurrency: null, audioFilePath: null, transcription: null, audioDuration: null, timestamp: new Date(Date.now() - 60000) },
      { id: 3, conversationId: 1, senderId: 1, content: "I'm doing great, thanks.", messageType: "text", cryptoAmount: null, cryptoCurrency: null, audioFilePath: null, transcription: null, audioDuration: null, timestamp: new Date(Date.now() - 30000) },
      { id: 4, conversationId: 1, senderId: 1, content: "", messageType: "crypto", cryptoAmount: "0.5", cryptoCurrency: "COYN", audioFilePath: null, transcription: null, audioDuration: null, timestamp: new Date() },
    ];

    chrisMessages.forEach(msg => {
      this.messages.set(msg.id, msg);
    });
    this.currentMessageId = 5;

    // Create wallet balances for current user
    const walletBalances = [
      { id: 1, userId: 5, currency: "BTC", balance: "0.071", usdValue: "7385.25", changePercent: "2.4" },
      { id: 2, userId: 5, currency: "ETH", balance: "1.423", usdValue: "3675.50", changePercent: "1.8" },
      { id: 3, userId: 5, currency: "USDT", balance: "720", usdValue: "720", changePercent: "0.0" },
      { id: 4, userId: 5, currency: "COYN", balance: "8398.823", usdValue: "425.00", changePercent: "5.2" },
    ];

    walletBalances.forEach(balance => {
      this.walletBalances.set(balance.id, balance);
    });
    this.currentWalletBalanceId = 5;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.walletAddress === walletAddress);
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: this.currentUserId++,
      lastSeen: new Date(),
      profilePicture: insertUser.profilePicture ?? null,
      isOnline: insertUser.isOnline ?? null,
    };
    this.users.set(user.id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversationByParticipants(user1Id: number, user2Id: number): Promise<Conversation | undefined> {
    return Array.from(this.conversations.values()).find(conv => 
      (conv.participant1Id === user1Id && conv.participant2Id === user2Id) ||
      (conv.participant1Id === user2Id && conv.participant2Id === user1Id)
    );
  }

  async getUserConversations(userId: number): Promise<(Conversation & { otherUser: User; lastMessage?: Message })[]> {
    const userConversations = Array.from(this.conversations.values())
      .filter(conv => conv.participant1Id === userId || conv.participant2Id === userId)
      .sort((a, b) => (b.lastMessageAt?.getTime() || 0) - (a.lastMessageAt?.getTime() || 0));

    return userConversations.map(conv => {
      const otherUserId = conv.participant1Id === userId ? conv.participant2Id : conv.participant1Id;
      const otherUser = this.users.get(otherUserId)!;
      const lastMessage = Array.from(this.messages.values())
        .filter(msg => msg.conversationId === conv.id)
        .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0))[0];

      return { ...conv, otherUser, lastMessage };
    });
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const conversation: Conversation = {
      ...insertConversation,
      id: this.currentConversationId++,
      lastMessageAt: new Date(),
    };
    this.conversations.set(conversation.id, conversation);
    return conversation;
  }

  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getConversationMessages(conversationId: number): Promise<(Message & { sender: User })[]> {
    return Array.from(this.messages.values())
      .filter(msg => msg.conversationId === conversationId)
      .sort((a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0))
      .map(msg => ({
        ...msg,
        sender: this.users.get(msg.senderId)!,
      }));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const message: Message = {
      ...insertMessage,
      id: this.currentMessageId++,
      timestamp: new Date(),
      content: insertMessage.content ?? null,
      cryptoAmount: insertMessage.cryptoAmount ?? null,
      cryptoCurrency: insertMessage.cryptoCurrency ?? null,
      audioFilePath: insertMessage.audioFilePath ?? null,
      transcription: insertMessage.transcription ?? null,
      audioDuration: insertMessage.audioDuration ?? null,
      messageType: insertMessage.messageType || "text",
    };
    this.messages.set(message.id, message);

    // Update conversation lastMessageAt
    const conversation = this.conversations.get(insertMessage.conversationId);
    if (conversation) {
      conversation.lastMessageAt = message.timestamp;
      this.conversations.set(conversation.id, conversation);
    }

    return message;
  }

  async getUserWalletBalances(userId: number): Promise<WalletBalance[]> {
    return Array.from(this.walletBalances.values())
      .filter(balance => balance.userId === userId);
  }

  async createWalletBalance(insertBalance: InsertWalletBalance): Promise<WalletBalance> {
    const balance: WalletBalance = {
      ...insertBalance,
      id: this.currentWalletBalanceId++,
      usdValue: insertBalance.usdValue ?? null,
      changePercent: insertBalance.changePercent ?? null,
    };
    this.walletBalances.set(balance.id, balance);
    return balance;
  }

  async updateWalletBalance(userId: number, currency: string, newBalance: string): Promise<void> {
    const balance = Array.from(this.walletBalances.values())
      .find(b => b.userId === userId && b.currency === currency);
    
    if (balance) {
      balance.balance = newBalance;
      this.walletBalances.set(balance.id, balance);
    }
  }

  async deleteMessage(messageId: number, userId: number): Promise<boolean> {
    const message = this.messages.get(messageId);
    if (!message || message.senderId !== userId) {
      return false; // Can only delete own messages
    }
    
    this.messages.delete(messageId);
    return true;
  }

  async getConversationEscrows(conversationId: number): Promise<Escrow[]> {
    // MemStorage doesn't implement escrow functionality
    return [];
  }

  async createEscrow(insertEscrow: InsertEscrow): Promise<Escrow> {
    throw new Error("Escrow functionality requires database storage");
  }

  async addFundsToEscrow(escrowId: number, userId: number, amount: string): Promise<Escrow | null> {
    return null;
  }

  async releaseEscrow(escrowId: number): Promise<boolean> {
    return false;
  }

  async cancelEscrow(escrowId: number, userId: number): Promise<boolean> {
    return false;
  }
}

export const storage = new DatabaseStorage();
