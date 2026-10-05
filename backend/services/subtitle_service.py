import os

class SubtitleService:
    def __init__(self, output_dir="results"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def _format_time_srt(self, seconds: float) -> str:
        """Converts seconds into SRT timestamp format: HH:MM:SS,mmm"""
        seconds = max(0.0, float(seconds))
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        milliseconds = int(round((seconds % 1) * 1000))
        if milliseconds >= 1000:
            secs += 1
            milliseconds = 0
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{milliseconds:03d}"

    def _format_time_vtt(self, seconds: float) -> str:
        """Converts seconds into WebVTT timestamp format: HH:MM:SS.mmm"""
        seconds = max(0.0, float(seconds))
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        milliseconds = int(round((seconds % 1) * 1000))
        if milliseconds >= 1000:
            secs += 1
            milliseconds = 0
        return f"{hours:02d}:{minutes:02d}:{secs:02d}.{milliseconds:03d}"

    def _format_time_ass(self, seconds: float) -> str:
        """Converts seconds into ASS timestamp format: H:MM:SS.cs (centiseconds)"""
        seconds = max(0.0, float(seconds))
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        centiseconds = int(round((seconds % 1) * 100))
        if centiseconds >= 100:
            secs += 1
            centiseconds = 0
        return f"{hours}:{minutes:02d}:{secs:02d}.{centiseconds:02d}"

    def validate_segments(self, segments: list) -> list:
        """
        Validates subtitle segments:
        - Ensures numeric id, start, end, original_text, translated_text
        - Enforces start >= 0 and end > start
        - Sorts segments chronologically by start time
        - Safely resolves overlaps if end > next_start
        """
        validated = []
        for idx, seg in enumerate(segments, start=1):
            start = max(0.0, float(seg.get("start", 0.0)))
            end = float(seg.get("end", start + 1.0))
            if end <= start:
                end = start + 0.5
                
            orig_text = str(seg.get("original_text", seg.get("text", ""))).strip()
            trans_text = str(seg.get("translated_text", seg.get("text", ""))).strip()
            words = seg.get("words", [])
            
            validated.append({
                "id": seg.get("id", idx),
                "start": round(start, 3),
                "end": round(end, 3),
                "original_text": orig_text,
                "translated_text": trans_text,
                "text": trans_text or orig_text,
                "words": words
            })

        validated.sort(key=lambda s: s["start"])

        for i in range(len(validated)):
            validated[i]["id"] = i + 1
            if i < len(validated) - 1:
                if validated[i]["end"] > validated[i+1]["start"]:
                    if validated[i+1]["start"] > validated[i]["start"]:
                        validated[i]["end"] = validated[i+1]["start"]
                    else:
                        validated[i+1]["start"] = validated[i]["end"]

        return validated

    def generate_srt(self, segments: list, base_name: str, language_code: str) -> str:
        """Creates an .srt file from a list of segments data."""
        validated_segments = self.validate_segments(segments)
        srt_path = os.path.join(self.output_dir, f"{base_name}_{language_code}.srt")
        
        with open(srt_path, "w", encoding="utf-8") as f:
            for index, segment in enumerate(validated_segments, start=1):
                start_time = self._format_time_srt(segment["start"])
                end_time = self._format_time_srt(segment["end"])
                text = segment["translated_text"] or segment["original_text"] or segment.get("text", "")
                
                f.write(f"{index}\n")
                f.write(f"{start_time} --> {end_time}\n")
                f.write(f"{text}\n\n")
                
        print(f"SRT Subtitles generated at: {srt_path}")
        return srt_path

    def generate_vtt(self, segments: list, base_name: str, language_code: str) -> str:
        """Creates a .vtt (WebVTT) file from a list of segments data."""
        validated_segments = self.validate_segments(segments)
        vtt_path = os.path.join(self.output_dir, f"{base_name}_{language_code}.vtt")
        
        with open(vtt_path, "w", encoding="utf-8") as f:
            f.write("WEBVTT\n\n")
            for index, segment in enumerate(validated_segments, start=1):
                start_time = self._format_time_vtt(segment["start"])
                end_time = self._format_time_vtt(segment["end"])
                text = segment["translated_text"] or segment["original_text"] or segment.get("text", "")
                
                f.write(f"{index}\n")
                f.write(f"{start_time} --> {end_time}\n")
                f.write(f"{text}\n\n")
                
        print(f"VTT Subtitles generated at: {vtt_path}")
        return vtt_path

    def generate_ass(self, segments: list, base_name: str, language_code: str, style_preset: str = "capcut") -> str:
        """
        Creates an Advanced SubStation Alpha (.ass) file with Karaoke timing & custom presets.
        Presets: capcut, neon, minimal, pop, classic
        """
        validated_segments = self.validate_segments(segments)
        ass_path = os.path.join(self.output_dir, f"{base_name}_{language_code}_{style_preset}.ass")

        # Define ASS Style configurations (ASS colors are in &HAABBGGRR format)
        styles = {
            "capcut": {
                "font": "Arial", "fontsize": 24,
                "primary": "&H00FFFFFF",      # White
                "secondary": "&H0000FFFF",    # Yellow highlight
                "outline": "&H00000000",      # Black border
                "backcolor": "&H80000000",    # Shadow
                "bold": 1, "outline_w": 2, "shadow_w": 2, "alignment": 2
            },
            "neon": {
                "font": "Impact", "fontsize": 26,
                "primary": "&H00FFFF00",      # Cyan
                "secondary": "&H000000FF",    # Bright Red
                "outline": "&H00000000",      # Black border
                "backcolor": "&H60000000",    # Dark box
                "bold": 1, "outline_w": 3, "shadow_w": 3, "alignment": 2
            },
            "minimal": {
                "font": "Helvetica", "fontsize": 22,
                "primary": "&H00FFFFFF",      # Crisp White
                "secondary": "&H00CCCCCC",    # Soft Grey
                "outline": "&H00000000",      # Black
                "backcolor": "&HA0000000",    # Semi-transparent box
                "bold": 0, "outline_w": 1, "shadow_w": 1, "alignment": 2
            },
            "pop": {
                "font": "Trebuchet MS", "fontsize": 25,
                "primary": "&H00FF00FF",      # Magenta/Pink
                "secondary": "&H0000FFFF",    # Yellow
                "outline": "&H00000000",      # Black
                "backcolor": "&H50000000",
                "bold": 1, "outline_w": 2, "shadow_w": 2, "alignment": 2
            },
            "classic": {
                "font": "Times New Roman", "fontsize": 22,
                "primary": "&H00FFFFFF",
                "secondary": "&H0000FFFF",
                "outline": "&H00000000",
                "backcolor": "&H00000000",
                "bold": 0, "outline_w": 2, "shadow_w": 1, "alignment": 2
            }
        }

        st = styles.get(style_preset.lower(), styles["capcut"])

        header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{st['font']},{st['fontsize']},{st['primary']},{st['secondary']},{st['outline']},{st['backcolor']},{st['bold']},0,0,0,100,100,0,0,1,{st['outline_w']},{st['shadow_w']},{st['alignment']},10,10,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

        with open(ass_path, "w", encoding="utf-8") as f:
            f.write(header)
            for seg in validated_segments:
                start_str = self._format_time_ass(seg["start"])
                end_str = self._format_time_ass(seg["end"])
                text = seg["translated_text"] or seg["original_text"] or seg.get("text", "")
                
                words = seg.get("words", [])
                if words:
                    karaoke_text = ""
                    for w in words:
                        w_start = float(w.get("start", seg["start"]))
                        w_end = float(w.get("end", seg["end"]))
                        dur_cs = int(round((w_end - w_start) * 100))
                        w_word = str(w.get("word", "")).strip()
                        karaoke_text += f"{{\\kf{max(5, dur_cs)}}}{w_word} "
                    dialogue_text = karaoke_text.strip()
                else:
                    words_list = text.split()
                    if words_list and (seg["end"] > seg["start"]):
                        tot_duration = seg["end"] - seg["start"]
                        per_word_dur = int(round((tot_duration / len(words_list)) * 100))
                        dialogue_text = " ".join([f"{{\\kf{max(10, per_word_dur)}}}{w}" for w in words_list])
                    else:
                        dialogue_text = text

                f.write(f"Dialogue: 0,{start_str},{end_str},Default,,0,0,0,,{dialogue_text}\n")

        print(f"ASS Karaoke Subtitles generated at: {ass_path}")
        return ass_path
