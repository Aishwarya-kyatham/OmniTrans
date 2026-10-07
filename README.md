# 🌐 OmniTrans

> **Full-Stack AI Video Localization, Multimodal Dubbing, YouTube/Web Video Importer & Cinema Watch Studio**

OmniTrans is an end-to-end automated video translation platform that combines **Faster-Whisper** speech transcription, **Speaker Diarization**, **Microsoft Edge Neural TTS Dubbing**, **Translumo-inspired Multi-Engine OCR**, **YouTube/Web Video Importer via yt-dlp**, a **Real-Time Interactive Subtitle Editor**, and a **YouTube-Style Cinema Theater Player**.

---

## 🚀 Key Features

### 🎙️ 1. Audio Transcription & VAD
* **Faster-Whisper Engine:** High-speed multilingual speech recognition with customizable model sizes (`tiny`, `base`, `small`, `medium`).
* **Silero VAD (Voice Activity Detection):** Cuts dead air and background noise for clean speech segmentation.

### 🌐 2. Fast Neural Translation & Multi-Language Dubbing
* **Batched Neural Translation:** Delimited batch translation supporting 30+ languages including English, Spanish, Hindi (हिंदी), Japanese (日本語), Chinese (简体中文), Arabic (العربية), French, German, Korean, Russian, Portuguese, and Italian.
* **Multi-Speaker Diarization:** Groups speech segments by distinct speaker tags (`SPEAKER_00`, `SPEAKER_01`, etc.) and maps each speaker to gendered neural voices.
* **Language-Isolated Voice Profiles:** Speaker-to-voice maps are scoped and validated per target language, preventing cross-language voice contamination.

### 🎥 3. Web & YouTube Video Importer (yt-dlp)
* **Instant URL Import:** Paste links from YouTube, TikTok, Twitter/X, Bilibili, and Vimeo to inspect metadata and queue them directly into the translation & dubbing pipeline.
* **Direct Format Extraction:** Automatically downloads the optimal video and audio stream asynchronously with zero frontend blocking.

### 🍿 4. YouTube-Style Cinema Theater Watch Page (`/watch`)
* **Full Theater Video Player:** 16:9 cinema video player with custom scrubber, volume controls, mute toggle, fullscreen, and video link sharing.
* **Dubbed Videos Playlist Sidebar:** View all translated videos with clickable thumbnails, language badges, and creation dates.
* **Header Downloads Menu:** Quick-access "Downloads" button beside Sign out with a live badge count and instant dropdown playback/download links.

### 👁️ 5. Translumo Multi-Engine Visual OCR
* **Multimodal Subtitle Extraction:** Captures burned-in / hardcoded subtitles and on-screen text that Whisper cannot hear.
* **Dual-Engine Ensemble:** Combines **Windows Native Media OCR (`winocr`)** with hardware DirectX acceleration and **Tesseract OCR** (`pytesseract`).
* **Translumo Quality Scorer:** Heuristic filtering that eliminates graphical noise, stray symbols, and background video artifacts.
* **Temporal Subtitle Aggregation:** Uses `SequenceMatcher` to merge identical text across consecutive seconds into unified `[start, end]` subtitle blocks.

### 🔊 6. Neural Dubbing & Pitch-Preserving Sync
* **Microsoft Edge Neural TTS:** Generates ultra-natural synthetic voiceovers in target languages.
* **Tempo Time-Stretching:** Dynamically adjusts dubbed speech cadence with pitch preservation (`atempo`) so voiceovers fit the original video timing.

### 🎬 7. Interactive Subtitle & Dubbing Studio
* **Visual Timeline Editor:** Scrub videos with live frame updates, split segments, merge segments, and edit translations on the fly.
* **Karaoke Subtitle Styles:** Live preview with styling presets including **CapCut Bold (Yellow)**, **Neon Cyberpunk**, **Minimal Box**, and **Pop Pink**.
* **Speaker-to-Voice Assignment:** Change neural voices per speaker with live preview.

### 🔒 8. Strict Authentication & Session Persistence
* **Protected App Routes:** Logged-in users stay authenticated in their session across tabs and refreshes, routing directly to the Dashboard.
* **Guest Route Guards:** Once logged in, `/`, `/login`, and `/signup` redirect directly to `/app` until explicitly clicking Sign out.

---

## 🏗️ System Architecture

```text
               ┌─────────────────────────────────────────────────┐
               │    Input: File Upload OR YouTube / Web URL     │
               └────────────────────────┬────────────────────────┘
                                        │
                     ┌──────────────────┴──────────────────┐
                     ▼                                     ▼
            [ Audio Extraction ]                  [ Frame Extraction ]
                     │                                     │
            [ Faster-Whisper VAD ]              [ Translumo Multi-Engine OCR ]
            (Speech-to-Text)                    (Windows OCR + Tesseract)
                     │                                     │
            [ Speaker Diarization ]             [ Temporal Subtitle Grouping ]
                     │                                     │
                     └──────────────────┬──────────────────┘
                                        │
                             [ Neural Translation ]
                                        │
                     ┌──────────────────┴──────────────────┐
                     ▼                                     ▼
            [ Neural Edge-TTS ]                  [ Subtitle Studio UI ]
            (Dubbing & Pitch Sync)              (Interactive Timeline Editor)
                     │                                     │
                     └──────────────────┬──────────────────┘
                                        │
                             [ FFmpeg Stream Muxing ]
                                        │
                     ┌──────────────────┴──────────────────┐
                     ▼                                     ▼
          ┌───────────────────────┐             ┌───────────────────────┐
          │ Cinema Watch Player   │             │   MP4 / MKV Export    │
          │  (/watch Theater UI)  │             │   (Subtitled/Dubbed)  │
          └───────────────────────┘             └───────────────────────┘
```

