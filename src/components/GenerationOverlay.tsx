import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { sendAudioForDuet } from "../lib/api";
import type { DuetResult } from "../types/chat";

interface GenerationOverlayProps {
  avatarId: string | null;
  avatarUrl: string | null;
  audioBlob: Blob | null;
  videoBlob: Blob | null;
  onDraftContinue: () => void;
  onComplete: (result: DuetResult) => void;
}

export function GenerationOverlay({
  avatarId,
  avatarUrl,
  audioBlob,
  videoBlob,
  onDraftContinue,
  onComplete,
}: GenerationOverlayProps) {
  const cancelledRef = useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    cancelledRef.current = false;

    async function generate() {
      if (!audioBlob || !avatarId) {
        setErrorMsg("Missing recording or avatar.");
        return;
      }

      try {
        const response = await sendAudioForDuet(audioBlob, avatarId);
        if (cancelledRef.current) return;

        const videoBlobUrl = videoBlob ? URL.createObjectURL(videoBlob) : "";
        onComplete({
          transcript: response.transcript,
          responseText: response.responseText,
          audioBase64: response.audioBase64,
          wordTimestamps: response.wordTimestamps,
          videoBlobUrl,
        });
      } catch (err: any) {
        if (cancelledRef.current) return;
        console.error("Generation error:", err);
        setErrorMsg(err?.message ?? "Something went wrong.");
      }
    }

    generate();

    return () => { cancelledRef.current = true; };
  }, [audioBlob, avatarId, videoBlob, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 w-full h-full flex flex-col justify-center bg-black z-50"
    >
      {/* Background Freeze Frame */}
      <div className="flex w-full aspect-[9/8] relative">
        <div className="w-1/2 h-full bg-zinc-700">
          {videoBlob ? (
            <video
              src={URL.createObjectURL(videoBlob)}
              className="w-full h-full object-cover opacity-50"
              muted
            />
          ) : (
            <div className="w-full h-full bg-zinc-700 opacity-50" />
          )}
        </div>
        <div className="w-1/2 h-full bg-zinc-800">
          <img
            src={avatarUrl || "https://picsum.photos/seed/default/400/711"}
            className="w-full h-full object-cover opacity-50"
            alt="Avatar Freeze"
          />
        </div>
      </div>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-white animate-spin" />
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              <polygon
                points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="2"
              />
            </svg>
          </div>
          {errorMsg ? (
            <span className="text-red-400 text-sm text-center px-6">{errorMsg}</span>
          ) : (
            <span className="text-lg font-medium">Generating response...</span>
          )}
        </div>

        <div className="absolute bottom-12 w-full px-8">
          <button
            onClick={() => { cancelledRef.current = true; onDraftContinue(); }}
            className="w-full bg-white text-black font-semibold py-3.5 rounded-full"
          >
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  );
}
