import OpenAI from "openai";
import fs from "fs";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeAudio(audioFilePath: string): Promise<{ text: string, duration: number }> {
  try {
    const audioReadStream = fs.createReadStream(audioFilePath);

    const transcription = await openai.audio.transcriptions.create({
      file: audioReadStream,
      model: "whisper-1",
    });

    // Get file stats for duration estimation (rough approximation)
    const stats = fs.statSync(audioFilePath);
    const fileSizeInBytes = stats.size;
    // Rough estimation: 1 second of audio ≈ 16KB (varies by quality)
    const estimatedDuration = Math.round(fileSizeInBytes / 16000);

    return {
      text: transcription.text,
      duration: estimatedDuration,
    };
  } catch (error) {
    throw new Error("Failed to transcribe audio: " + (error instanceof Error ? error.message : String(error)));
  }
}