export type AvatarId = "wednesday" | "billie" | "kairo";

export interface ChatResponse {
  transcript: string;
  responseText: string;
  replyVideoUrl?: string;  // D-ID mode (kairo)
  audioBase64?: string;    // CSS animation mode (wednesday, billie)
}

export interface DuetResult {
  transcript: string;
  responseText: string;
  replyVideoUrl?: string;
  audioBase64?: string;
  videoBlobUrl: string; // user's recorded video
}
