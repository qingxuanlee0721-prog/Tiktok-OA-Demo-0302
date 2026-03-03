import { readFileSync } from "fs";
import { join } from "path";
import type { AvatarId } from "./openai.js";

const DID_API_URL = "https://api.d-id.com";

const AVATAR_IMAGE_PATHS: Record<AvatarId, string> = {
  wednesday: "public/avatars/wednesday-avatar.png",
  billie: "public/avatars/billie-avatar.png",
  kairo: "public/avatars/kairo-avatar.png",
};

// Cache uploaded avatar image URLs to avoid re-uploading on every request
const avatarUrlCache: Partial<Record<AvatarId, string>> = {};

function getAuthHeader(): string {
  return `Basic ${process.env.DID_API_KEY}`;
}

// Upload a local avatar image to D-ID and return the hosted URL
async function uploadImageToDid(avatarId: AvatarId): Promise<string> {
  if (avatarUrlCache[avatarId]) {
    console.log(`Using cached D-ID image URL for ${avatarId}`);
    return avatarUrlCache[avatarId]!;
  }

  const filePath = join(process.cwd(), AVATAR_IMAGE_PATHS[avatarId]);
  const buffer = readFileSync(filePath);
  const imageFile = new File([buffer], `${avatarId}-avatar.png`, { type: "image/png" });

  const formData = new FormData();
  formData.append("image", imageFile);

  console.log(`Uploading ${avatarId} avatar image to D-ID...`);
  const res = await fetch(`${DID_API_URL}/images`, {
    method: "POST",
    headers: { Authorization: getAuthHeader() },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`D-ID image upload failed: ${err}`);
  }

  const data = await res.json() as { url: string };
  avatarUrlCache[avatarId] = data.url;
  console.log(`D-ID image URL for ${avatarId}:`, data.url);
  return data.url;
}

// Upload TTS audio buffer to D-ID, returns a URL D-ID can use internally
export async function uploadAudioToDid(audioBuffer: Buffer): Promise<string> {
  const formData = new FormData();
  const audioFile = new File([audioBuffer], "reply.mp3", { type: "audio/mpeg" });
  formData.append("audio", audioFile);

  const res = await fetch(`${DID_API_URL}/audios`, {
    method: "POST",
    headers: { Authorization: getAuthHeader() },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`D-ID audio upload failed: ${err}`);
  }

  const data = await res.json() as { url: string };
  return data.url;
}

// Get D-ID hosted image URL for an avatar (uploads if not cached)
export async function getAvatarDidUrl(avatarId: AvatarId): Promise<string> {
  return uploadImageToDid(avatarId);
}

// Create a D-ID talk (image URL + audio URL → video), returns talk ID
export async function createDidTalk(imageUrl: string, audioUrl: string): Promise<string> {
  const body = {
    source_url: imageUrl,
    script: {
      type: "audio",
      audio_url: audioUrl,
    },
    config: {
      fluent: false,
      pad_audio: 0,
    },
  };
  console.log("D-ID talk request body:", JSON.stringify(body));

  const res = await fetch(`${DID_API_URL}/talks`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`D-ID talk creation failed: ${err}`);
  }

  const data = await res.json() as { id: string };
  return data.id;
}

// Poll D-ID until the talk is done, returns the result video URL
export async function waitForDidTalk(
  talkId: string,
  timeoutMs = 90000,
  intervalMs = 3000
): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const res = await fetch(`${DID_API_URL}/talks/${talkId}`, {
      headers: { Authorization: getAuthHeader() },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`D-ID poll failed: ${err}`);
    }

    const data = await res.json() as { status: string; result_url?: string; error?: any };
    console.log(`D-ID talk ${talkId} status:`, data.status);

    if (data.status === "done" && data.result_url) {
      return data.result_url;
    }
    if (data.status === "error") {
      throw new Error(`D-ID generation error: ${JSON.stringify(data.error)}`);
    }
  }

  throw new Error("D-ID talk timed out after 90 seconds");
}