---

## 📁 Project Structure

```text
OmniTrans/
├── backend/
│   ├── main.py                     # FastAPI application endpoints & pipeline orchestration
│   ├── services/
│   │   ├── ocr_service.py          # Translumo Multi-Engine OCR & Quality Scorer
│   │   ├── audio_service.py        # Faster-Whisper audio transcription & VAD
│   │   ├── translation_service.py  # Batched neural text translation
│   │   ├── dubbing_service.py      # Edge-TTS dubbing & audio synchronization
│   │   ├── tts_service.py          # Voice catalog & language voice validation
│   │   ├── diarization_service.py  # Speaker clustering and language-scoped voice mapping
│   │   ├── subtitle_service.py     # SRT, VTT, and ASS karaoke generator
│   │   ├── video_service.py        # FFmpeg audio extraction, video muxing & yt-dlp downloader
│   │   └── lipsync_service.py      # Lip-sync generation wrapper
│   ├── temp_uploads/               # Upload cache
│   └── results/                    # Exported videos, subtitles, and telemetry
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── UrlImporter.jsx     # Web & YouTube URL import component
│   │   │   ├── SubtitleEditor.jsx  # Main timeline & dubbing editor studio
│   │   │   ├── SubtitleTimeline.jsx# Waveform & visual timeline track
│   │   │   ├── KaraokeSubtitlePreview.jsx # Live karaoke overlay styles
│   │   │   ├── LivePipelineTracker.jsx    # Real-time pipeline telemetry
│   │   │   ├── LanguageSelector.jsx# Target language picker
│   │   │   └── ExportModal.jsx     # Custom export and formatting options
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx       # Video management, pipeline hub & Downloads dropdown
│   │   │   ├── WatchDownloads.jsx  # YouTube-style cinema theater player page
│   │   │   ├── Landing.jsx         # Product landing page
│   │   │   ├── Login.jsx           # User authentication
│   │   │   └── Signup.jsx
│   │   └── App.jsx                 # Routing configuration with strict auth guards
│   └── package.json
└── README.md
```

---

## ⚙️ Installation & Setup

### Prerequisites
* **Python 3.10+**
* **Node.js 18+** & **npm**
* **FFmpeg** (Included automatically via `imageio-ffmpeg` or system PATH)
* **Tesseract-OCR** (Optional for secondary OCR engine: [Tesseract for Windows](https://github.com/UB-Mannheim/tesseract/wiki))

---

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# (Optional) Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate   # Windows

# Install Python dependencies
pip install fastapi uvicorn faster-whisper edge-tts opencv-python Pillow winocr pytesseract deep-translator imageio-ffmpeg pydub yt-dlp

# Launch the FastAPI backend server
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

* API Docs will be available at: `http://127.0.0.1:8000/docs`
* Health Check: `http://127.0.0.1:8000/health`

---

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start the Vite development server
npm run dev
```

* Open your browser at: `http://localhost:5173/`

---

## 📡 API Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server health and OCR engine readiness status |
| `POST` | `/api/upload` | Uploads video file and initiates end-to-end processing pipeline |
| `POST` | `/api/inspect-url` | Inspects metadata for a YouTube / Web URL via yt-dlp |
| `POST` | `/api/upload-url` | Downloads web video via yt-dlp and enqueues into AI pipeline |
| `GET` | `/api/progress/{base_name}` | Real-time telemetry, stage progression, and live logs |
| `GET` | `/api/status/{filename}` | Checks if final processed video file is ready |
| `GET` | `/api/stream/{filename}` | Streams video with range headers for browser playback |
| `GET` | `/api/download/{filename}` | Direct file download of translated MP4 |
| `GET` | `/api/subtitles/{base_name}` | Retrieves generated subtitle segments |
| `POST` | `/api/subtitles/{base_name}/save` | Saves edited segments and re-generates `.srt` & `.vtt` |
| `POST` | `/api/subtitles/{base_name}/render` | Re-renders dubbed audio and remixes into MP4 |
| `GET` | `/api/subtitles/{base_name}/voices` | Fetches available Edge-TTS voices for target language |
| `POST` | `/api/subtitles/{base_name}/voices` | Updates speaker-to-voice mapping for project |
| `GET` | `/api/ocr/status` | Reports active OCR engines (Windows OCR, Tesseract, EasyOCR) |
| `POST` | `/api/video/{base_name}/extract-burned-subtitles` | Runs Translumo OCR to extract hardcoded subtitles |
| `POST` | `/api/export/custom` | Custom export with ASS styling, soft/hardcoded subs, and lip-sync |

---

## 📄 License
This project is licensed under the Apache 2.0 License.
