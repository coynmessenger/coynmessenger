import type { Express, Request, Response } from "express";
import { speechToText, convertWebmToWav } from "./client";

export function registerAudioRoutes(app: Express): void {
  // Transcribe audio - used for call transcription
  app.post("/api/audio/transcribe", async (req: Request, res: Response) => {
    try {
      const { audio, format = "webm" } = req.body;

      if (!audio) {
        return res.status(400).json({ error: "Audio data (base64) is required" });
      }

      let audioBuffer: Buffer = Buffer.from(audio, "base64");
      
      // Convert WebM to WAV if needed (browser recordings are typically WebM)
      if (format === "webm") {
        audioBuffer = await convertWebmToWav(audioBuffer) as Buffer;
      }

      const transcript = await speechToText(audioBuffer, "wav");
      res.json({ transcript });
    } catch (error) {
      console.error("Error transcribing audio:", error);
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });
}
