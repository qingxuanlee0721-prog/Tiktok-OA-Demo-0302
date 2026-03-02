import React, { useState } from "react";
import {
  X,
  Music,
  RefreshCcw,
  Timer,
  LayoutDashboard,
  Wand2,
  Sparkles,
  CircleUser,
  Gauge,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { CameraFeed } from "./CameraFeed";

interface CameraScreenProps {
  onOpenAvatar: () => void;
}

export function CameraScreen({ onOpenAvatar }: CameraScreenProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="absolute inset-0 w-full h-full">
      <CameraFeed />
      {/* Overlays */}
      <div className="absolute inset-0 flex flex-col justify-between pt-12 pb-8 px-4 z-10 pointer-events-none">
        {/* Top */}
        <div className="flex justify-between items-start pointer-events-auto">
          <button className="p-2">
            <X className="w-6 h-6 text-white drop-shadow-md" />
          </button>
          <button className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-4 py-1.5 rounded-full font-sans">
            <Music className="w-4 h-4" />
            <span className="text-sm font-medium">Add sound</span>
          </button>
          <button className="p-2">
            <RefreshCcw className="w-6 h-6 text-white drop-shadow-md" />
          </button>
        </div>

        {/* Right Toolbar */}
        <div className="absolute right-4 top-24 flex flex-col items-end gap-4 pointer-events-auto">
          <ToolbarButton
            icon={<Timer className="w-6 h-6" />}
            label="Timer"
            isExpanded={isExpanded}
          />
          <ToolbarButton
            icon={<LayoutDashboard className="w-6 h-6" />}
            label="Layout"
            isExpanded={isExpanded}
          />
          <ToolbarButton
            icon={<Wand2 className="w-6 h-6" />}
            label="Retouch"
            isExpanded={isExpanded}
          />
          <ToolbarButton
            icon={<Sparkles className="w-6 h-6" />}
            label="Filters"
            isExpanded={isExpanded}
          />
          <ToolbarButton
            icon={<CircleUser className="w-6 h-6" />}
            label="Avatar"
            onClick={onOpenAvatar}
            highlight
            isExpanded={isExpanded}
          />
          <ToolbarButton
            icon={<Gauge className="w-6 h-6" />}
            label="Speed"
            isExpanded={isExpanded}
          />
          <button
            className="p-2 mt-2"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 drop-shadow-md" />
            ) : (
              <ChevronDown className="w-5 h-5 drop-shadow-md" />
            )}
          </button>
        </div>

        {/* Bottom */}
        <div className="flex flex-col items-center gap-4 pointer-events-auto font-sans">
          <div className="flex gap-6 text-sm font-medium drop-shadow-md">
            <span className="opacity-60">10m</span>
            <span className="opacity-60">60s</span>
            <span className="bg-white text-black px-3 py-1 rounded-full">
              15s
            </span>
            <span className="opacity-60">PHOTO</span>
            <span className="opacity-60">TEXT</span>
          </div>
          <div className="w-20 h-20 rounded-full border-4 border-white/50 flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-red-500 rounded-full"></div>
          </div>
          <div className="flex gap-8 text-sm font-semibold tracking-wider drop-shadow-md">
            <span className="opacity-60">POST</span>
            <span>CREATE</span>
            <span className="opacity-60">LIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  onClick,
  highlight,
  isExpanded,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  highlight?: boolean;
  isExpanded?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-end gap-3 drop-shadow-md w-full font-sans"
    >
      {isExpanded && (
        <span className="text-xs font-medium drop-shadow-md">{label}</span>
      )}
      <div className={`p-2 ${highlight ? "bg-white/20 rounded-full" : ""}`}>
        {icon}
      </div>
    </button>
  );
}
