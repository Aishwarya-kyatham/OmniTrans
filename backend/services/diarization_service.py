import os
import json
from services.tts_service import TTSService

class DiarizationService:
    def __init__(self):
        self.tts_service = TTSService()

    def run_pyannote_diarization(self, audio_path: str) -> list:
        """
        Attempts pyannote.audio speaker diarization if installed and HF token is provided.
        Returns a list of speaker turns: [{'start': float, 'end': float, 'speaker': str}, ...]
        """
        hf_token = os.environ.get("HUGGINGFACE_TOKEN") or os.environ.get("HF_TOKEN")
        if not hf_token or not audio_path or not os.path.exists(audio_path):
            return None

        try:
            print("[Diarization] Running pyannote.audio speaker diarization...")
            from pyannote.audio import Pipeline
            pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=hf_token
            )
            diarization = pipeline(audio_path)
            
            speaker_turns = []
            for turn, _, speaker in diarization.itertracks(yield_label=True):
                # Standardize speaker label format to SPEAKER_00, SPEAKER_01, etc.
                label = speaker.upper()
                if not label.startswith("SPEAKER_"):
                    # Extract trailing integer if present or format label
                    import re
                    match = re.search(r'\d+', label)
                    spk_num = int(match.group()) if match else 0
                    label = f"SPEAKER_{spk_num:02d}"
                speaker_turns.append({
                    "start": turn.start,
                    "end": turn.end,
                    "speaker": label
                })
            print(f"[Diarization] Pyannote identified {len(set(t['speaker'] for t in speaker_turns))} speaker(s).")
            return speaker_turns
        except Exception as e:
            print(f"[Diarization Warning] Pyannote diarization skipped/failed ({e}). Using timestamp fallback.")
            return None

    def process_speaker_tags(self, segments: list, audio_path: str = None) -> list:
        """
        Processes segments and ensures every segment has a speaker tag.
        Uses pyannote speaker turns if available; otherwise uses pause & alternation heuristics.
        Assigns SPEAKER_00, SPEAKER_01, etc.
        """
        speaker_turns = self.run_pyannote_diarization(audio_path) if audio_path else None

        current_speaker = 0
        last_end = 0.0
        tagged_segments = []

        for idx, seg in enumerate(segments):
            speaker_tag = seg.get("speaker")

            if not speaker_tag and speaker_turns:
                # Find pyannote speaker turn with maximum overlap for this segment
                seg_start = seg.get("start", 0.0)
                seg_end = seg.get("end", seg_start + 1.0)
                
                best_speaker = None
                max_overlap = 0.0
                for turn in speaker_turns:
                    overlap_start = max(seg_start, turn["start"])
                    overlap_end = min(seg_end, turn["end"])
                    overlap = max(0.0, overlap_end - overlap_start)
                    if overlap > max_overlap:
                        max_overlap = overlap
                        best_speaker = turn["speaker"]
                
                if best_speaker:
                    speaker_tag = best_speaker

            # Fallback heuristic if speaker tag not assigned
            if not speaker_tag:
                start_time = seg.get("start", 0.0)
                # If there's a long pause (> 1.5 seconds) between segments, alternate speaker heuristic
                if idx > 0 and (start_time - last_end) > 1.5:
                    current_speaker = (current_speaker + 1) % 2

                speaker_tag = f"SPEAKER_{current_speaker:02d}"

            last_end = seg.get("end", 0.0)

            seg_copy = dict(seg)
            seg_copy["speaker"] = speaker_tag
            tagged_segments.append(seg_copy)

        return tagged_segments

    def get_default_voice_map(self, segments: list, target_language: str) -> dict:
        """
        Generates a speaker-to-voice mapping for all unique speakers found in segments.
        Maps SPEAKER_00 to first voice (e.g. male), SPEAKER_01 to second voice (e.g. female), etc.
        """
        unique_speakers = sorted(list(set(seg.get("speaker", "SPEAKER_00") for seg in segments)))
        available_voices = self.tts_service.get_available_voices(target_language)

        voice_map = {}
        for idx, speaker in enumerate(unique_speakers):
            voice_entry = available_voices[idx % len(available_voices)]
            voice_map[speaker] = voice_entry["id"]

        return voice_map

    def save_voice_map(self, base_name: str, voice_map: dict, target_language: str = None):
        """Saves voice mapping configuration to results/{base_name}_{lang}_voice_map.json."""
        os.makedirs("results", exist_ok=True)
        lang_suffix = f"_{target_language}" if target_language else ""
        path = os.path.join("results", f"{base_name}{lang_suffix}_voice_map.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(voice_map, f, indent=4)
        print(f"Saved voice map to {path}")

    def load_voice_map(self, base_name: str, segments: list, target_language: str) -> dict:
        """Loads language-specific voice map if saved, or generates and saves default voice map."""
        lang_suffix = f"_{target_language}" if target_language else ""
        path = os.path.join("results", f"{base_name}{lang_suffix}_voice_map.json")
        if os.path.exists(path):
            saved = json.load(open(path, "r", encoding="utf-8"))
            # Validate it contains valid voice IDs for this language
            available_ids = {v["id"] for v in self.tts_service.get_available_voices(target_language)}
            if any(v in available_ids for v in saved.values()):
                return saved
        
        # Generate default for this language
        default_map = self.get_default_voice_map(segments, target_language)
        self.save_voice_map(base_name, default_map, target_language)
        return default_map

