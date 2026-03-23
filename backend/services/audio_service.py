from faster_whisper import WhisperModel
import json
import os

class AudioService:
    def __init__(self, model_size="tiny", device="cpu", compute_type="int8"):
        """
        Initializes the Faster-Whisper model.
        Using 'tiny' model and 'cpu' device for speed on local setups. 
        Can be upgraded to 'small'/'base' or 'cuda' for GPU later.
        """
        print(f"Loading Whisper Model '{model_size}'...")
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
        print("Whisper Model Loaded.")

    def transcribe(self, audio_path: str) -> dict:
        """
        Transcribes the given audio `.wav` file.
        Returns a dictionary containing the detected language and the segmented text data.
        """
        print(f"Transcribing audio file: {audio_path}")
        segments, info = self.model.transcribe(audio_path, beam_size=5)

        print("Detected language '%s' with probability %f" % (info.language, info.language_probability))

        transcript_data = []
        for segment in segments:
            transcript_data.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip()
            })
            
        return {
            "source_language": info.language,
            "segments": transcript_data
        }
