import { 
  users, conversations, messages, walletBalances, favorites, groupMembers, nftRewards, purchases,
  type User, type InsertUser, 
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
  type WalletBalance, type InsertWalletBalance,
  type Favorite, type InsertFavorite,
  type NFTReward, type InsertNFTReward,
  type Purchase, type InsertPurchase
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
  getConversationBetweenUsers(user1Id: number, user2Id: number): Promise<Conversation | null>;
  deleteConversation(conversationId: number, userId: number): Promise<boolean>;
  deleteMessagesByConversation(conversationId: number): Promise<boolean>;
  
  // Groups
  createGroupConversation(groupName: string, memberIds: number[], createdBy: number): Promise<Conversation>;
  leaveGroup(conversationId: number, userId: number): Promise<boolean>;
  getGroupMembers(conversationId: number): Promise<User[]>;

  // Messages
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesByIds(ids: number[]): Promise<Message[]>;
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
  updateWalletBalance(userId: number, currency: string, updateData: { balance?: string; usdValue?: string; changePercent?: string }): Promise<void>;
  transferCurrency(fromUserId: number, toUserId: number, currency: string, amount: number): Promise<boolean>;

  // Favorites
  getFavorites(userId: number): Promise<Favorite[]>;
  addToFavorites(userId: number, productId: string): Promise<Favorite>;
  removeFromFavorites(userId: number, productId: string): Promise<boolean>;
  toggleFavorite(userId: number, productId: string): Promise<boolean>;

  // NFT Rewards
  getNFTRewards(userId: number): Promise<NFTReward[]>;
  createNFTReward(reward: InsertNFTReward): Promise<NFTReward>;
  redeemNFTReward(rewardId: number, userId: number): Promise<boolean>;
  checkRewardEligibility(purchaseValue: number): string; // returns tier

  // Purchases
  getPurchases(userId: number): Promise<Purchase[]>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  updatePurchaseStatus(purchaseId: number, status: string): Promise<boolean>;
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
    // Use case-insensitive lookup for wallet addresses since they can have mixed case
    const [user] = await db.select().from(users).where(sql`LOWER(${users.walletAddress}) = LOWER(${walletAddress})`);
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
    console.log('getAllUsers: Fetching all users from database...');
    const allUsers = await db.select().from(users).where(eq(users.isSetup, true));
    console.log(`getAllUsers: Found ${allUsers.length} setup users in database`);
    console.log('getAllUsers: User IDs:', allUsers.map(u => u.id));
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
    // First get direct conversations (non-group)
    const directConversations = await db
      .select({
        conversation: conversations,
        otherUser: users,
        lastMessage: messages
      })
      .from(conversations)
      .leftJoin(users, or(
        // Handle self-conversations where participant1Id === participant2Id
        and(eq(conversations.participant1Id, conversations.participant2Id), eq(users.id, userId)),
        // Regular conversations
        and(eq(conversations.participant1Id, userId), eq(users.id, conversations.participant2Id)),
        and(eq(conversations.participant2Id, userId), eq(users.id, conversations.participant1Id))
      ))
      .leftJoin(messages, eq(messages.conversationId, conversations.id))
      .where(
        and(
          or(
            eq(conversations.participant1Id, userId),
            eq(conversations.participant2Id, userId)
          ),
          eq(conversations.isGroup, false)
        )
      )
      .orderBy(desc(conversations.lastMessageAt));

    // Then get group conversations where user is a member
    const groupConversationIds = await db
      .select({ conversationId: groupMembers.conversationId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, userId));

    const groupConversations = await db
      .select({
        conversation: conversations,
        lastMessage: messages
      })
      .from(conversations)
      .leftJoin(messages, eq(messages.conversationId, conversations.id))
      .where(
        and(
          inArray(conversations.id, groupConversationIds.map(g => g.conversationId)),
          eq(conversations.isGroup, true)
        )
      )
      .orderBy(desc(conversations.lastMessageAt));

    // Combine results - for groups, we don't have otherUser, so we'll use a placeholder
    const allConversations = [
      ...directConversations,
      ...groupConversations.map(gc => ({
        ...gc,
        otherUser: null as any // Groups don't have "other user", we'll handle display differently
      }))
    ];

    // Group by conversation and get the latest message
    const conversationMap = new Map();
    for (const row of allConversations) {
      if (!row.conversation) continue;
      
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

  async getConversationBetweenUsers(user1Id: number, user2Id: number): Promise<Conversation | null> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        or(
          and(eq(conversations.participant1Id, user1Id), eq(conversations.participant2Id, user2Id)),
          and(eq(conversations.participant1Id, user2Id), eq(conversations.participant2Id, user1Id))
        )
      )
      .limit(1);
    return conversation || null;
  }

  async deleteConversation(conversationId: number, userId: number): Promise<boolean> {
    try {
      // Verify the user is part of this conversation
      const conversation = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversationId),
            or(
              eq(conversations.participant1Id, userId),
              eq(conversations.participant2Id, userId)
            )
          )
        )
        .limit(1);

      if (conversation.length === 0) {
        return false; // User is not part of this conversation
      }

      // Delete the conversation
      await db
        .delete(conversations)
        .where(eq(conversations.id, conversationId));
      
      return true;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return false;
    }
  }

  async deleteMessagesByConversation(conversationId: number): Promise<boolean> {
    try {
      await db
        .delete(messages)
        .where(eq(messages.conversationId, conversationId));
      
      return true;
    } catch (error) {
      console.error('Error deleting messages by conversation:', error);
      return false;
    }
  }

  async createGroupConversation(groupName: string, memberIds: number[], createdBy: number): Promise<Conversation> {
    // Create the group conversation
    const [conversation] = await db
      .insert(conversations)
      .values({
        isGroup: true,
        groupName,
        createdBy,
        lastMessageAt: new Date(),
      })
      .returning();

    // Add all members to the group
    const memberData = memberIds.map((userId: number) => ({
      conversationId: conversation.id,
      userId,
      role: userId === createdBy ? "admin" : "member"
    }));

    // Ensure creator is also added as a member if not already in the list
    if (!memberIds.includes(createdBy)) {
      memberData.push({
        conversationId: conversation.id,
        userId: createdBy,
        role: "admin"
      });
    }

    await db.insert(groupMembers).values(memberData);

    return conversation;
  }

  async leaveGroup(conversationId: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(groupMembers)
      .where(
        and(
          eq(groupMembers.conversationId, conversationId),
          eq(groupMembers.userId, userId)
        )
      )
      .returning();

    // If the user was an admin, we should handle admin transition logic here
    // For now, we'll just remove them
    return result.length > 0;
  }

  async getGroupMembers(conversationId: number): Promise<User[]> {
    const members = await db
      .select({
        user: users
      })
      .from(groupMembers)
      .innerJoin(users, eq(users.id, groupMembers.userId))
      .where(eq(groupMembers.conversationId, conversationId));

    return members.map(m => m.user);
  }

  // Messages
  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || undefined;
  }

  async getMessagesByIds(ids: number[]): Promise<Message[]> {
    if (ids.length === 0) return [];
    return await db.select().from(messages).where(inArray(messages.id, ids));
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

  async updateWalletBalance(userId: number, currency: string, updateData: { balance?: string; usdValue?: string; changePercent?: string }): Promise<void> {
    await db
      .update(walletBalances)
      .set(updateData)
      .where(and(eq(walletBalances.userId, userId), eq(walletBalances.currency, currency)));
  }

  async initializeWalletBalances(userId: number): Promise<void> {
    // Check if user already has wallet balances
    const existingBalances = await this.getUserWalletBalances(userId);
    if (existingBalances.length > 0) {
      return; // Already initialized
    }

    // Initialize with default cryptocurrency balances
    const defaultBalances = [
      { userId, currency: "BTC", balance: "0.00000000", usdValue: "0.00", changePercent: "0.00" },
      { userId, currency: "BNB", balance: "0.00000000", usdValue: "0.00", changePercent: "0.00" },
      { userId, currency: "USDT", balance: "0.00000000", usdValue: "0.00", changePercent: "0.00" },
      { userId, currency: "COYN", balance: "0.00000000", usdValue: "0.00", changePercent: "0.00" },
    ];

    for (const balance of defaultBalances) {
      await this.createWalletBalance(balance);
    }
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

      await this.updateWalletBalance(fromUserId, currency, { balance: newSenderBalance });
      await this.updateWalletBalance(toUserId, currency, { balance: newReceiverBalance });

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

  // NFT Rewards
  async getNFTRewards(userId: number): Promise<NFTReward[]> {
    const userRewards = await db
      .select()
      .from(nftRewards)
      .where(eq(nftRewards.userId, userId))
      .orderBy(desc(nftRewards.earnedAt));
    return userRewards;
  }

  async createNFTReward(reward: InsertNFTReward): Promise<NFTReward> {
    const [nftReward] = await db
      .insert(nftRewards)
      .values(reward)
      .returning();
    return nftReward;
  }

  async redeemNFTReward(rewardId: number, userId: number): Promise<boolean> {
    const result = await db
      .update(nftRewards)
      .set({ 
        isRedeemed: true, 
        redeemedAt: new Date(),
        nftTokenId: `NFT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      })
      .where(and(
        eq(nftRewards.id, rewardId), 
        eq(nftRewards.userId, userId),
        eq(nftRewards.isRedeemed, false)
      ))
      .returning();
    return result.length > 0;
  }

  checkRewardEligibility(purchaseValue: number): string {
    if (purchaseValue >= 500) return 'diamond';
    if (purchaseValue >= 200) return 'gold';
    if (purchaseValue >= 100) return 'silver';
    if (purchaseValue >= 50) return 'bronze';
    return '';
  }

  // Purchases
  async getPurchases(userId: number): Promise<Purchase[]> {
    const userPurchases = await db
      .select()
      .from(purchases)
      .where(eq(purchases.userId, userId))
      .orderBy(desc(purchases.createdAt));
    return userPurchases;
  }

  async createPurchase(purchase: InsertPurchase): Promise<Purchase> {
    const [newPurchase] = await db
      .insert(purchases)
      .values(purchase)
      .returning();
    return newPurchase;
  }

  async updatePurchaseStatus(purchaseId: number, status: string): Promise<boolean> {
    const result = await db
      .update(purchases)
      .set({ status })
      .where(eq(purchases.id, purchaseId))
      .returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();