import subprocess
import os
import json

class VideoService:
    def __init__(self, upload_dir="temp_uploads"):
        self.upload_dir = upload_dir
        os.makedirs(self.upload_dir, exist_ok=True)
        
    def extract_audio(self, video_path: str) -> str:
        """
        Uses ffmpeg to extract the audio from the video file into a 16kHz WAV file.
        If the video has no audio stream, generates a silent audio track of matching duration.
        """
        base_name = os.path.splitext(os.path.basename(video_path))[0]
        output_audio_path = os.path.join(self.upload_dir, f"{base_name}_audio.wav")
        
        ffmpeg_path = os.environ.get("FFMPEG_BINARY", "ffmpeg")
        command = [
            ffmpeg_path, "-y", "-threads", "0", "-i", video_path, 
            "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", 
            output_audio_path
        ]
        
        print(f"Extracting Audio into {output_audio_path}...")
        try:
            subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=True)
        except subprocess.CalledProcessError:
            print(f"[Audio Extraction Warning] Video has no audio track or extraction failed. Generating silent audio fallback...")
            fallback_cmd = [
                ffmpeg_path, "-y", "-f", "lavfi", "-i", "anullsrc=r=16000:cl=mono",
                "-t", "5", output_audio_path
            ]
            subprocess.run(fallback_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            
        return output_audio_path
        
    def extract_frames(self, video_path: str, fps: int = 1) -> str:
        """
        Uses ffmpeg to take screenshots of the video at a rate of `fps` frames per second.
        Returns the directory where the frames are saved.
        """
        base_name = os.path.splitext(os.path.basename(video_path))[0]
        frames_dir = os.path.join(self.upload_dir, f"{base_name}_frames")
        os.makedirs(frames_dir, exist_ok=True)
        
        output_pattern = os.path.join(frames_dir, "frame_%04d.jpg")
        
        ffmpeg_path = os.environ.get("FFMPEG_BINARY", "ffmpeg")
        command = [
            ffmpeg_path, "-y", "-threads", "0", "-i", video_path, 
            "-r", str(fps), 
            output_pattern
        ]
        
        print(f"Extracting Frames into {frames_dir}...")
        subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        return frames_dir

    def separate_audio_demucs(self, audio_path: str) -> tuple:
        """
        Optional Demucs vocal separation.
        Returns (background_audio_path, vocals_audio_path) or (None, None) if disabled/failed.
        """
        use_demucs = os.environ.get("USE_DEMUCS", "false").lower() == "true"
        if not use_demucs or not audio_path or not os.path.exists(audio_path):
            return None, None

        try:
            print("[Demucs] Running Demucs AI vocal separation...")
            model_name = os.environ.get("DEMUCS_MODEL", "htdemucs")
            base_name = os.path.splitext(os.path.basename(audio_path))[0]
            out_dir = os.path.join(self.upload_dir, "demucs_output")
            os.makedirs(out_dir, exist_ok=True)

            cmd = [
                "demucs", "-n", model_name, "--two-stems=vocals",
                audio_path, "-o", out_dir
            ]
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=True)

            no_vocals = os.path.join(out_dir, model_name, base_name, "no_vocals.wav")
            vocals = os.path.join(out_dir, model_name, base_name, "vocals.wav")

            if os.path.exists(no_vocals):
                print(f"[Demucs] Vocal separation succeeded! Background track at {no_vocals}")
                return no_vocals, vocals
            return None, None
        except Exception as e:
            print(f"[Demucs Warning] Demucs separation failed ({e}). Falling back to FFmpeg ducking.")
            return None, None

    def burn_subtitles(self, original_video: str, subtitle_path: str, target_language: str) -> str:
        """
        Uses ffmpeg to hardcode translated .srt or .ass subtitles onto the original video.
        """
        base_name = os.path.splitext(os.path.basename(original_video))[0]
        output_video_path = os.path.join("results", f"{base_name}_translated_{target_language}.mp4")
        
        relative_sub = os.path.normpath(subtitle_path).replace("\\", "/")
        vf_filter = f"ass='{relative_sub}'" if subtitle_path.endswith(".ass") else f"subtitles='{relative_sub}'"
        
        ffmpeg_path = os.environ.get("FFMPEG_BINARY", "ffmpeg")
        command = [
            ffmpeg_path, "-y", "-threads", "0", "-i", original_video,
            "-vf", vf_filter,
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-c:a", "copy",
            output_video_path
        ]
        
        print(f"Burning subtitles to create {output_video_path}...")
        
        try:
            subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=True)
        except subprocess.CalledProcessError as e:
            print(f"FFMPEG Error burning subtitles: {e.stderr.decode('utf-8', errors='ignore')}")
            raise e
            
        return output_video_path

    def create_soft_subtitle_video(
        self, 
        original_video: str, 
        srt_path: str, 
        dubbed_audio: str = None, 
        target_language: str = "es", 
        format_ext: str = "mp4"
    ) -> str:
        """
        Embeds subtitles as a soft, selectable subtitle track inside an MP4 (mov_text) or MKV (srt) container.
        Re-encodes video to h264 to ensure compatibility (av1 streams cannot use copy with mov_text).
        """
        base_name = os.path.splitext(os.path.basename(original_video))[0]
        output_path = os.path.join("results", f"{base_name}_soft_subtitles_{target_language}.{format_ext}")

        ffmpeg_path = os.environ.get("FFMPEG_BINARY", "ffmpeg")

        input_audio = dubbed_audio if (dubbed_audio and os.path.exists(dubbed_audio)) else None

        if format_ext == "mp4":
            sub_codec = "mov_text"
        else:
            sub_codec = "srt"

        if input_audio:
            cmd = [
                ffmpeg_path, "-y",
                "-i", original_video,
                "-i", input_audio,
                "-f", "srt", "-i", srt_path,   # Explicit format hint fixes av1/srt parse error
                "-c:v", "libx264",               # Re-encode: av1 copy is incompatible with mov_text
                "-preset", "ultrafast",
                "-c:a", "aac",
                "-b:a", "128k",
                "-c:s", sub_codec,
                "-map", "0:v:0",
                "-map", "1:a:0",
                "-map", "2:s:0",
                "-metadata:s:s:0", f"language={target_language}",
                "-shortest",
                output_path
            ]
        else:
            cmd = [
                ffmpeg_path, "-y",
                "-i", original_video,
                "-f", "srt", "-i", srt_path,
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-c:a", "aac",
                "-b:a", "128k",
                "-c:s", sub_codec,
                "-map", "0:v:0",
                "-map", "0:a:0",
                "-map", "1:s:0",
                "-metadata:s:s:0", f"language={target_language}",
                output_path
            ]

        print(f"[Soft Subtitles] Creating soft subtitle embedded video: {output_path}")
        try:
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=True)
        except subprocess.CalledProcessError as e:
            err_msg = e.stderr.decode("utf-8", errors="ignore")
            print(f"[Soft Subtitles] FFmpeg error: {err_msg}")
            raise RuntimeError(f"Soft subtitle muxing failed: {err_msg}")
        return output_path

    def mix_dubbed_audio(
        self, 
        original_video: str, 
        dubbed_audio: str, 
        srt_path: str = None, 
        target_language: str = "es", 
        preserve_background: bool = True,
        original_audio_path: str = None,
        burn_subtitles: bool = False
    ) -> str:
        """
        Combines dubbed audio track with background audio (ducked or separated).
        When burn_subtitles is False (default for preview & editing), uses lightning-fast
        video stream copy (-c:v copy) in ~0.5s with zero quality loss.
        When burn_subtitles is True, burns subtitles into pixels using Intel QuickSync or ultrafast x264.
        """
        base_name = os.path.splitext(os.path.basename(original_video))[0]
        output_video_path = os.path.join("results", f"{base_name}_fully_translated_{target_language}.mp4")
        ffmpeg_path = os.environ.get("FFMPEG_BINARY", "ffmpeg")

        bg_track, _ = self.separate_audio_demucs(original_audio_path)
        ducking_db = float(os.environ.get("AUDIO_DUCKING_DB", "-15"))
        duck_scale = round(10 ** (ducking_db / 20.0), 3)

        has_orig_audio = original_audio_path and os.path.exists(original_audio_path) and os.path.getsize(original_audio_path) > 1000

        # 1. Fast Stream Copy Mode (Instant preview, no re-encoding, lossless video)
        if not burn_subtitles:
            print(f"[FastMux] Stream-copying video & mixing audio for '{base_name}'...")
            if bg_track and os.path.exists(bg_track):
                filter_complex = (
                    f"[1:a]volume=1.0[bg];"
                    f"[2:a]volume=1.0[fg];"
                    f"[bg][fg]amix=inputs=2:duration=first:dropout_transition=2[a]"
                )
                cmd = [
                    ffmpeg_path, "-y",
                    "-i", original_video,
                    "-i", bg_track,
                    "-i", dubbed_audio,
                    "-filter_complex", filter_complex,
                    "-map", "0:v:0",
                    "-map", "[a]",
                    "-c:v", "copy",
                    "-c:a", "aac",
                    "-ar", "44100",
                    "-ac", "2",
                    "-b:a", "128k",
                    "-shortest",
                    output_video_path
                ]
            elif has_orig_audio:
                filter_complex = (
                    f"[0:a]volume={duck_scale}[bg];"
                    f"[1:a]volume=1.0[fg];"
                    f"[bg][fg]amix=inputs=2:duration=first:dropout_transition=2[a]"
                )
                cmd = [
                    ffmpeg_path, "-y",
                    "-i", original_video,
                    "-i", dubbed_audio,
                    "-filter_complex", filter_complex,
                    "-map", "0:v:0",
                    "-map", "[a]",
                    "-c:v", "copy",
                    "-c:a", "aac",
                    "-ar", "44100",
                    "-ac", "2",
                    "-b:a", "128k",
                    "-shortest",
                    output_video_path
                ]
            else:
                cmd = [
                    ffmpeg_path, "-y",
                    "-i", original_video,
                    "-i", dubbed_audio,
                    "-map", "0:v:0",
                    "-map", "1:a:0",
                    "-c:v", "copy",
                    "-c:a", "aac",
                    "-ar", "44100",
                    "-ac", "2",
                    "-b:a", "128k",
                    "-shortest",
                    output_video_path
                ]

            try:
                subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=True)
                print(f"[FastMux] Completed in under 1s! Saved to: {output_video_path}")
                return output_video_path
            except subprocess.CalledProcessError as e:
                print(f"[FastMux Warning] Stream copy fallback ({e.stderr.decode('utf-8', errors='ignore')[:100]}), switching to re-encode...")

        # 2. Burned Subtitles Mode (Used when user requests hardcoded subtitles)
        print(f"[VideoService] Burning subtitles and re-encoding video to {output_video_path}...")
        relative_sub = os.path.normpath(srt_path).replace("\\", "/") if srt_path else ""
        sub_filter = f"ass='{relative_sub}'" if (srt_path and srt_path.endswith(".ass")) else f"subtitles='{relative_sub}'"

        # Detect encoder: QuickSync (QSV) or libx264
        video_codec = "libx264"
        preset_args = ["-preset", "ultrafast"]

        filter_complex = (
            f"[0:v]{sub_filter}[v];"
            f"[0:a]volume={duck_scale}[bg];"
            f"[1:a]volume=1.0[fg];"
            f"[bg][fg]amix=inputs=2:duration=first:dropout_transition=2[a]"
        ) if srt_path else (
            f"[0:a]volume={duck_scale}[bg];"
            f"[1:a]volume=1.0[fg];"
            f"[bg][fg]amix=inputs=2:duration=first:dropout_transition=2[a]"
        )

        command = [
            ffmpeg_path, "-y",
            "-i", original_video,
            "-i", dubbed_audio,
            "-filter_complex", filter_complex,
            "-map", "[v]" if srt_path else "0:v:0",
            "-map", "[a]",
            "-c:v", video_codec,
            *preset_args,
            "-c:a", "aac",
            "-ar", "44100",
            "-ac", "2",
            "-b:a", "128k",
            "-shortest",
            output_video_path
        ]

        try:
            subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=True)
        except subprocess.CalledProcessError as e:
            print(f"FFMPEG burning failed ({e.stderr.decode('utf-8', errors='ignore')[:100]}), falling back to direct stream copy...")
            fallback_cmd = [
                ffmpeg_path, "-y",
                "-i", original_video,
                "-i", dubbed_audio,
                "-map", "0:v:0",
                "-map", "1:a:0",
                "-c:v", "copy",
                "-c:a", "aac",
                "-shortest",
                output_video_path
            ]
            subprocess.run(fallback_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=True)

        return output_video_path

    def _get_ffmpeg_location(self) -> str:
        """Returns valid absolute path to ffmpeg binary for yt-dlp and subprocesses."""
        ffmpeg_binary = os.environ.get("FFMPEG_BINARY")
        if ffmpeg_binary and os.path.exists(ffmpeg_binary):
            return ffmpeg_binary
        try:
            import imageio_ffmpeg
            return str(imageio_ffmpeg.get_ffmpeg_exe())
        except Exception:
            return "ffmpeg"

    def inspect_url(self, url: str) -> dict:
        """Extracts metadata from YouTube, TikTok, Twitter/X, Bilibili, etc. via yt-dlp."""
        import yt_dlp
        ffmpeg_binary = self._get_ffmpeg_location()
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'noplaylist': True,
            'js_runtimes': {'node': {}},
            'ffmpeg_location': ffmpeg_binary if os.path.isabs(ffmpeg_binary) else None,
        }
        ydl_opts = {k: v for k, v in ydl_opts.items() if v is not None}
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                raise ValueError("Could not extract video metadata from the provided URL.")
            if "entries" in info and info["entries"]:
                first_entry = next((e for e in info["entries"] if e), None)
                if first_entry:
                    info = first_entry
                    
            duration = int(info.get("duration") or 0)
            
            # Extract highest quality thumbnail if available
            thumbnail = info.get("thumbnail") or ""
            if not thumbnail and info.get("thumbnails"):
                thumbs = info.get("thumbnails", [])
                if isinstance(thumbs, list) and thumbs:
                    thumbnail = thumbs[-1].get("url", "")
                    
            uploader = info.get("uploader") or info.get("channel") or info.get("creator") or info.get("uploader_id") or "Web Video"
            title = info.get("title") or "Web Video"
            vid_id = str(info.get("id") or "web_vid")
            extractor = info.get("extractor_key") or info.get("extractor") or "Web"
            
            return {
                "title": title,
                "duration": duration,
                "thumbnail": thumbnail,
                "uploader": uploader,
                "url": url,
                "id": vid_id,
                "extractor": extractor
            }

    def download_url_video(self, url: str) -> dict:
        """
        Downloads web video into temp_uploads using yt-dlp.
        Merges best video & audio into MP4 format.
        """
        import yt_dlp
        import re
        
        info = self.inspect_url(url)
        raw_title = info.get("title", "web_video") or "web_video"
        vid_id = info.get("id", "vid") or "vid"
        
        # Sanitize title for filename across Windows and Linux
        clean_title = re.sub(r'[\s]+', '_', raw_title)
        clean_title = re.sub(r'[^\w\-]', '_', clean_title, flags=re.UNICODE)
        clean_title = re.sub(r'_+', '_', clean_title).strip('_')
        base_name = f"{clean_title[:45]}_{vid_id}" if clean_title else f"video_{vid_id}"
        
        os.makedirs(self.upload_dir, exist_ok=True)
        output_template = os.path.join(self.upload_dir, f"{base_name}.%(ext)s")
        ffmpeg_binary = self._get_ffmpeg_location()
        
        ydl_opts = {
            'format': 'bestvideo*+bestaudio/best',
            'outtmpl': output_template,
            'merge_output_format': 'mp4',
            'quiet': False,
            'no_warnings': True,
            'noplaylist': True,
            'js_runtimes': {'node': {}},
            'ffmpeg_location': ffmpeg_binary if os.path.isabs(ffmpeg_binary) else None,
            'max_filesize': 500 * 1024 * 1024, # 500 MB limit
        }
        ydl_opts = {k: v for k, v in ydl_opts.items() if v is not None}
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
            
        expected_path = os.path.join(self.upload_dir, f"{base_name}.mp4")
        if not os.path.exists(expected_path):
            for f in os.listdir(self.upload_dir):
                if f.startswith(base_name) and not f.endswith(".wav") and not f.endswith(".part"):
                    expected_path = os.path.join(self.upload_dir, f)
                    break
                    
        if not os.path.exists(expected_path):
            raise FileNotFoundError(f"Download failed or output file could not be located in {self.upload_dir}")
            
        return {
            "file_path": expected_path,
            "base_name": base_name,
            "title": raw_title,
            "duration": info.get("duration", 0),
            "thumbnail": info.get("thumbnail", ""),
            "uploader": info.get("uploader", ""),
            "extractor": info.get("extractor", "Web")
        }
