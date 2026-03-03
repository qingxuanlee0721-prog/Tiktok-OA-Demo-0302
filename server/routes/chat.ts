import { Router, Request, Response } from "express";
import multer from "multer";
import { openai, CHARACTER_CONFIGS, AvatarId } from "../lib/openai.js";
import { getAvatarDidUrl, uploadAudioToDid, createDidTalk, waitForDidTalk } from "../lib/did.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/chat", upload.single("audioFile"), async (req: Request, res: Response) => {
  const avatarId = req.body.avatarId as string;
  const audioBuffer = req.file?.buffer;

  if (!audioBuffer) {
    res.status(400).json({ error: "Missing audio file" });
    return;
  }

  const validIds: AvatarId[] = ["wednesday", "billie", "kairo"];
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
    });
    const transcript = transcription.text;
    console.log("Transcript:", transcript);

    // Step 2: LLM with GPT-4o-mini
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: config.systemPrompt },
        { role: "user", content: transcript },
      ],
    });
    const responseText = completion.choices[0].message.content ?? "";
    console.log("Response:", responseText);

    // Step 3: TTS → audio buffer
    const speechResponse = await openai.audio.speech.create({
      model: "tts-1",
      voice: config.voice,
      input: responseText,
    });
    const ttsBuffer = Buffer.from(await speechResponse.arrayBuffer());

    // Step 4: D-ID lip-sync (kairo only) or CSS animation mode
    const DID_AVATARS = ["kairo"];
    if (DID_AVATARS.includes(avatarId)) {
      console.log("Uploading audio to D-ID...");
      const audioUrl = await uploadAudioToDid(ttsBuffer);

      console.log("Getting D-ID image URL...");
      const imageUrl = await getAvatarDidUrl(avatarId as AvatarId);

      console.log("Creating D-ID talk...");
      const talkId = await createDidTalk(imageUrl, audioUrl);

      console.log("Waiting for D-ID video (talkId:", talkId, ")...");
      const replyVideoUrl = await waitForDidTalk(talkId);
      console.log("D-ID done:", replyVideoUrl);

      res.json({ transcript, responseText, replyVideoUrl });
    } else {
      const audioBase64 = ttsBuffer.toString("base64");
      res.json({ transcript, responseText, audioBase64 });
    }
  } catch (err: any) {
    console.error("Error in /api/chat:", err?.message ?? err);
    res.status(500).json({ error: "Server error", detail: err?.message });
  }
});

export default router;
