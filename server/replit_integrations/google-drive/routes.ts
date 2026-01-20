import type { Express, Request, Response } from "express";
import {
  uploadEncryptedRecording,
  downloadAndDecryptRecording,
  listCallRecordings,
  deleteCallRecording
} from "./client";

export function registerGoogleDriveRoutes(app: Express): void {
  // Upload encrypted call recording
  app.post("/api/recordings/upload", async (req: Request, res: Response) => {
    try {
      const { audioBase64, callId, callerAddress, receiverAddress, startTime, endTime, duration, type } = req.body;

      if (!audioBase64 || !callId || !callerAddress || !receiverAddress) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const audioData = Buffer.from(audioBase64, "base64");
      
      const result = await uploadEncryptedRecording(audioData, {
        callId,
        callerAddress,
        receiverAddress,
        startTime: startTime || new Date().toISOString(),
        endTime: endTime || new Date().toISOString(),
        duration: duration || 0,
        type: type || "voice"
      });

      res.json({
        success: true,
        fileId: result.fileId,
        callId: result.metadata.callId
      });
    } catch (error) {
      console.error("Error uploading recording:", error);
      res.status(500).json({ error: "Failed to upload recording" });
    }
  });

  // Download and decrypt call recording
  app.get("/api/recordings/:fileId", async (req: Request, res: Response) => {
    try {
      const { fileId } = req.params;
      
      const { data, metadata } = await downloadAndDecryptRecording(fileId);
      
      res.setHeader("Content-Type", "audio/webm");
      res.setHeader("Content-Disposition", `attachment; filename="call_${metadata.callId}.webm"`);
      res.send(data);
    } catch (error) {
      console.error("Error downloading recording:", error);
      res.status(500).json({ error: "Failed to download recording" });
    }
  });

  // List call recordings for a wallet address
  app.get("/api/recordings", async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.query;
      
      const recordings = await listCallRecordings(walletAddress as string | undefined);
      
      res.json({ recordings });
    } catch (error) {
      console.error("Error listing recordings:", error);
      res.status(500).json({ error: "Failed to list recordings" });
    }
  });

  // Delete a call recording
  app.delete("/api/recordings/:fileId", async (req: Request, res: Response) => {
    try {
      const { fileId } = req.params;
      
      await deleteCallRecording(fileId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting recording:", error);
      res.status(500).json({ error: "Failed to delete recording" });
    }
  });
}
