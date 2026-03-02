import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";

interface DraftPreviewScreenProps {
  avatar: string | null;
  onDiscard: () => void;
}

export function DraftPreviewScreen({
  avatar,
  onDiscard,
}: DraftPreviewScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 w-full h-full flex flex-col justify-center bg-black z-50"
    >
      {/* Top Bar */}
      <div className="absolute top-0 inset-x-0 p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
        <button onClick={onDiscard}>
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      {/* Split Screen Content */}
      <div className="flex w-full aspect-[9/8] relative">
        <div className="w-1/2 h-full bg-zinc-700">
          <img
            src="https://picsum.photos/seed/userfreeze/400/711"
            className="w-full h-full object-cover"
            alt="User Draft"
          />
        </div>
        <div className="w-1/2 h-full bg-zinc-800">
          <img
            src={avatar || "https://picsum.photos/seed/default/400/711"}
            className="w-full h-full object-cover"
            alt="Avatar Draft"
          />
        </div>

        {/* Subtitle Overlay */}
        <div className="absolute bottom-4 inset-x-0 flex justify-center font-sans">
          <div className="bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm">
            <span className="text-white font-medium">
              This is a generated duet!
            </span>
          </div>
        </div>
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
