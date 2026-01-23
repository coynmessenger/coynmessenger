import type { Express, Request, Response } from "express";
import { openai } from "./client";

const styleVariations = [
  "in a realistic photographic style with natural lighting",
  "in an artistic illustrated style with bold colors",
  "in a vibrant pop art style with bright neon colors",
  "in a dreamy fantasy style with magical elements"
];

export function registerImageRoutes(app: Express): void {
  app.post("/api/generate-image", async (req: Request, res: Response) => {
    try {
      const { prompt, size = "256x256", count = 4, varied = true } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const imageCount = Math.min(count, 4);
      
      if (varied && imageCount >= 2) {
        const requests = styleVariations.slice(0, imageCount).map(style => 
          openai.images.generate({
            model: "gpt-image-1",
            prompt: `${prompt} ${style}`,
            n: 1,
            size: size as "1024x1024" | "512x512" | "256x256",
          })
        );

        const responses = await Promise.all(requests);
        const images = responses.map(response => ({
          url: response.data?.[0]?.url,
          b64_json: response.data?.[0]?.b64_json
        }));

        return res.json({ images });
      }

      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        n: imageCount,
        size: size as "1024x1024" | "512x512" | "256x256",
      });

      const images = response.data?.map((img: { url?: string; b64_json?: string }) => ({
        url: img.url,
        b64_json: img.b64_json,
      })) || [];

      res.json({ images });
    } catch (error: any) {
      console.error("Error generating image:", error?.message || error);
      console.error("Full error details:", JSON.stringify(error, null, 2));
      res.status(500).json({ error: "Failed to generate image", details: error?.message });
    }
  });
}
