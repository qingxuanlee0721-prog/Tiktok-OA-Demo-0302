import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import type { DuetResult } from "../types/chat";

interface DraftPreviewScreenProps {
  avatarUrl: string | null;
  duetResult: DuetResult | null;
  onDiscard: () => void;
}

export function DraftPreviewScreen({
  avatarUrl,
  duetResult,
  onDiscard,
}: DraftPreviewScreenProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [isBlink, setIsBlink] = useState(false);
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Decode base64 audio and play on mount
  useEffect(() => {
    if (!duetResult?.audioBase64 || !audioRef.current) return;

    const bytes = atob(duetResult.audioBase64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const blob = new Blob([arr], { type: "audio/mp3" });
    const url = URL.createObjectURL(blob);
    audioRef.current.src = url;
    audioRef.current.play().catch(console.error);

    return () => URL.revokeObjectURL(url);
  }, [duetResult?.audioBase64]);

  // Update current word index based on audio time + word timestamps
  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio || !duetResult?.wordTimestamps?.length) return;

    const currentTime = audio.currentTime;
    const words = duetResult.wordTimestamps;
    let idx = -1;
    for (let i = 0; i < words.length; i++) {
      if (currentTime >= words[i].start) idx = i;
      else break;
    }
    setCurrentWordIndex(idx);
  }

  // Blink animation loop while playing
  useEffect(() => {
    if (!isPlaying) {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
      return;
    }

    function scheduleBlink() {
      const delay = 2000 + Math.random() * 4000;
      blinkTimerRef.current = setTimeout(() => {
        setIsBlink(true);
        setTimeout(() => setIsBlink(false), 200);
        scheduleBlink();
      }, delay);
    }

    scheduleBlink();
    return () => { if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current); };
  }, [isPlaying]);

  // Build subtitle text
  const words = duetResult?.wordTimestamps?.map((w) => w.word) ?? duetResult?.responseText.split(" ") ?? [];
  const subtitleText = currentWordIndex >= 0 ? words.slice(0, currentWordIndex + 1).join(" ") : "";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 w-full h-full flex flex-col justify-center bg-black z-50"
    >
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => { setIsPlaying(false); setCurrentWordIndex(words.length - 1); }}
        onTimeUpdate={handleTimeUpdate}
      />

      {/* Top Bar */}
      <div className="absolute top-0 inset-x-0 p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
        <button onClick={onDiscard}>
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      {/* Split Screen Content */}
      <div className="flex w-full aspect-[9/8] relative">
        {/* Left - User Recorded Video */}
        <div className="w-1/2 h-full bg-zinc-700 overflow-hidden">
          {duetResult?.videoBlobUrl ? (
            <video
              src={duetResult.videoBlobUrl}
              className="w-full h-full object-cover scale-x-[-1]"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <div className="w-full h-full bg-zinc-700" />
          )}
        </div>

        {/* Right - Avatar with Talking Animation */}
        <div className="w-1/2 h-full bg-zinc-800 overflow-hidden">
          <img
            src={avatarUrl || "https://picsum.photos/seed/default/400/711"}
            alt="Avatar"
            className={[
              "w-full h-full object-cover transition-transform duration-150",
              isPlaying ? "avatar-talking" : "",
              isBlink ? "avatar-blink" : "",
            ].join(" ")}
          />
        </div>

        {/* Subtitle Overlay */}
        {subtitleText && (
          <div className="absolute bottom-4 inset-x-0 flex justify-center font-sans px-4">
            <div className="bg-black/60 px-4 py-2 rounded-lg backdrop-blur-sm max-w-[90%]">
              <span className="text-white font-medium text-sm text-center">{subtitleText}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="absolute bottom-0 inset-x-0 p-6 flex justify-between items-center bg-gradient-to-t from-black/80 to-transparent z-20 font-sans">
        <button onClick={onDiscard} className="text-white/80 font-medium">
          Discard
        </button>
        <div className="flex gap-3">
          <button
            onClick={onDiscard}
            className="bg-white/20 backdrop-blur-md px-6 py-2.5 rounded-sm font-medium"
          >
            Save
          </button>
          <button
            onClick={onDiscard}
            className="bg-[#ef4444] px-8 py-2.5 rounded-sm font-semibold"
          >
            Post
          </button>
        </div>
      </div>
    </motion.div>
  );
}
