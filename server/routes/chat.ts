import { Router, Request, Response } from "express";
import multer from "multer";
import { openai, CHARACTER_CONFIGS, AvatarId } from "../lib/openai.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/chat", upload.single("audioFile"), async (req: Request, res: Response) => {
  const avatarId = req.body.avatarId as string;
  const audioBuffer = req.file?.buffer;

  if (!audioBuffer) {
    res.status(400).json({ error: "Missing audio file" });
    return;
  }

  const validIds: AvatarId[] = ["wednesday", "billie", "gojo"];
  if (!validIds.includes(avatarId as AvatarId)) {
    res.status(400).json({ error: "Invalid avatarId" });
    return;
  }

  const config = CHARACTER_CONFIGS[avatarId as AvatarId];

  try {
    // Step 1: STT with Whisper
    const audioFile = new File([audioBuffer], "audio.webm", { type: "audio/webm" });
    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: audioFile,
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });

    const transcript = transcription.text;
    const wordTimestamps = (transcription as any).words ?? [];

    // Step 2: LLM with GPT-4o-mini
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: config.systemPrompt },
        { role: "user", content: transcript },
      ],
    });

    const responseText = completion.choices[0].message.content ?? "";

    // Step 3: TTS
    const speechResponse = await openai.audio.speech.create({
      model: "tts-1",
      voice: config.voice,
      input: responseText,
    });

    const audioArrayBuffer = await speechResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioArrayBuffer).toString("base64");

    res.json({ transcript, responseText, audioBase64, wordTimestamps });
  } catch (err: any) {
    console.error("Error in /api/chat:", err?.message ?? err);
    res.status(500).json({ error: "Server error", detail: err?.message });
  }
});

export default router;
