import { 
  users, conversations, messages, walletBalances,
  type User, type InsertUser, 
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
  type WalletBalance, type InsertWalletBalance
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Conversations
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationByParticipants(user1Id: number, user2Id: number): Promise<Conversation | undefined>;
  getUserConversations(userId: number): Promise<(Conversation & { otherUser: User; lastMessage?: Message })[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;

  // Messages
  getMessage(id: number): Promise<Message | undefined>;
  getConversationMessages(conversationId: number): Promise<(Message & { sender: User })[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessage(messageId: number, userId: number): Promise<boolean>;

  // Wallet
  getUserWalletBalances(userId: number): Promise<WalletBalance[]>;
  createWalletBalance(balance: InsertWalletBalance): Promise<WalletBalance>;
  updateWalletBalance(userId: number, currency: string, newBalance: string): Promise<void>;
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
      { id: 1, conversationId: 1, senderId: 1, content: "Hi, how are you?", messageType: "text", cryptoAmount: null, cryptoCurrency: null, timestamp: new Date(Date.now() - 120000) },
      { id: 2, conversationId: 1, senderId: 5, content: "It's going well!! How are you?", messageType: "text", cryptoAmount: null, cryptoCurrency: null, timestamp: new Date(Date.now() - 60000) },
      { id: 3, conversationId: 1, senderId: 1, content: "I'm doing great, thanks.", messageType: "text", cryptoAmount: null, cryptoCurrency: null, timestamp: new Date(Date.now() - 30000) },
      { id: 4, conversationId: 1, senderId: 1, content: "", messageType: "crypto", cryptoAmount: "0.5", cryptoCurrency: "COYN", timestamp: new Date() },
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: this.currentUserId++,
      lastSeen: new Date(),
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
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());

    return userConversations.map(conv => {
      const otherUserId = conv.participant1Id === userId ? conv.participant2Id : conv.participant1Id;
      const otherUser = this.users.get(otherUserId)!;
      const lastMessage = Array.from(this.messages.values())
        .filter(msg => msg.conversationId === conv.id)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

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
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
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
}

export const storage = new MemStorage();
