import os
import subprocess
import pydub
from pydub import AudioSegment
from concurrent.futures import ThreadPoolExecutor
from services.tts_service import TTSService
from services.diarization_service import DiarizationService

# Explicitly bind ffmpeg executable for pydub on Windows
ffmpeg_bin = os.environ.get("FFMPEG_BINARY", "ffmpeg")
AudioSegment.converter = ffmpeg_bin
AudioSegment.ffmpeg = ffmpeg_bin
AudioSegment.ffprobe = ffmpeg_bin
pydub.utils.which = lambda x: ffmpeg_bin

class DubbingService:
    def __init__(self, temp_dir="temp_uploads"):
        self.temp_dir = temp_dir
        os.makedirs(self.temp_dir, exist_ok=True)

        self.tts_service = TTSService()
        self.diarization_service = DiarizationService()

    def _get_wav_duration(self, wav_path: str) -> float:
        """Fast duration calculation using python native wave module."""
        try:
            import wave, contextlib
            with contextlib.closing(wave.open(wav_path, 'r')) as f:
                frames = f.getnframes()
                rate = f.getframerate()
                return frames / float(rate)
        except Exception:
            try:
                seg = AudioSegment.from_file(wav_path)
                return len(seg) / 1000.0
            except Exception:
                return 1.0

    def time_stretch_audio(self, input_wav: str, output_wav: str, speed_ratio: float, target_duration: float = None) -> str:
        """
        Uses FFmpeg's pitch-preserving atempo filter to time-stretch or shrink audio.
        speed_ratio > 1.0 speeds up audio (shortens duration).
        speed_ratio < 1.0 slows down audio (lengthens duration).
        Clamps speed_ratio between min and max bounds for natural sound.
        Includes apad silence padding inspired by davy1ex/videoTranslator when audio is shorter than slot.
        """
        min_stretch = float(os.environ.get("MIN_TIME_STRETCH_RATIO", "0.75"))
        max_stretch = float(os.environ.get("MAX_TIME_STRETCH_RATIO", "2.00"))
        
        clamped_ratio = max(min_stretch, min(max_stretch, speed_ratio))

        # Build filter graph string (chaining atempo if > 2.0 or < 0.5)
        remaining = clamped_ratio
        filter_chain = []
        while remaining > 2.0:
            filter_chain.append("atempo=2.0")
            remaining /= 2.0
        while remaining < 0.5:
            filter_chain.append("atempo=0.5")
            remaining /= 0.5
        filter_chain.append(f"atempo={remaining:.4f}")

        # Silence padding synchronization (from videoTranslator apad technique)
        if target_duration:
            actual_dur = self._get_wav_duration(input_wav)
            stretched_dur = actual_dur / clamped_ratio if clamped_ratio > 0 else actual_dur
            if stretched_dur < target_duration * 0.85:
                silence_dur = max(0.05, target_duration - stretched_dur)
                filter_chain.append(f"apad=pad_dur={silence_dur:.3f}")

        filter_str = ",".join(filter_chain)

        ffmpeg_path = os.environ.get("FFMPEG_BINARY", "ffmpeg")
        cmd = [
            ffmpeg_path, "-y", "-i", input_wav,
            "-filter:a", filter_str,
            "-vn", output_wav
        ]

        try:
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            return output_wav
        except Exception as e:
            print(f"[TimeStretch Warning] FFmpeg atempo failed: {e}. Using original audio.")
            return input_wav

    def generate_dubbed_audio(
        self, 
        translated_segments: list, 
        target_language: str, 
        base_name: str, 
        total_duration_ms: int,
        custom_voice_map: dict = None,
        audio_path: str = None
    ) -> tuple[str, list]:
        """
        Generates synchronized dubbed audio track using Neural TTS, speaker diarization tags,
        and pitch-preserving time-stretching executed in parallel. Returns (final_audio_path, sync_warnings_report).
        """
        print(f"[FastDubbing] Generating synchronized dubbed audio for '{base_name}' in '{target_language}'...")

        # Step 1: Ensure speaker tags exist
        tagged_segments = self.diarization_service.process_speaker_tags(translated_segments, audio_path=audio_path)

        # Step 2: Load or generate voice map
        if custom_voice_map:
            voice_map = custom_voice_map
        else:
            voice_map = self.diarization_service.load_voice_map(base_name, tagged_segments, target_language)

        min_stretch = float(os.environ.get("MIN_TIME_STRETCH_RATIO", "0.75"))
        max_stretch = float(os.environ.get("MAX_TIME_STRETCH_RATIO", "1.50"))

        tasks = []
        for idx, segment in enumerate(tagged_segments):
            text = segment.get("translated_text", segment.get("text", "")).strip()
            if not text:
                continue

            speaker = segment.get("speaker", "SPEAKER_00")
            selected_voice = voice_map.get(speaker, voice_map.get("SPEAKER_00"))
            raw_tts_wav = os.path.join(self.temp_dir, f"raw_tts_{base_name}_{idx}.wav")
            stretched_tts_wav = os.path.join(self.temp_dir, f"stretched_tts_{base_name}_{idx}.wav")

            start_sec = max(0.0, float(segment.get("start", 0.0)))
            end_sec = float(segment.get("end", start_sec + 1.0))
            target_dur_sec = max(0.2, end_sec - start_sec)
            start_ms = int(start_sec * 1000)

            tasks.append({
                "idx": idx,
                "segment": segment,
                "text": text,
                "speaker": speaker,
                "voice": selected_voice,
                "start_ms": start_ms,
                "target_dur_sec": target_dur_sec,
                "raw_wav": raw_tts_wav,
                "stretched_wav": stretched_tts_wav,
                "final_wav": raw_tts_wav,
                "actual_dur_sec": target_dur_sec,
                "speed_ratio": 1.0
            })

        print(f"[FastDubbing] Synthesizing & stretching {len(tasks)} TTS clips concurrently...")

        def _process_single_segment(t):
            try:
                # Synthesize TTS
                self.tts_service.generate_speech_sync(t["text"], t["voice"], target_language, t["raw_wav"])
                
                if not os.path.exists(t["raw_wav"]):
                    return t["idx"], False, "TTS file not generated"

                actual_dur_sec = self._get_wav_duration(t["raw_wav"])
                t["actual_dur_sec"] = actual_dur_sec
                speed_ratio = actual_dur_sec / t["target_dur_sec"] if t["target_dur_sec"] > 0 else 1.0
                t["speed_ratio"] = speed_ratio

                # Time-stretch and pad in the worker thread
                if abs(speed_ratio - 1.0) > 0.05 or actual_dur_sec < t["target_dur_sec"] * 0.85:
                    self.time_stretch_audio(t["raw_wav"], t["stretched_wav"], speed_ratio, target_duration=t["target_dur_sec"])
                    t["final_wav"] = t["stretched_wav"]
                else:
                    t["final_wav"] = t["raw_wav"]

                return t["idx"], True, None
            except Exception as e:
                print(f"[FastDubbing Error] Segment #{t['idx']+1}: {e}")
                return t["idx"], False, str(e)

        with ThreadPoolExecutor(max_workers=6) as executor:
            list(executor.map(_process_single_segment, tasks))

        # Step 4: Stitch onto audio canvas
        final_audio = AudioSegment.silent(duration=total_duration_ms)
        sync_reports = []

        for t in tasks:
            if not os.path.exists(t["final_wav"]):
                continue

            speed_ratio = t["speed_ratio"]
            if speed_ratio > max_stretch or speed_ratio < min_stretch:
                clamped_speed = max(min_stretch, min(max_stretch, speed_ratio))
                sync_reports.append({
                    "segment_id": t["segment"].get("id", t["idx"] + 1),
                    "speaker": t["speaker"],
                    "text": t["text"],
                    "target_duration": round(t["target_dur_sec"], 2),
                    "actual_duration": round(t["actual_dur_sec"], 2),
                    "required_speed": round(speed_ratio, 2),
                    "clamped_speed": round(clamped_speed, 2),
                    "warning": f"Speed ratio {speed_ratio:.2f}x outside optimal bounds [{min_stretch:.2f} - {max_stretch:.2f}]. Clamped to {clamped_speed:.2f}x."
                })

            try:
                clip = AudioSegment.from_file(t["final_wav"])
                final_audio = final_audio.overlay(clip, position=t["start_ms"])
            except Exception as e:
                print(f"[FastDubbing Error] Failed to overlay audio #{t['idx']+1}: {e}")
            finally:
                for tmp in [t["raw_wav"], t["stretched_wav"]]:
                    if os.path.exists(tmp):
                        try: os.remove(tmp)
                        except: pass

        final_dubbed_path = os.path.join(self.temp_dir, f"{base_name}_dubbed_{target_language}.wav")
        final_audio.export(final_dubbed_path, format="wav")
        print(f"[FastDubbing] Dubbed audio track saved at: {final_dubbed_path} (Warnings: {len(sync_reports)})")
        return final_dubbed_path, sync_reports
