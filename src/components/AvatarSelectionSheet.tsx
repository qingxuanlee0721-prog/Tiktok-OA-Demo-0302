import { motion } from "motion/react";
import { ArrowLeft, X } from "lucide-react";

interface AvatarSelectionSheetProps {
  onClose: () => void;
  onSelect: (avatarId: string, avatarUrl: string) => void;
}

const AVATARS = [
  {
    id: "wednesday",
    name: "Wednesday Addams",
    imageUrl: "/avatars/wednesday-avatar.png",
  },
  {
    id: "billie",
    name: "Billie Eilish",
    imageUrl: "/avatars/billie-avatar.png",
  },
  {
    id: "kairo",
    name: "Kairo (Virtual)",
    imageUrl: "/avatars/kairo-avatar.png",
  },
];

export function AvatarSelectionSheet({
  onClose,
  onSelect,
}: AvatarSelectionSheetProps) {
  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="absolute inset-x-0 bottom-0 h-[40%] bg-zinc-900/95 backdrop-blur-xl rounded-t-2xl z-50 flex flex-col"
    >
      <div className="flex justify-between items-center p-4 border-b border-white/10 font-sans">
        <button onClick={onClose}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="font-semibold">Choose Avatar</span>
        <button onClick={onClose}>
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center gap-6 px-6">
        {AVATARS.map((avatar) => (
          <AvatarOption
            key={avatar.id}
            src={avatar.imageUrl}
            name={avatar.name}
            onClick={() => onSelect(avatar.id, avatar.imageUrl)}
          />
        ))}
      </div>
    </motion.div>
  );
}

function AvatarOption({ src, name, onClick }: { src: string; name: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 group"
    >
      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-transparent group-hover:border-white transition-colors">
        <img src={src} alt={name} className="w-full h-full object-cover" />
      </div>
      <span className="text-xs font-medium text-center text-white/80 font-sans">
        {name}
      </span>
    </button>
  );
}
