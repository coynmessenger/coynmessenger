import type { Express, Request, Response } from "express";
import { openai } from "./client";

export function registerImageRoutes(app: Express): void {
  app.post("/api/generate-image", async (req: Request, res: Response) => {
    try {
      const { prompt, size = "1024x1024", count = 4 } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        n: Math.min(count, 4),
        size: size as "1024x1024" | "512x512" | "256x256",
      });

      const images = response.data?.map((img) => ({
        url: img.url,
        b64_json: img.b64_json,
      })) || [];

      res.json({ images });
    } catch (error) {
      console.error("Error generating image:", error);
      res.status(500).json({ error: "Failed to generate image" });
    }
  });
}
