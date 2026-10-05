# 🌐 OmniTrans

> **Full-Stack AI Video Localization, Multimodal Dubbing & Translumo OCR Subtitle Studio**

OmniTrans is an end-to-end automated video translation platform that combines **Faster-Whisper** speech transcription, **Speaker Diarization**, **Microsoft Edge Neural TTS Dubbing**, **Translumo-inspired Multi-Engine OCR**, and a **Real-Time Interactive Subtitle Editor**.

---

## 🚀 Key Features

### 🎙️ 1. Audio Transcription & VAD
* **Faster-Whisper Engine:** High-speed multilingual speech recognition with customizable model sizes (`tiny`, `base`, `small`, `medium`).
* **Silero VAD (Voice Activity Detection):** Cuts dead air and background noise for clean speech segmentation.

### 🌐 2. Fast Neural Translation & Speaker Diarization
* **Batched Translation:** Translates transcriptions across 30+ languages (English, Spanish, French, German, Chinese, Japanese, Hindi, etc.).
* **Multi-Speaker Diarization:** Groups speech segments by distinct speaker tags (`SPEAKER_00`, `SPEAKER_01`, etc.) and maps each speaker to appropriate gendered neural voices.

### 👁️ 3. Translumo Multi-Engine Visual OCR
* **Multimodal Subtitle Extraction:** Captures burned-in / hardcoded subtitles and on-screen text that Whisper cannot hear.
* **Dual-Engine Ensemble:** Combines **Windows Native Media OCR (`winocr`)** with hardware DirectX acceleration and **Tesseract OCR** (`pytesseract`).
* **Translumo Quality Scorer:** Heuristic filtering that eliminates graphical noise, stray symbols, and background video artifacts.
* **Temporal Subtitle Aggregation:** Uses `SequenceMatcher` to merge identical text across consecutive seconds into unified `[start, end]` subtitle blocks.

### 🔊 4. Neural Dubbing & Pitch-Preserving Sync
* **Microsoft Edge Neural TTS:** Generates ultra-natural synthetic voiceovers in target languages.
* **Tempo Time-Stretching:** Dynamically adjusts dubbed speech cadence with pitch preservation (`atempo`) so voiceovers fit the original video timing.

### 🎬 5. Interactive Subtitle & Dubbing Studio
* **Visual Timeline Editor:** Scrub videos with live frame updates, split segments, merge segments, and edit translations on the fly.
* **Karaoke Subtitle Styles:** Live preview with styling presets including **CapCut Bold (Yellow)**, **Neon Cyberpunk**, **Minimal Box**, and **Pop Pink**.
* **Speaker-to-Voice Assignment:** Change neural voices per speaker with live preview.

### 📦 6. Flexible Custom Export
* **Subtitles:** Export as soft `.srt` / `.vtt` tracks or burn hardcoded subtitles with custom `.ass` karaoke glow styling.
* **AI Lip-Sync:** Optional integration with lip-sync models to align mouth movement to dubbed audio.
* **Container Formats:** Export directly to `.mp4` or `.mkv`.

---

## 🏗️ System Architecture

```text
               ┌───────────────────────────────┐
               │    Uploaded Video (MP4/MKV)   │
               └───────────────┬───────────────┘
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
   (Dubbing & Time Sync)               (Interactive Timeline Editor)
            │                                     │
            └──────────────────┬──────────────────┘
                               │
                    [ FFmpeg Final Muxing ]
                               │
                               ▼
               ┌───────────────────────────────┐
               │    Fully Translated Video     │
               └───────────────────────────────┘
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
│   │   ├── tts_service.py          # Voice catalog & voice management
│   │   ├── diarization_service.py  # Speaker clustering and voice mapping
│   │   ├── subtitle_service.py     # SRT, VTT, and ASS karaoke generator
│   │   ├── video_service.py        # FFmpeg audio extraction & video multiplexing
│   │   └── lipsync_service.py      # Lip-sync generation wrapper
│   ├── temp_uploads/               # Upload cache
│   └── results/                    # Exported videos, subtitles, and telemetry
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SubtitleEditor.jsx  # Main timeline & dubbing editor studio
│   │   │   ├── SubtitleTimeline.jsx# Waveform & visual timeline track
│   │   │   ├── KaraokeSubtitlePreview.jsx # Live karaoke overlay styles
│   │   │   ├── LivePipelineTracker.jsx    # Real-time pipeline telemetry
│   │   │   └── ExportModal.jsx     # Custom export and formatting options
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx       # Video management & upload hub
│   │   │   ├── Landing.jsx         # Landing page
│   │   │   ├── Login.jsx           # User authentication
│   │   │   └── Signup.jsx
│   │   └── App.jsx                 # Routing configuration
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
pip install fastapi uvicorn faster-whisper edge-tts opencv-python Pillow winocr pytesseract deep-translator imageio-ffmpeg pydub

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
| `POST` | `/api/upload` | Uploads video and initiates end-to-end processing pipeline |
| `GET` | `/api/pipeline/{base_name}` | Real-time telemetry and step-by-step progress tracking |
| `GET` | `/api/subtitles/{base_name}` | Retrieves generated subtitle segments |
| `POST` | `/api/subtitles/{base_name}/save` | Saves edited segments and re-generates `.srt` & `.vtt` |
| `POST` | `/api/subtitles/{base_name}/render` | Re-renders dubbed audio and remixes into MP4 |
| `GET` | `/api/subtitles/{base_name}/voices` | Fetches available Edge-TTS voices and current speaker map |
| `GET` | `/api/ocr/status` | Reports active OCR engines (Windows OCR, Tesseract, EasyOCR) |
| `POST` | `/api/video/{base_name}/extract-burned-subtitles` | Runs Translumo OCR to extract and translate hardcoded subtitles |
| `POST` | `/api/export/custom` | Custom export with ASS styling, soft/hardcoded subs, and lip-sync |

---

## 📄 License
This project is licensed under the Apache 2.0 License.
