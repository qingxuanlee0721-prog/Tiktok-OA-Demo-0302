/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { CameraScreen } from "./components/CameraScreen";
import { AvatarSelectionSheet } from "./components/AvatarSelectionSheet";
import { SplitScreenLayout } from "./components/SplitScreenLayout";
import { GenerationOverlay } from "./components/GenerationOverlay";
import { DraftPreviewScreen } from "./components/DraftPreviewScreen";

type AppState =
  | "DEFAULT_CAMERA"
  | "AVATAR_SELECTION"
  | "SPLIT_SCREEN"
  | "GENERATING"
  | "DRAFT_PREVIEW";

export default function App() {
  const [appState, setAppState] = useState<AppState>("DEFAULT_CAMERA");
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

  return (
    <div className="w-full h-screen bg-black text-white overflow-hidden relative flex justify-center items-center font-sans">
      {/* 9:16 aspect ratio container for desktop viewing, full screen on mobile */}
      <div className="relative w-full h-full max-w-[400px] max-h-[850px] bg-zinc-900 overflow-hidden shadow-2xl sm:rounded-3xl">
        {appState === "DEFAULT_CAMERA" && (
          <CameraScreen onOpenAvatar={() => setAppState("AVATAR_SELECTION")} />
        )}
        {appState === "AVATAR_SELECTION" && (
          <>
            <CameraScreen onOpenAvatar={() => {}} />
            <AvatarSelectionSheet
              onClose={() => setAppState("DEFAULT_CAMERA")}
              onSelect={(avatar) => {
                setSelectedAvatar(avatar);
                setAppState("SPLIT_SCREEN");
              }}
            />
          </>
        )}
        {appState === "SPLIT_SCREEN" && (
          <SplitScreenLayout
            avatar={selectedAvatar}
            onRecordComplete={() => setAppState("GENERATING")}
            onClose={() => setAppState("DEFAULT_CAMERA")}
          />
        )}
        {appState === "GENERATING" && (
          <GenerationOverlay
            avatar={selectedAvatar}
            onDraftContinue={() => setAppState("DEFAULT_CAMERA")}
            onComplete={() => setAppState("DRAFT_PREVIEW")}
          />
        )}
        {appState === "DRAFT_PREVIEW" && (
          <DraftPreviewScreen
            avatar={selectedAvatar}
            onDiscard={() => setAppState("DEFAULT_CAMERA")}
          />
        )}
      </div>
    </div>
  );
}
