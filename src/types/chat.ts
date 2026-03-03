export type AvatarId = "wednesday" | "billie" | "gojo";

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface ChatResponse {
  transcript: string;
  responseText: string;
  audioBase64: string;
  wordTimestamps?: WordTimestamp[];
}

export interface DuetResult {
  transcript: string;
  responseText: string;
  audioBase64: string;
  wordTimestamps?: WordTimestamp[];
  videoBlobUrl: string;
}
