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
      
      // Use sequential generation for reliability with gpt-image-1
      const images = [];
      try {
        const response1 = await openai.images.generate({
          model: "gpt-image-1",
          prompt: varied ? `${prompt} ${styleVariations[0]}` : prompt,
          n: 1,
          size: size as "1024x1024" | "512x512" | "256x256",
        });
        if (response1.data?.[0]) {
          images.push({ url: response1.data[0].url, b64_json: response1.data[0].b64_json });
        }
      } catch (e1: any) {
        console.warn("First image generation failed:", e1.message);
      }

      if (imageCount === 2) {
        try {
          const response2 = await openai.images.generate({
            model: "gpt-image-1",
            prompt: varied ? `${prompt} ${styleVariations[1]}` : prompt,
            n: 1,
            size: size as "1024x1024" | "512x512" | "256x256",
          });
          if (response2.data?.[0]) {
            images.push({ url: response2.data[0].url, b64_json: response2.data[0].b64_json });
          }
        } catch (e2: any) {
          console.warn("Second image generation failed:", e2.message);
        }
      }

      if (images.length === 0) {
        throw new Error("Failed to generate any images. Please try again with a different prompt.");
      }

      return res.json({ images });
    } catch (error: any) {
      console.error("Error generating image:", error);
      const errorMessage = error.response?.data?.error?.message || error.message || "Failed to generate image";
      res.status(500).json({ error: errorMessage });
    }
  });
}
