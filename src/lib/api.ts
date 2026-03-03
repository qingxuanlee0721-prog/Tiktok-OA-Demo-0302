import type { ChatResponse } from "../types/chat";

export async function sendAudioForDuet(
  audioBlob: Blob,
  avatarId: string
): Promise<ChatResponse> {
  const formData = new FormData();
  formData.append("audioFile", audioBlob, "recording.webm");
  formData.append("avatarId", avatarId);

  const res = await fetch("/api/chat", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? "API request failed");
  }

  return res.json() as Promise<ChatResponse>;
}
