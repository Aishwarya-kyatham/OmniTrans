import subprocess
import os
import json

class VideoService:
    def __init__(self, upload_dir="temp_uploads"):
        self.upload_dir = upload_dir
        
    def extract_audio(self, video_path: str) -> str:
        """
        Uses ffmpeg to extract the audio from the video file into a 16kHz WAV file.
        16kHz is the optimal sample rate for whisper models.
        """
        base_name = os.path.splitext(os.path.basename(video_path))[0]
        output_audio_path = os.path.join(self.upload_dir, f"{base_name}_audio.wav")
        
        ffmpeg_path = os.environ.get("FFMPEG_BINARY", "ffmpeg")
        # -y (overwrite), -i (input), -vn (no video), -acodec (audio codec), -ar (audio sample rate), -ac (audio channels)
        command = [
            ffmpeg_path, "-y", "-i", video_path, 
            "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", 
            output_audio_path
        ]
        
        print(f"Extracting Audio into {output_audio_path}...")
        subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return output_audio_path
        
    def extract_frames(self, video_path: str, fps: int = 1) -> str:
        """
        Uses ffmpeg to take screenshots of the video at a rate of `fps` frames per second.
        Returns the directory where the frames are saved.
        """
        base_name = os.path.splitext(os.path.basename(video_path))[0]
        frames_dir = os.path.join(self.upload_dir, f"{base_name}_frames")
        os.makedirs(frames_dir, exist_ok=True)
        
        # %04d.jpg formats output as 0001.jpg, 0002.jpg
        output_pattern = os.path.join(frames_dir, "frame_%04d.jpg")
        
        ffmpeg_path = os.environ.get("FFMPEG_BINARY", "ffmpeg")
        # -r fps overrides the origin framerate to only export X frames a second
        command = [
            ffmpeg_path, "-y", "-i", video_path, 
            "-r", str(fps), 
            output_pattern
        ]
        
        print(f"Extracting Frames into {frames_dir}...")
        subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return frames_dir

    def burn_subtitles(self, original_video: str, srt_path: str, target_language: str) -> str:
        """
        Uses ffmpeg to hardcode the translated .srt subtitles onto the original video.
        """
        base_name = os.path.splitext(os.path.basename(original_video))[0]
        output_video_path = os.path.join("results", f"{base_name}_translated_{target_language}.mp4")
        
        # Need to fix windows paths for ffmpeg subtitles filter (escape colons and slashes)
        # e.g., c:\path\to\file.srt needs to be formatted carefully for the -vf subtitles filter.
        # But a simpler way is to just relative path it from the current working directory.
        relative_srt = os.path.normpath(srt_path).replace("\\", "/")
        
        ffmpeg_path = os.environ.get("FFMPEG_BINARY", "ffmpeg")
        command = [
            ffmpeg_path, "-y", "-i", original_video,
            "-vf", f"subtitles={relative_srt}",
            "-c:a", "copy", # keep original audio since we are not dubbing yet
            output_video_path
        ]
        
        print(f"Burning subtitles to create {output_video_path}...")
        
        try:
            subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=True)
        except subprocess.CalledProcessError as e:
            print(f"FFMPEG Error burning subtitles: {e.stderr.decode('utf-8')}")
            raise e
            
        return output_video_path

    def mix_dubbed_audio(self, original_video: str, dubbed_audio: str, srt_path: str, target_language: str) -> str:
        """
        Uses ffmpeg to replace the original audio track with our new dubbed audio track,
        while also burning the translated subtitles.
        """
        base_name = os.path.splitext(os.path.basename(original_video))[0]
        output_video_path = os.path.join("results", f"{base_name}_fully_translated_{target_language}.mp4")
        
        relative_srt = os.path.normpath(srt_path).replace("\\", "/")
        
        # -map 0:v (take video from first input)
        # -map 1:a (take audio from second input)
        ffmpeg_path = os.environ.get("FFMPEG_BINARY", "ffmpeg")
        command = [
            ffmpeg_path, "-y", 
            "-i", original_video, 
            "-i", dubbed_audio,
            "-vf", f"subtitles={relative_srt}",
            "-c:v", "libx264", 
            "-preset", "ultrafast", # SPEEDUP: Trade compression efficiency for immense speed
            "-c:a", "aac",     
            "-ar", "44100",    # Force universal browser sample rate
            "-ac", "2",        # Force stereo channel format
            "-b:a", "128k",    # Ensure standard bit rate
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-shortest",       # Cut to the shortest stream if durations mismatch slightly
            output_video_path
        ]
        
        print(f"Mixing dubbed audio and burning subtitles to create {output_video_path}...")
        
        try:
            subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=True)
        except subprocess.CalledProcessError as e:
            print(f"FFMPEG Error mixing audio: {e.stderr.decode('utf-8')}")
            raise e
            
        return output_video_path

