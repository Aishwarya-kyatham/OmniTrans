import os
from gtts import gTTS
from pydub import AudioSegment

# Explicitly tell pydub where to find the absolute path of our bundled ffmpeg executable
AudioSegment.converter = os.environ.get("FFMPEG_BINARY")

class DubbingService:
    def __init__(self, temp_dir="temp_uploads"):
        self.temp_dir = temp_dir
        os.makedirs(self.temp_dir, exist_ok=True)
        
    def generate_dubbed_audio(self, translated_segments: list, target_language: str, base_name: str, total_duration_ms: int) -> str:
        """
        Takes translated text segments and generates a unified TTS audio track that places
        the spoken words at their correct timestamp.
        """
        print(f"Generating dubbed audio track for '{base_name}' in '{target_language}'...")
        
        # Create a silent audio canvas for the entire duration of the original video
        final_audio = AudioSegment.silent(duration=total_duration_ms)
        
        for idx, segment in enumerate(translated_segments):
            text = segment['text']
            start_ms = int(segment['start'] * 1000)
            
            if not text or text.strip() == "":
                continue
                
            temp_tts_path = os.path.join(self.temp_dir, f"temp_tts_{idx}.mp3")
            
            try:
                # Generate AI voice with gTTS (downloads as MP3)
                tts = gTTS(text=text, lang=target_language, slow=False)
                tts.save(temp_tts_path)
                
                # Convert the MP3 to WAV manually using our bundled ffmpeg
                temp_wav_path = temp_tts_path.replace(".mp3", ".wav")
                ffmpeg_path = os.environ.get("FFMPEG_BINARY", "ffmpeg")
                
                import subprocess
                subprocess.run([
                    ffmpeg_path, "-y", "-i", temp_tts_path, temp_wav_path
                ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
                
                # Load the generated speech natively (pydub can read wavs without ffprobe)
                spoken_segment = AudioSegment.from_wav(temp_wav_path)
                
                # Overlay it onto the silent canvas exactly at the timestamp it should be spoken
                final_audio = final_audio.overlay(spoken_segment, position=start_ms)
                
                # Clean up temp files
                os.remove(temp_tts_path)
                os.remove(temp_wav_path)
                
            except Exception as e:
                print(f"Failed to generate TTS for segment {idx}: {e}")
                
        # Export the final full-length dubbed track
        final_dubbed_path = os.path.join(self.temp_dir, f"{base_name}_dubbed_{target_language}.wav")
        final_audio.export(final_dubbed_path, format="wav")
        
        print(f"Dubbed audio created at: {final_dubbed_path}")
        return final_dubbed_path
