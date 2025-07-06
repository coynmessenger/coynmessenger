import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export interface AIImageGeneration {
  id: string;
  prompt: string;
  imageUrl: string;
  style: 'realistic' | 'artistic' | 'cartoon' | 'abstract';
  size: '1024x1024' | '1792x1024' | '1024x1792';
}

export class AIService {
  static async generateImageSuggestions(
    conversationHistory: Array<{ sender: string, content: string, timestamp: Date }>,
    currentUserName: string,
    context?: string
  ): Promise<string[]> {
    try {
      // Build conversation context
      const recentMessages = conversationHistory
        .slice(-5) // Last 5 messages for context
        .map(msg => `${msg.sender}: ${msg.content}`)
        .join('\n');

      const prompt = `You are an AI assistant helping a user generate image prompts for a crypto messenger app. 
      
Context: This is a crypto messenger app where users discuss cryptocurrency, blockchain, and general topics.
Current user: ${currentUserName}
Recent conversation:
${recentMessages}

${context ? `Additional context: ${context}` : ''}

Generate 4 creative image prompt suggestions that would be relevant to share in this conversation. Each prompt should:
1. Be relevant to the conversation context
2. Be suitable for DALL-E 3 image generation
3. Be descriptive and creative
4. Be appropriate for a crypto/blockchain themed chat

Respond with JSON in this format:
{
  "prompts": [
    "detailed image prompt description",
    "another creative prompt",
    "third relevant prompt",
    "fourth engaging prompt"
  ]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that generates creative image prompts for DALL-E 3. Always respond with valid JSON containing 4 detailed prompts."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
        temperature: 0.8
      });

      const result = JSON.parse(response.choices[0].message.content || '{"prompts": []}');
      return result.prompts || [];
    } catch (error) {
      console.error('AI image prompt generation error:', error);
      return [];
    }
  }

  static async generateImage(
    prompt: string,
    style: 'realistic' | 'artistic' | 'cartoon' | 'abstract' = 'realistic',
    size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024'
  ): Promise<AIImageGeneration | null> {
    try {
      // Enhance prompt based on style
      let enhancedPrompt = prompt;
      
      switch (style) {
        case 'artistic':
          enhancedPrompt = `Artistic painting style, ${prompt}, digital art, detailed, vibrant colors`;
          break;
        case 'cartoon':
          enhancedPrompt = `Cartoon style, ${prompt}, colorful, fun, animated style`;
          break;
        case 'abstract':
          enhancedPrompt = `Abstract art style, ${prompt}, geometric, conceptual, modern art`;
          break;
        case 'realistic':
          enhancedPrompt = `Photorealistic, ${prompt}, high quality, detailed, professional photography`;
          break;
      }

      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: enhancedPrompt,
        n: 1,
        size: size,
        quality: "standard",
      });

      if (response.data && response.data[0] && response.data[0].url) {
        return {
          id: Date.now().toString(),
          prompt: prompt,
          imageUrl: response.data[0].url,
          style: style,
          size: size
        };
      }

      return null;
    } catch (error) {
      console.error('AI image generation error:', error);
      return null;
    }
  }
}