import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export interface AIMessageSuggestion {
  message: string;
  tone: 'casual' | 'professional' | 'friendly' | 'formal';
  category: 'response' | 'question' | 'greeting' | 'followup';
}

export class AIService {
  static async generateMessageSuggestions(
    conversationHistory: Array<{ sender: string, content: string, timestamp: Date }>,
    currentUserName: string,
    context?: string
  ): Promise<AIMessageSuggestion[]> {
    try {
      // Build conversation context
      const recentMessages = conversationHistory
        .slice(-5) // Last 5 messages for context
        .map(msg => `${msg.sender}: ${msg.content}`)
        .join('\n');

      const prompt = `You are an AI assistant helping a user write messages in a chat conversation. 
      
Context: This is a crypto messenger app where users discuss cryptocurrency, blockchain, and general topics.
Current user: ${currentUserName}
Recent conversation:
${recentMessages}

${context ? `Additional context: ${context}` : ''}

Generate 3 helpful message suggestions that would be appropriate responses. Each suggestion should:
1. Be natural and conversational
2. Match the tone of the conversation
3. Be relevant to the context
4. Be concise (under 100 characters)

Respond with JSON in this format:
{
  "suggestions": [
    {
      "message": "suggested message text",
      "tone": "casual|professional|friendly|formal",
      "category": "response|question|greeting|followup"
    }
  ]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that generates appropriate message suggestions for chat conversations. Always respond with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
        temperature: 0.7
      });

      const result = JSON.parse(response.choices[0].message.content || '{"suggestions": []}');
      return result.suggestions || [];
    } catch (error) {
      console.error('AI service error:', error);
      return [];
    }
  }

  static async generateSmartReply(
    originalMessage: string,
    conversationContext?: string
  ): Promise<string> {
    try {
      const prompt = `Generate a smart, contextual reply to this message: "${originalMessage}"
      
${conversationContext ? `Conversation context: ${conversationContext}` : ''}

Requirements:
- Keep it concise and natural
- Match the tone of the original message
- Be helpful and relevant
- Under 80 characters

Just return the reply text, no quotes or formatting.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that generates smart, contextual replies to messages. Always respond with just the reply text."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      });

      return response.choices[0].message.content?.trim() || '';
    } catch (error) {
      console.error('AI smart reply error:', error);
      return '';
    }
  }
}