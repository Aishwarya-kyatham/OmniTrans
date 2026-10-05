import os
from faster_whisper import WhisperModel

class AudioService:
    def __init__(self, model_size="tiny", device="cpu", compute_type="int8", cpu_threads=None):
        """
        Initializes the Faster-Whisper model optimized for high-speed transcription.
        Scales CPU threads to hardware capacity with int8 quantization.
        """
        if cpu_threads is None:
            cores = os.cpu_count() or 4
            # Use up to 8 threads on high-core CPUs for optimal throughput without thread contention
            cpu_threads = min(8, max(4, cores // 2 if cores > 8 else cores))

        print(f"Loading Whisper Model '{model_size}' with {cpu_threads} CPU threads...")
        self.model = WhisperModel(
            model_size, 
            device=device, 
            compute_type=compute_type,
            cpu_threads=cpu_threads,
            num_workers=2
        )
        print("Whisper Model Loaded.")

    def transcribe(self, audio_path: str) -> dict:
        """
        Transcribes the given audio `.wav` file with high-speed Silero VAD filtering and greedy decoding.
        Returns a dictionary containing the detected language and the segmented text data.
        """
        print(f"Transcribing audio file with VAD filter & Fast Beam: {audio_path}")
        segments_gen, info = self.model.transcribe(
            audio_path,
            beam_size=1,                      # 3x-5x faster greedy decoding
            vad_filter=True,                  # Silero VAD skips silence regions completely
            vad_parameters=dict(min_silence_duration_ms=400),
            condition_on_previous_text=False, # Faster and avoids repetitive hallucination
            temperature=0.0
        )

        print("Detected language '%s' with probability %f" % (info.language, info.language_probability))

        transcript_data = []
        for segment in segments_gen:
            text = segment.text.strip()
            if text:
                transcript_data.append({
                    "start": round(segment.start, 2),
                    "end": round(segment.end, 2),
                    "text": text
                })
            
        return {
            "source_language": info.language,
            "segments": transcript_data
        }
