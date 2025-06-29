// Helper function to get effective display name with correct priority
export function getEffectiveDisplayName(user: any): string {
  // Priority: 1. Sign-in name, 2. Profile display name, 3. @id format
  if (user.signInName) {
    return user.signInName;
  }
  if (user.displayName && !user.displayName.startsWith('@')) {
    return user.displayName;
  }
  // Fallback to @id format using last 6 characters of wallet address
  return `@${user.walletAddress.slice(-6)}`;
}

// Helper function to format timestamp for messages
export function formatMessageTimestamp(timestamp: Date | string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // Less than 1 minute
  if (diff < 60000) {
    return 'Just now';
  }
  
  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }
  
  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }
  
  // More than 24 hours
  const days = Math.floor(diff / 86400000);
  if (days === 1) {
    return 'Yesterday';
  }
  if (days < 7) {
    return `${days} days ago`;
  }
  
  // More than a week, show actual date
  return date.toLocaleDateString();
}

// Helper function to validate message content
export function validateMessageContent(content: string, messageType: string): boolean {
  if (!content && messageType === 'text') {
    return false;
  }
  
  if (messageType === 'text' && content.length > 4000) {
    return false;
  }
  
  return true;
}

// Helper function to sanitize message content
export function sanitizeMessageContent(content: string): string {
  if (!content) return '';
  
  // Basic HTML sanitization - remove script tags and dangerous content
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

// Helper function to extract mentions from message content
export function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
}

// Helper function to check if user can access conversation
export function canAccessConversation(userId: number, conversation: any): boolean {
  if (!conversation) return false;
  
  // For direct messages
  if (!conversation.isGroup) {
    return conversation.participant1Id === userId || conversation.participant2Id === userId;
  }
  
  // For group messages - would need to check group membership
  // This would require a separate query in the actual implementation
  return true;
}

// Helper function to get file type from filename
export function getFileType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() || '';
  
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  const videoTypes = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'];
  const audioTypes = ['mp3', 'wav', 'ogg', 'aac', 'm4a'];
  const documentTypes = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
  
  if (imageTypes.includes(ext)) return 'image';
  if (videoTypes.includes(ext)) return 'video';
  if (audioTypes.includes(ext)) return 'audio';
  if (documentTypes.includes(ext)) return 'document';
  
  return 'file';
}

// Helper function to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to generate conversation preview text
export function generateConversationPreview(lastMessage: any): string {
  if (!lastMessage) return 'No messages yet';
  
  switch (lastMessage.messageType) {
    case 'crypto':
      return `💰 Sent ${lastMessage.cryptoAmount} ${lastMessage.cryptoCurrency}`;
    case 'product_share':
      return `🛍️ Shared: ${lastMessage.productTitle}`;
    case 'attachment':
      const fileType = getFileType(lastMessage.attachmentName || '');
      return `📎 ${fileType === 'image' ? 'Photo' : fileType === 'video' ? 'Video' : 'File'}`;
    case 'voice':
      return '🎤 Voice message';
    case 'system':
      return lastMessage.content;
    default:
      return lastMessage.content || 'Message';
  }
}