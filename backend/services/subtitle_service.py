import os

class SubtitleService:
    def __init__(self, output_dir="results"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def _format_time(self, seconds: float) -> str:
        """Converts seconds into SRT timestamp format: HH:MM:SS,mmm"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        milliseconds = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{milliseconds:03d}"

    def generate_srt(self, segments: list, base_name: str, language_code: str) -> str:
        """
        Creates an .srt file from a list of segments data.
        Segments format: [{'start': float, 'end': float, 'text': str}]
        """
        srt_path = os.path.join(self.output_dir, f"{base_name}_{language_code}.srt")
        
        with open(srt_path, "w", encoding="utf-8") as f:
            for index, segment in enumerate(segments, start=1):
                start_time = self._format_time(segment["start"])
                end_time = self._format_time(segment["end"])
                text = segment["text"]
                
                # Write to SRT format
                f.write(f"{index}\n")
                f.write(f"{start_time} --> {end_time}\n")
                f.write(f"{text}\n\n")
                
        print(f"Subtitles generated at: {srt_path}")
        return srt_path
