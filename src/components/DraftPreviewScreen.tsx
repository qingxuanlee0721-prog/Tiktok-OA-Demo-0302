import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import type { DuetResult } from "../types/chat";

interface DraftPreviewScreenProps {
  avatarId: string | null;
  avatarUrl: string | null;
  duetResult: DuetResult | null;
  onDiscard: () => void;
}

type Phase = "user" | "character";

export function DraftPreviewScreen({
  avatarId,
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

  const hookText =
    avatarId === "wednesday" ? "Do something. Wednesday will notice!" :
    avatarId === "billie"    ? "Be real. Billie will react!" :
                               "Say something. Kairo will notice!";

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

    let audioCtx: AudioContext | null = null;
    let animId = 0;
    let safetyTimerId = 0;

    try {
      // Step 1: 预下载 D-ID 视频为 blob（绕过 canvas CORS 限制）
      let replyVideoBlobUrl: string | null = null;
      if (duetResult.replyVideoUrl) {
        setRecordingStatus("Preparing...");
        const r = await fetch(duetResult.replyVideoUrl);
        if (!r.ok) throw new Error(`Fetch reply video failed: ${r.status}`);
        const blob = await r.blob();
        replyVideoBlobUrl = URL.createObjectURL(blob);
      }

      setRecordingStatus("Recording, please wait...");

      // 9:16 phone-screen canvas (720×1280)
      // Layout: 200px black top bar | 640px split-screen | 440px black bottom bar
      const W = 720, H = 1280;
      const TOP_BAR = 200;
      const CONTENT_H = 640;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      // 加载头像图片
      const avatarImg = new Image();
      await new Promise<void>((res, rej) => {
        avatarImg.onload = () => res();
        avatarImg.onerror = () => rej(new Error("Avatar load failed"));
        avatarImg.src = avatarUrl!;
      });

      // ★ 关键修复：AudioContext 在浏览器中默认 suspended，必须调用 resume()
      audioCtx = new AudioContext();
      await audioCtx.resume();
      const dest = audioCtx.createMediaStreamDestination();

      // 用户录像（音频通过 AudioContext 路由到录制轨道）
      const userVid = document.createElement("video");
      userVid.src = duetResult.videoBlobUrl;
      userVid.preload = "auto";
      await new Promise<void>((res, rej) => {
        const t = setTimeout(() => rej(new Error("User video load timeout")), 10000);
        userVid.oncanplaythrough = () => { clearTimeout(t); res(); };
        userVid.onerror = () => { clearTimeout(t); rej(new Error("User video load failed")); };
        userVid.load();
      });
      // createMediaElementSource 将音频路由到 audioCtx，视频帧仍可用于 canvas
      audioCtx.createMediaElementSource(userVid).connect(dest);

      // 角色回复：D-ID 视频 或 TTS 音频
      let replyVid: HTMLVideoElement | null = null;
      let replyAudioEl: HTMLAudioElement | null = null;

      if (replyVideoBlobUrl) {
        replyVid = document.createElement("video");
        replyVid.src = replyVideoBlobUrl;
        replyVid.preload = "auto";
        await new Promise<void>((res, rej) => {
          const t = setTimeout(() => rej(new Error("Reply video load timeout")), 10000);
          replyVid!.oncanplaythrough = () => { clearTimeout(t); res(); };
          replyVid!.onerror = () => { clearTimeout(t); rej(new Error("Reply video load failed")); };
          replyVid!.load();
        });
        audioCtx.createMediaElementSource(replyVid).connect(dest);
      } else if (duetResult.audioBase64) {
        const binary = atob(duetResult.audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const audioBlob = new Blob([bytes], { type: "audio/mpeg" });
        replyAudioEl = new Audio(URL.createObjectURL(audioBlob));
        replyAudioEl.preload = "auto";
        await new Promise<void>(res => {
          const t = setTimeout(res, 5000);
          replyAudioEl!.oncanplaythrough = () => { clearTimeout(t); res(); };
          replyAudioEl!.load();
        });
        audioCtx.createMediaElementSource(replyAudioEl).connect(dest);
      }

      // 合并 canvas 视频轨 + 混音轨
      const videoStream = canvas.captureStream(30);
      const combined = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      // 优先尝试 MP4（Chrome 130+ 支持），不支持则降级 WebM
      const mimeType = [
        'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
        'video/mp4; codecs="avc1, mp4a.40.2"',
        "video/mp4",
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp9",
        "video/webm",
      ].find(t => MediaRecorder.isTypeSupported(t)) ?? "video/webm";
      const ext = mimeType.startsWith("video/mp4") ? "mp4" : "webm";

      const recorder = new MediaRecorder(combined, { mimeType });
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

      let recordPhase: "user" | "character" = "user";

      // object-cover helper: crops the source to fill the destination without stretching
      function drawCover(src: HTMLVideoElement | HTMLImageElement, dx: number, dy: number, dw: number, dh: number) {
        const srcW = src instanceof HTMLVideoElement ? src.videoWidth : (src as HTMLImageElement).naturalWidth;
        const srcH = src instanceof HTMLVideoElement ? src.videoHeight : (src as HTMLImageElement).naturalHeight;
        if (!srcW || !srcH) { ctx.drawImage(src as CanvasImageSource, dx, dy, dw, dh); return; }
        const srcR = srcW / srcH;
        const dstR = dw / dh;
        let sx, sy, sw, sh;
        if (srcR > dstR) {
          // source is wider — crop left/right
          sh = srcH; sw = srcH * dstR; sx = (srcW - sw) / 2; sy = 0;
        } else {
          // source is taller — crop top/bottom
          sw = srcW; sh = srcW / dstR; sx = 0; sy = (srcH - sh) / 2;
        }
        ctx.drawImage(src as CanvasImageSource, sx, sy, sw, sh, dx, dy, dw, dh);
      }

      function draw() {
        // Full black background (covers top bar + bottom bar)
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, W, H);

        // Left: user video (mirrored, object-cover) — in content area
        ctx.save();
        ctx.translate(W / 2, TOP_BAR);
        ctx.scale(-1, 1);
        drawCover(userVid, 0, 0, W / 2, CONTENT_H);
        ctx.restore();

        // Right: avatar image or D-ID reply video (object-cover) — in content area
        if (recordPhase === "user" || !replyVid) {
          drawCover(avatarImg, W / 2, TOP_BAR, W / 2, CONTENT_H);
        } else {
          drawCover(replyVid, W / 2, TOP_BAR, W / 2, CONTENT_H);
        }

        // Center divider (only through content area)
        ctx.fillStyle = "#000";
        ctx.fillRect(W / 2, TOP_BAR, 1, CONTENT_H);

        // Hook text centered in top black bar
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 34px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(hookText, W / 2, TOP_BAR / 2);

        animId = requestAnimationFrame(draw);
      }

      const finish = () => {
        if (animId) cancelAnimationFrame(animId);
        if (safetyTimerId) clearTimeout(safetyTimerId);
        if (recorder.state !== "inactive") recorder.stop();
      };

      recorder.onstop = () => {
        setRecordingStatus(null);
        audioCtx?.close();
        if (replyVideoBlobUrl) URL.revokeObjectURL(replyVideoBlobUrl);
        if (chunks.length === 0) {
          console.error("Recording produced no data");
          return;
        }
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

      // 阶段切换：用户说完 → 角色回复
      userVid.onended = () => {
        recordPhase = "character";
        replyVid?.play().catch(console.error);
        replyAudioEl?.play().catch(console.error);
      };

      if (replyVid) replyVid.onended = finish;
      else if (replyAudioEl) replyAudioEl.onended = finish;
      else userVid.onended = finish; // 无角色回复时直接结束

      // ★ 安全超时：防止 onended 未触发导致录制永久挂起
      const userDur = isFinite(userVid.duration) ? userVid.duration : 10;
      const replyDur = replyVid && isFinite(replyVid.duration) ? replyVid.duration : 15;
      safetyTimerId = setTimeout(finish, (userDur + replyDur + 5) * 1000) as unknown as number;

      recorder.start(100);
      draw();
      userVid.play().catch(console.error);

    } catch (err) {
      console.error("Download failed:", err);
      if (animId) cancelAnimationFrame(animId);
      if (safetyTimerId) clearTimeout(safetyTimerId);
      audioCtx?.close();
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
        {/* Hook Text — same as recording screen */}
        <div className="absolute -top-10 inset-x-0 flex justify-center z-30 pointer-events-none font-sans">
          <span className="text-white font-semibold text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {hookText}
          </span>
        </div>

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
            {recordingStatus ? "Recording..." : "Save"}
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
