import type { Express, Request, Response } from "express";
import { openai } from "./client";

const styleVariations = [
  "in a realistic photographic style with natural lighting",
  "in an artistic illustrated style with bold colors and creative interpretation"
];

export function registerImageRoutes(app: Express): void {
  app.post("/api/generate-image", async (req: Request, res: Response) => {
    try {
      const { prompt, size = "512x512", count = 2, varied = true } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const imageCount = Math.min(count, 2);
      
      if (varied && imageCount === 2) {
        const [response1, response2] = await Promise.all([
          openai.images.generate({
            model: "gpt-image-1",
            prompt: `${prompt} ${styleVariations[0]}`,
            n: 1,
            size: size as "1024x1024" | "512x512" | "256x256",
          }),
          openai.images.generate({
            model: "gpt-image-1",
            prompt: `${prompt} ${styleVariations[1]}`,
            n: 1,
            size: size as "1024x1024" | "512x512" | "256x256",
          })
        ]);

        const images = [
          { url: response1.data?.[0]?.url, b64_json: response1.data?.[0]?.b64_json },
          { url: response2.data?.[0]?.url, b64_json: response2.data?.[0]?.b64_json }
        ];

        return res.json({ images });
      }

      // Replit's gpt-image-1 usually works best with n: 1
      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        n: 1, // Stick to 1 for better reliability
        size: size as "1024x1024" | "512x512" | "256x256",
      });

      const images = response.data?.map((img) => ({
        url: img.url,
        b64_json: img.b64_json,
      })) || [];

      res.json({ images });
    } catch (error: any) {
      console.error("Error generating image:", error);
      const errorMessage = error.response?.data?.error?.message || error.message || "Failed to generate image";
      res.status(500).json({ error: errorMessage });
    }
  });
}
