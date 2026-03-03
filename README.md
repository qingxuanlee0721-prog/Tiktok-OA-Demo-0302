# Avatar Duet — AI-Powered TikTok Duet Creator

A TikTok-style web app that lets you record a 5-second video of yourself and get a real-time AI-generated response from a virtual character — complete with voice, personality, and lip-sync animation.

## Demo

> Record yourself → AI transcribes your words → Character responds in-character → Download your duet as a video

## Features

- **Split-screen duet recording** — Live camera on the left, avatar on the right, just like TikTok Duet
- **AI voice pipeline** — Whisper (speech-to-text) → GPT-4o-mini (character response) → TTS (text-to-speech)
- **3 unique character personalities**, each with a distinct voice and style
- **Lip-sync animation** for Kairo via D-ID API
- **Video export** — Download your duet as a 9:16 portrait MP4, phone-screen style with hook text

## Characters

| Avatar | Personality | Voice |
|--------|-------------|-------|
| **Wednesday Addams** | Deadpan, dark, morbidly curious | Female (shimmer) |
| **Billie Eilish** | Authentic, chill, deeply empathetic | Female (nova) |
| **Kairo** (Virtual Idol) | Cold yet magnetic, quietly intense | Male (onyx) + D-ID lip-sync |

## Tech Stack

**Frontend**
- React 19 + TypeScript
- Vite 6
- Tailwind CSS 4
- Motion (animations)
- Web APIs: `MediaRecorder`, `getUserMedia`, `Canvas`, `AudioContext`

**Backend**
- Node.js + Express
- OpenAI SDK — Whisper, GPT-4o-mini, TTS-1
- D-ID API — lip-sync video generation (Kairo)
- Multer — audio file uploads

## Getting Started

### Prerequisites

- Node.js >= 20
- OpenAI API key
- D-ID API key (optional — only needed for Kairo lip-sync)

### Installation

```bash
git clone https://github.com/your-username/avatar-duet.git
cd avatar-duet
npm install
```

### Environment Variables

Create a `.env` file at the project root:

```env
OPENAI_API_KEY=sk-...your-key-here
DID_API_KEY=...your-d-id-key-here   # optional
PORT=3001
```

### Run Locally

In two separate terminals:

```bash
# Terminal 1 — backend
npm run dev:server

# Terminal 2 — frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

```
User records 5s video
        ↓
Audio extracted → OpenAI Whisper (transcription)
        ↓
Transcript → GPT-4o-mini with character system prompt (response text)
        ↓
Response text → OpenAI TTS (voice audio)
        ↓
[Kairo only] TTS audio + avatar image → D-ID API (lip-sync video)
        ↓
Draft Preview: split-screen playback + subtitle animation
        ↓
Download as 9:16 MP4
```

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── CameraScreen.tsx         # Default camera UI
│   │   ├── AvatarSelectionSheet.tsx # Avatar picker bottom sheet
│   │   ├── SplitScreenLayout.tsx    # Duet recording interface
│   │   ├── GenerationOverlay.tsx    # AI generation loading state
│   │   └── DraftPreviewScreen.tsx   # Playback + download
│   ├── lib/api.ts                   # API client
│   └── types/chat.ts                # TypeScript types
│
└── server/
    ├── index.ts                     # Express app + static serving
    ├── routes/chat.ts               # POST /api/chat pipeline
    └── lib/
        ├── openai.ts                # Character configs + OpenAI client
        └── did.ts                   # D-ID integration
```

## Deployment

The app is deployed as a single Railway service. The Express server serves both the API and the Vite-built frontend.

```bash
# Build
npm run build

# Start production server
npm start
```

Required environment variables on Railway: `OPENAI_API_KEY`, `DID_API_KEY`, `NODE_ENV=production`
