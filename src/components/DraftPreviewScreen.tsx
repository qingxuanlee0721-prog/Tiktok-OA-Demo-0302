import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import type { DuetResult } from "../types/chat";

interface DraftPreviewScreenProps {
  avatarUrl: string | null;
  duetResult: DuetResult | null;
  onDiscard: () => void;
}

type Phase = "user" | "character";

export function DraftPreviewScreen({
  avatarUrl,
  duetResult,
  onDiscard,
}: DraftPreviewScreenProps) {
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const replyVideoRef = useRef<HTMLVideoElement>(null);
  const replyAudioRef = useRef<HTMLAudioElement>(null);
  const phaseRef = useRef<Phase>("user");
  const [phase, setPhase] = useState<Phase>("user");
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<string | null>(null);

  const useDidMode = !!duetResult?.replyVideoUrl;

  function setPhaseSync(p: Phase) {
    phaseRef.current = p;
    setPhase(p);
  }

  useEffect(() => {
    if (!duetResult?.videoBlobUrl || !userVideoRef.current) return;
    userVideoRef.current.src = duetResult.videoBlobUrl;
    userVideoRef.current.play().catch(console.error);
  }, [duetResult?.videoBlobUrl]);

  useEffect(() => {
    if (useDidMode || !duetResult?.audioBase64 || !replyAudioRef.current) return;
    const binary = atob(duetResult.audioBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: "audio/mpeg" });
    replyAudioRef.current.src = URL.createObjectURL(blob);
  }, [duetResult?.audioBase64, useDidMode]);

  function handleUserVideoEnded() {
    setPhaseSync("character");
    if (useDidMode) {
      replyVideoRef.current?.play().catch(console.error);
    } else {
      replyAudioRef.current?.play().catch(console.error);
    }
  }

  function handleReplyEnded() {
    setPhaseSync("user");
    const uv = userVideoRef.current;
    if (uv) {
      uv.currentTime = 0;
      uv.play().catch(console.error);
    }
  }

  function handleCenterTap() {
    if (recordingStatus) return; // 录制中禁止干扰
    if (phaseRef.current === "user") {
      const v = userVideoRef.current;
      if (!v) return;
      v.paused ? v.play().catch(console.error) : v.pause();
    } else if (useDidMode) {
      const v = replyVideoRef.current;
      if (!v) return;
      v.paused ? v.play().catch(console.error) : v.pause();
    } else {
      const a = replyAudioRef.current;
      if (!a) return;
      a.paused ? a.play().catch(console.error) : a.pause();
    }
  }

  function handleUserVideoPlay() { if (phaseRef.current === "user") setIsPlaying(true); }
  function handleUserVideoPause() { if (phaseRef.current === "user") setIsPlaying(false); }
  function handleReplyVideoPlay() { if (phaseRef.current === "character") setIsPlaying(true); }
  function handleReplyVideoPause() { if (phaseRef.current === "character") setIsPlaying(false); }
  function handleReplyAudioPlay() { if (phaseRef.current === "character") setIsPlaying(true); }
  function handleReplyAudioPause() { if (phaseRef.current === "character") setIsPlaying(false); }

  // 下载合成视频：canvas 实时录制两侧画面 + 混音
  async function handleDownload() {
    if (!duetResult || !avatarUrl || recordingStatus) return;

    try {
      // Step 1: 预下载 D-ID 视频为 blob（绕过 canvas CORS 限制）
      let replyVideoBlobUrl: string | null = null;
      if (duetResult.replyVideoUrl) {
        setRecordingStatus("准备中...");
        const r = await fetch(duetResult.replyVideoUrl);
        const blob = await r.blob();
        replyVideoBlobUrl = URL.createObjectURL(blob);
      }

      setRecordingStatus("录制中，请稍等...");

      const W = 720, H = 640;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      // 加载头像图片
      const avatarImg = new Image();
      await new Promise<void>((res, rej) => {
        avatarImg.onload = () => res();
        avatarImg.onerror = rej;
        avatarImg.src = avatarUrl;
      });

      // 加载用户录像（静音，音频单独处理）
      const userVid = document.createElement("video");
      userVid.src = duetResult.videoBlobUrl;
      userVid.muted = true;
      await new Promise<void>(r => { userVid.onloadeddata = () => r(); userVid.load(); });

      // 加载角色回复视频（仅 D-ID 模式）
      let replyVid: HTMLVideoElement | null = null;
      if (replyVideoBlobUrl) {
        replyVid = document.createElement("video");
        replyVid.src = replyVideoBlobUrl;
        replyVid.muted = true;
        await new Promise<void>(r => { replyVid!.onloadeddata = () => r(); replyVid!.load(); });
      }

      // Web Audio API 混音
      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();

      const userAudio = new Audio(duetResult.videoBlobUrl);
      audioCtx.createMediaElementSource(userAudio).connect(dest);

      let replyAudio: HTMLAudioElement | null = null;
      if (replyVideoBlobUrl) {
        replyAudio = new Audio(replyVideoBlobUrl);
      } else if (duetResult.audioBase64) {
        const binary = atob(duetResult.audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: "audio/mpeg" });
        replyAudio = new Audio(URL.createObjectURL(blob));
      }
      if (replyAudio) {
        audioCtx.createMediaElementSource(replyAudio).connect(dest);
      }

      // 合并 canvas 视频轨 + 混音轨
      const videoStream = canvas.captureStream(30);
      const combined = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      // 优先尝试 MP4，不支持则降级 WebM
      const mimeType = ["video/mp4", "video/webm;codecs=vp9", "video/webm"]
        .find(t => MediaRecorder.isTypeSupported(t)) ?? "video/webm";
      const ext = mimeType.startsWith("video/mp4") ? "mp4" : "webm";

      const recorder = new MediaRecorder(combined, { mimeType });
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

      let animId: number;
      let recordPhase: "user" | "character" = "user";

      function draw() {
        // 左侧：用户录像（镜像）
        ctx.save();
        ctx.translate(W / 2, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(userVid, 0, 0, W / 2, H);
        ctx.restore();

        // 右侧：头像图片 或 D-ID 回复视频
        if (recordPhase === "user" || !replyVid) {
          ctx.drawImage(avatarImg, W / 2, 0, W / 2, H);
        } else {
          ctx.drawImage(replyVid, W / 2, 0, W / 2, H);
        }

        // 中间分割线
        ctx.fillStyle = "#000";
        ctx.fillRect(W / 2, 0, 1, H);

        animId = requestAnimationFrame(draw);
      }

      recorder.onstop = () => {
        setRecordingStatus(null);
        audioCtx.close();
        if (replyVideoBlobUrl) URL.revokeObjectURL(replyVideoBlobUrl);
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `duet-${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      };

      const finish = () => {
        cancelAnimationFrame(animId);
        recorder.stop();
      };

      userVid.onended = () => {
        recordPhase = "character";
        replyVid?.play();
        replyAudio?.play();
      };

      if (replyVid) replyVid.onended = finish;
      else if (replyAudio) replyAudio.onended = finish;
      else userVid.onended = finish; // 无角色回复时直接结束

      recorder.start(100);
      draw();
      userVid.play();
      userAudio.play();

    } catch (err) {
      console.error("Download failed:", err);
      setRecordingStatus(null);
    }
  }

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

      {/* Split Screen */}
      <div
        className="flex w-full aspect-[9/8] relative cursor-pointer"
        onClick={handleCenterTap}
      >
        <div className="w-1/2 h-full bg-zinc-700 overflow-hidden">
          <video
            ref={userVideoRef}
            className="w-full h-full object-cover scale-x-[-1]"
            playsInline
            preload="auto"
            onPlay={handleUserVideoPlay}
            onPause={handleUserVideoPause}
            onEnded={handleUserVideoEnded}
          />
        </div>

        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-black z-10" />

        <div className="w-1/2 h-full bg-zinc-800 overflow-hidden relative">
          <img
            src={avatarUrl || ""}
            alt="Avatar"
            className={[
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
              useDidMode
                ? phase === "user" ? "opacity-100 avatar-breathing" : "opacity-0"
                : phase === "user" ? "opacity-100 avatar-breathing" : "opacity-100 avatar-talking",
            ].join(" ")}
          />
          {duetResult?.replyVideoUrl && (
            <video
              ref={replyVideoRef}
              src={duetResult.replyVideoUrl}
              className={[
                "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
                phase === "character" ? "opacity-100" : "opacity-0",
              ].join(" ")}
              playsInline
              preload="auto"
              onPlay={handleReplyVideoPlay}
              onPause={handleReplyVideoPause}
              onEnded={handleReplyEnded}
            />
          )}
          {!useDidMode && (
            <audio
              ref={replyAudioRef}
              onPlay={handleReplyAudioPlay}
              onPause={handleReplyAudioPause}
              onEnded={handleReplyEnded}
            />
          )}
        </div>

        {!isPlaying && !recordingStatus && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-14 h-14 rounded-full bg-black/40 flex items-center justify-center">
              <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[18px] border-l-white ml-1" />
            </div>
          </div>
        )}

        {/* 录制状态提示 */}
        {recordingStatus && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/70 px-4 py-2 rounded-full text-sm font-medium font-sans">
              {recordingStatus}
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
            onClick={handleDownload}
            disabled={!!recordingStatus}
            className="bg-white/20 backdrop-blur-md px-6 py-2.5 rounded-sm font-medium disabled:opacity-40"
          >
            {recordingStatus ? "录制中..." : "Save"}
          </button>
          <button
            onClick={handleDownload}
            disabled={!!recordingStatus}
            className="bg-[#ef4444] px-8 py-2.5 rounded-sm font-semibold disabled:opacity-40"
          >
            Post
          </button>
        </div>
      </div>
    </motion.div>
  );
}
