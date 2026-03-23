from deep_translator import GoogleTranslator

class TranslationService:
    def __init__(self):
        """Initializes the translation service."""
        pass

    def translate_text(self, text: str, target_language: str) -> str:
        """Translates a single string to the target language."""
        if not text or text.strip() == "":
            return text
            
        try:
            # GoogleTranslator expects language code, e.g., 'es', 'fr', 'hi'
            translator = GoogleTranslator(source='auto', target=target_language)
            return translator.translate(text)
        except Exception as e:
            print(f"Translation Error for text '{text}': {e}")
            return text

    def translate_audio_segments(self, segments: list, target_language: str) -> list:
        """Translates all text blocks in the audio segments list."""
        print(f"Translating {len(segments)} audio segments to '{target_language}'...")
        translated_segments = []
        for segment in segments:
            translated_text = self.translate_text(segment["text"], target_language)
            translated_segments.append({
                "start": segment["start"],
                "end": segment["end"],
                "text": translated_text
            })
        return translated_segments
        
    def translate_ocr_data(self, ocr_results: list, target_language: str) -> list:
        """Translates the text data detected by OCR per frame."""
        print(f"Translating {len(ocr_results)} OCR frames to '{target_language}'...")
        translated_ocr = []
        for frame_data in ocr_results:
            translated_frame_data = []
            for item in frame_data["frame_data"]:
                translated_text = self.translate_text(item["text"], target_language)
                translated_frame_data.append({
                    "text": translated_text,
                    "confidence": item["confidence"],
                    "bbox": item["bbox"]
                })
            translated_ocr.append({
                "timestamp": frame_data["timestamp"],
                "frame_data": translated_frame_data
            })
        return translated_ocr
