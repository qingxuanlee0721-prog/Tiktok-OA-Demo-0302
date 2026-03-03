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
import type { DuetResult } from "./types/chat";

type AppState =
  | "DEFAULT_CAMERA"
  | "AVATAR_SELECTION"
  | "SPLIT_SCREEN"
  | "GENERATING"
  | "DRAFT_PREVIEW";

export default function App() {
  const [appState, setAppState] = useState<AppState>("DEFAULT_CAMERA");
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(null);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [duetResult, setDuetResult] = useState<DuetResult | null>(null);

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
              onSelect={(avatarId, avatarUrl) => {
                setSelectedAvatarId(avatarId);
                setSelectedAvatarUrl(avatarUrl);
                setAppState("SPLIT_SCREEN");
              }}
            />
          </>
        )}
        {appState === "SPLIT_SCREEN" && (
          <SplitScreenLayout
            avatarId={selectedAvatarId}
            avatarUrl={selectedAvatarUrl}
            onRecordComplete={(videoBlob, audioBlob) => {
              setRecordedVideoBlob(videoBlob);
              setRecordedAudioBlob(audioBlob);
              setAppState("GENERATING");
            }}
            onClose={() => setAppState("DEFAULT_CAMERA")}
          />
        )}
        {appState === "GENERATING" && (
          <GenerationOverlay
            avatarId={selectedAvatarId}
            avatarUrl={selectedAvatarUrl}
            audioBlob={recordedAudioBlob}
            videoBlob={recordedVideoBlob}
            onDraftContinue={() => setAppState("DEFAULT_CAMERA")}
            onComplete={(result) => {
              setDuetResult(result);
              setAppState("DRAFT_PREVIEW");
            }}
          />
        )}
        {appState === "DRAFT_PREVIEW" && (
          <DraftPreviewScreen
            avatarId={selectedAvatarId}
            avatarUrl={selectedAvatarUrl}
            duetResult={duetResult}
            onDiscard={() => setAppState("DEFAULT_CAMERA")}
          />
        )}
      </div>
    </div>
  );
}
