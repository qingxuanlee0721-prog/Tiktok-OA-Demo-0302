import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Music,
  Image as ImageIcon,
} from "lucide-react";
import { motion } from "motion/react";

interface SplitScreenLayoutProps {
  avatarId: string | null;
  avatarUrl: string | null;
  onRecordComplete: (videoBlob: Blob, audioBlob: Blob) => void;
  onClose: () => void;
}

export function SplitScreenLayout({
  avatarId,
  avatarUrl,
  onRecordComplete,
  onClose,
}: SplitScreenLayoutProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [progress, setProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const audioChunksRef = useRef<Blob[]>([]);
  const blobsReadyRef = useRef({ video: false, audio: false, videoBlob: null as Blob | null, audioBlob: null as Blob | null });

  let hookText = "Do something. They will notice!";
  if (avatarId === "wednesday") hookText = "Do something. Wednesday will notice!";
  else if (avatarId === "billie") hookText = "Be real. Billie will react!";
  else if (avatarId === "gojo") hookText = "Try it. Gojo responds!";

  // Set up camera on mount
  useEffect(() => {
    let active = true;
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }).catch(console.error);

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Recording timer
  useEffect(() => {
    if (!isRecording) return;
    const duration = 5000;
    const interval = 50;
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += interval;
      setProgress((elapsed / duration) * 100);
      if (elapsed >= duration) {
        clearInterval(timer);
        stopRecording();
      }
    }, interval);
    return () => clearInterval(timer);
  }, [isRecording]);

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;

    blobsReadyRef.current = { video: false, audio: false, videoBlob: null, audioBlob: null };
    videoChunksRef.current = [];
    audioChunksRef.current = [];

    // Video recorder (full stream for playback)
    const videoMime = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus"
      : "video/webm";
    const videoRecorder = new MediaRecorder(stream, { mimeType: videoMime });
    videoRecorder.ondataavailable = (e) => { if (e.data.size > 0) videoChunksRef.current.push(e.data); };
    videoRecorder.onstop = () => {
      const blob = new Blob(videoChunksRef.current, { type: "video/webm" });
      blobsReadyRef.current.videoBlob = blob;
      blobsReadyRef.current.video = true;
      checkBothReady();
    };
    videoRecorderRef.current = videoRecorder;

    // Audio recorder (audio only for Whisper API)
    const audioStream = new MediaStream(stream.getAudioTracks());
    const audioMime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    const audioRecorder = new MediaRecorder(audioStream, { mimeType: audioMime });
    audioRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
    audioRecorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      blobsReadyRef.current.audioBlob = blob;
      blobsReadyRef.current.audio = true;
      checkBothReady();
    };
    audioRecorderRef.current = audioRecorder;

    videoRecorder.start();
    audioRecorder.start();
    setIsRecording(true);
  }

  function stopRecording() {
    videoRecorderRef.current?.stop();
    audioRecorderRef.current?.stop();
    setIsRecording(false);
    setProgress(0);
  }

  function checkBothReady() {
    const { video, audio, videoBlob, audioBlob } = blobsReadyRef.current;
    if (video && audio && videoBlob && audioBlob) {
      onRecordComplete(videoBlob, audioBlob);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 w-full h-full flex flex-col justify-center bg-black"
    >
      {/* Top Close Button */}
      <div className="absolute top-0 inset-x-0 pt-12 pb-4 px-4 z-40 flex justify-between items-start pointer-events-none">
        <button onClick={onClose} className="p-2 pointer-events-auto">
          <X className="w-6 h-6 text-white drop-shadow-md" />
        </button>
        <div className="flex justify-center pointer-events-auto">
          <button className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-4 py-1.5 rounded-full font-sans">
            <Music className="w-4 h-4" />
            <span className="text-sm font-medium">Add sound</span>
          </button>
        </div>
        <div className="w-10"></div>
      </div>

      {/* Split Video Container */}
      <div className="flex w-full aspect-[9/8] relative mb-24">
        {/* Hook Text */}
        <div className="absolute -top-12 inset-x-0 flex justify-center z-30 font-sans pointer-events-none">
          <span className="text-white font-semibold text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {hookText}
          </span>
        </div>

        {/* Left 50% - Live Camera */}
        <div className="relative w-1/2 h-full overflow-hidden bg-zinc-900">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
        </div>

        {/* Center Divider */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-black z-20"></div>

        {/* Right 50% - Avatar */}
        <div className="relative w-1/2 h-full bg-zinc-800">
          <img
            src={avatarUrl || "https://picsum.photos/seed/default/400/711"}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 inset-x-0 pb-8 flex flex-col items-center z-30 pointer-events-none">

        {/* Gallery Strip */}
        {!isRecording && (
          <div className="w-full px-4 mb-4 pointer-events-auto">
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl p-2 flex gap-2 overflow-x-auto items-center no-scrollbar border border-white/10">
              <button className="w-11 h-11 bg-white/20 rounded-lg flex items-center justify-center shrink-0 border border-white/30">
                <ImageIcon className="w-5 h-5 text-white" />
              </button>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <img
                  key={i}
                  src={`https://picsum.photos/seed/gal${i}/150/150`}
                  className="w-11 h-11 rounded-lg object-cover shrink-0 border border-transparent"
                  alt="Gallery"
                />
              ))}
            </div>
          </div>
        )}

        {/* Duration / Modes */}
        {!isRecording && (
          <div className="flex gap-6 text-sm font-medium drop-shadow-md mb-4 pointer-events-auto font-sans">
            <span className="bg-white text-black px-3 py-1 rounded-full">5s</span>
            <span className="opacity-60 py-1">PHOTO</span>
            <span className="opacity-60 py-1">TEXT</span>
          </div>
        )}

        {/* Record Button */}
        <div className="relative flex items-center justify-center mb-4 pointer-events-auto">
          {isRecording && (
            <svg className="absolute w-24 h-24 -rotate-90">
              <circle cx="48" cy="48" r="44" stroke="rgba(255,255,255,0.3)" strokeWidth="4" fill="none" />
              <circle
                cx="48" cy="48" r="44"
                stroke="#ef4444" strokeWidth="4" fill="none"
                strokeDasharray="276"
                strokeDashoffset={276 - (276 * progress) / 100}
                className="transition-all duration-75"
              />
            </svg>
          )}
          <button
            onClick={() => !isRecording && startRecording()}
            className={`w-20 h-20 rounded-full border-4 border-white/50 flex items-center justify-center transition-all ${isRecording ? "scale-75" : ""}`}
          >
            <div className={`bg-red-500 transition-all ${isRecording ? "w-8 h-8 rounded-sm" : "w-16 h-16 rounded-full"}`}></div>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
