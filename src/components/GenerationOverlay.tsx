import { useEffect } from "react";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";

interface GenerationOverlayProps {
  avatar: string | null;
  onDraftContinue: () => void;
  onComplete: () => void;
}

export function GenerationOverlay({
  avatar,
  onDraftContinue,
  onComplete,
}: GenerationOverlayProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 6000); // 6 seconds fake delay
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 w-full h-full flex flex-col justify-center bg-black z-50"
    >
      {/* Background Freeze Frame */}
      <div className="flex w-full aspect-[9/8] relative">
        <div className="w-1/2 h-full bg-zinc-700">
          <img
            src="https://picsum.photos/seed/userfreeze/400/711"
            className="w-full h-full object-cover opacity-50"
            alt="User Freeze"
          />
        </div>
        <div className="w-1/2 h-full bg-zinc-800">
          <img
            src={avatar || "https://picsum.photos/seed/default/400/711"}
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
            {/* Hexagon outline like in screenshot */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 100"
            >
              <polygon
                points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="2"
              />
            </svg>
          </div>
          <span className="text-lg font-medium">
            Starting your generation...
          </span>
        </div>

        <div className="absolute bottom-12 w-full px-8">
          <button
            onClick={onDraftContinue}
            className="w-full bg-white text-black font-semibold py-3.5 rounded-full"
          >
            Continue generating in drafts
          </button>
        </div>
      </div>
    </motion.div>
  );
}
