from fastapi import FastAPI, File, UploadFile, BackgroundTasks, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import json
import imageio_ffmpeg

import imageio_ffmpeg

# Bundle an ffmpeg executable explicitly
os.environ["FFMPEG_BINARY"] = str(imageio_ffmpeg.get_ffmpeg_exe())

from services.video_service import VideoService
from services.audio_service import AudioService
from services.translation_service import TranslationService
from services.subtitle_service import SubtitleService
from services.dubbing_service import DubbingService

app = FastAPI(title="OmniTrans Video Processor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("temp_uploads", exist_ok=True)
os.makedirs("results", exist_ok=True)

# Initialize AI Services (Loads models into memory)
video_svc = VideoService()
audio_svc = AudioService(model_size="tiny") 
translation_svc = TranslationService()
subtitle_svc = SubtitleService()
dubbing_svc = DubbingService()

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "OmniTrans Backend is running"}

def process_video_pipeline(file_path: str, base_name: str, target_language: str):
    """
    Background task that orchestrates the entire AI pipeline including dubbing.
    """
    try:
        print(f"--- Starting Pipeline for '{base_name}' to format '{target_language}' ---")
        
        # 1. Video Processing
        import wave
        import contextlib
        audio_path = video_svc.extract_audio(file_path)
        
        # Get total duration of the original audio in milliseconds for dubbing synchronization
        with contextlib.closing(wave.open(audio_path, 'r')) as f:
            frames = f.getnframes()
            rate = f.getframerate()
            duration_ms = int((frames / float(rate)) * 1000)
            
        # 2. Audio Validation & Transcription (Whisper)
        audio_transcription = audio_svc.transcribe(audio_path)
        
        # 3. Translation
        translated_segments = translation_svc.translate_audio_segments(audio_transcription["segments"], target_language)
        
        raw_data_path = os.path.join("results", f"{base_name}_translated_data.json")
        with open(raw_data_path, "w", encoding='utf-8') as f:
            json.dump({
                "audio": translated_segments,
                "visual": [] # OCR disabled for speed
            }, f, indent=4, ensure_ascii=False)
            
        # 4. Export to Subtitle format (SRT) 
        srt_path = subtitle_svc.generate_srt(translated_segments, base_name, target_language)
            
        # 5. Generate Dubbed Audio using TTS
        dubbed_audio_path = dubbing_svc.generate_dubbed_audio(
            translated_segments, 
            target_language, 
            base_name, 
            duration_ms
        )
        
        # 7. Mix the new audio back into the video, and burn subtitles
        final_video_path = video_svc.mix_dubbed_audio(file_path, dubbed_audio_path, srt_path, target_language)
        print(f"--- Pipeline Complete! Final Mixed video at '{final_video_path}' ---")
        
    except Exception as e:
        import traceback
        print(f"ERROR during processing: {e}")
        traceback.print_exc()

@app.get("/api/download/{filename}")
async def download_video(filename: str):
    """Endpoint for the frontend to download the final processed file."""
    file_path = os.path.join("results", filename)
    if os.path.exists(file_path):
        return FileResponse(
            path=file_path, 
            media_type='video/mp4', 
            filename=filename,
            headers={
                "Access-Control-Expose-Headers": "Content-Disposition",
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    return {"error": "File not processing or not found."}
    
@app.get("/api/stream/{filename}")
async def stream_video(filename: str):
    """Endpoint for the frontend to stream/play the final processed file in the browser."""
    file_path = os.path.join("results", filename)
    if os.path.exists(file_path):
        return FileResponse(path=file_path, media_type='video/mp4')
    return {"error": "File not found."}

@app.get("/api/status/{filename}")
async def check_status(filename: str):
    """Endpoint for the frontend to poll status of background processing."""
    file_path = os.path.join("results", filename)
    if os.path.exists(file_path):
        return {"status": "complete", "filename": filename}
    return {"status": "processing"}

@app.post("/api/upload")
async def upload_video(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...),
    target_language: str = Form("es")
):
    """Receives file and kicks off background processing."""
    print(">>> /api/upload ENDPOINT HIT <<<")
    print(f"File received: {file.filename}, Target Language: {target_language}")
    
    file_location = os.path.join("temp_uploads", file.filename)
    
    try:
        print(f"Saving file to: {file_location}")
        with open(file_location, "wb+") as file_object:
            file_object.write(file.file.read())
            
        base_name = os.path.splitext(file.filename)[0]
        print(f"Base name extracted: {base_name}. Adding to background tasks...")
        
        background_tasks.add_task(process_video_pipeline, file_location, base_name, target_language)
        print(">>> Background task successfully queued. Returning processing status. <<<")
        
        return {
            "status": "processing",
            "info": f"File '{file.filename}' received. Translating to '{target_language}'. AI pipeline started."
        }
    except Exception as e:
        print(f"!!! CRITICAL UPLOAD ROUTE ERROR !!! : {e}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "info": str(e)}
