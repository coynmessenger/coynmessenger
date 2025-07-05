import crypto from 'crypto';

export interface EncryptionKeys {
  publicKey: string;
  privateKey: string;
}

export interface EncryptedData {
  data: string;
  iv: string;
  tag: string;
}

// Simple AES-GCM encryption service for WebRTC signaling
export class SimpleEncryptionService {
  private keyPair: EncryptionKeys;
  private sharedSecrets = new Map<string, Buffer>(); // userId -> shared secret
  private static instances = new Map<string, SimpleEncryptionService>();

  constructor(private userId: string) {
    // Generate or reuse key pair for this user
    if (!SimpleEncryptionService.instances.has(userId)) {
      this.keyPair = this.generateKeyPair();
      SimpleEncryptionService.instances.set(userId, this);
    } else {
      const existing = SimpleEncryptionService.instances.get(userId)!;
      this.keyPair = existing.keyPair;
    }
  }

  private generateKeyPair(): EncryptionKeys {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    return { publicKey, privateKey };
  }

  getPublicKey(): string {
    return this.keyPair.publicKey;
  }

  // Establish shared secret with another user using ECDH-like approach
  async establishSharedSecret(recipientId: string, recipientPublicKey: string): Promise<void> {
    // Simple shared secret generation using hash of both public keys
    const combinedKeys = [this.keyPair.publicKey, recipientPublicKey].sort().join('');
    const sharedSecret = crypto.createHash('sha256').update(combinedKeys).digest();
    this.sharedSecrets.set(recipientId, sharedSecret);
  }

  // Encrypt data using AES-GCM with shared secret
  async encryptData(recipientId: string, data: any): Promise<EncryptedData> {
    const sharedSecret = this.sharedSecrets.get(recipientId);
    if (!sharedSecret) {
      throw new Error(`No shared secret established with ${recipientId}`);
    }

    const plaintext = JSON.stringify(data);
    const iv = crypto.randomBytes(12); // 12 bytes for GCM
    const cipher = crypto.createCipher('aes-256-gcm', sharedSecret);
    cipher.setAAD(Buffer.from(recipientId)); // Additional authenticated data

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    return {
      data: encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  // Decrypt data using AES-GCM with shared secret
  async decryptData(senderId: string, encryptedData: EncryptedData): Promise<any> {
    const sharedSecret = this.sharedSecrets.get(senderId);
    if (!sharedSecret) {
      throw new Error(`No shared secret established with ${senderId}`);
    }

    const decipher = crypto.createDecipher('aes-256-gcm', sharedSecret);
    decipher.setAAD(Buffer.from(senderId));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));

    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  // Encrypt WebRTC signaling data
  async encryptSignalingData(recipientId: string, data: any): Promise<string> {
    const encrypted = await this.encryptData(recipientId, data);
    return Buffer.from(JSON.stringify(encrypted)).toString('base64');
  }

  async decryptSignalingData(senderId: string, encryptedString: string): Promise<any> {
    const encryptedData = JSON.parse(Buffer.from(encryptedString, 'base64').toString());
    return await this.decryptData(senderId, encryptedData);
  }

  // Generate session key for WebRTC media encryption
  generateSessionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Encrypt session key for sharing
  async encryptSessionKey(recipientId: string, sessionKey: string): Promise<string> {
    return await this.encryptSignalingData(recipientId, { sessionKey });
  }

  async decryptSessionKey(senderId: string, encryptedSessionKey: string): Promise<string> {
    const decrypted = await this.decryptSignalingData(senderId, encryptedSessionKey);
    return decrypted.sessionKey;
  }
}

// Advanced Signal Protocol implementation (simplified for demo)
export class SignalEncryptionService {
  private encryptionService: SimpleEncryptionService;
  private static services = new Map<string, SignalEncryptionService>();

  constructor(private userId: string) {
    this.encryptionService = new SimpleEncryptionService(userId);
    
    if (!SignalEncryptionService.services.has(userId)) {
      SignalEncryptionService.services.set(userId, this);
    }
  }

  static getInstance(userId: string): SignalEncryptionService {
    if (!SignalEncryptionService.services.has(userId)) {
      SignalEncryptionService.services.set(userId, new SignalEncryptionService(userId));
    }
    return SignalEncryptionService.services.get(userId)!;
  }

  async initializeIdentity(): Promise<{ publicKey: string; userId: string }> {
    return {
      publicKey: this.encryptionService.getPublicKey(),
      userId: this.userId
    };
  }

  async getPublicKey(): Promise<string> {
    return this.encryptionService.getPublicKey();
  }

  async establishSession(recipientId: string, recipientPublicKey: string): Promise<void> {
    await this.encryptionService.establishSharedSecret(recipientId, recipientPublicKey);
  }

  async encryptMessage(recipientId: string, message: string): Promise<string> {
    return await this.encryptionService.encryptSignalingData(recipientId, { message });
  }

  async decryptMessage(senderId: string, encryptedMessage: string): Promise<string> {
    const decrypted = await this.encryptionService.decryptSignalingData(senderId, encryptedMessage);
    return decrypted.message;
  }

  // WebRTC-specific encryption methods
  async encryptSignalingData(recipientId: string, data: any): Promise<string> {
    return await this.encryptionService.encryptSignalingData(recipientId, data);
  }

  async decryptSignalingData(senderId: string, encryptedData: string): Promise<any> {
    return await this.encryptionService.decryptSignalingData(senderId, encryptedData);
  }

  async generateAndEncryptSessionKey(recipientId: string): Promise<{ sessionKey: string; encryptedKey: string }> {
    const sessionKey = this.encryptionService.generateSessionKey();
    const encryptedKey = await this.encryptionService.encryptSessionKey(recipientId, sessionKey);
    return { sessionKey, encryptedKey };
  }

  async decryptSessionKey(senderId: string, encryptedSessionKey: string): Promise<string> {
    return await this.encryptionService.decryptSessionKey(senderId, encryptedSessionKey);
  }
}