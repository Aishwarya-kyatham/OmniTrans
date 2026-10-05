import os
import json
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

MYMEMORY_LOCALE_MAP = {
    "es": "es-ES",
    "en": "en-US",
    "fr": "fr-FR",
    "de": "de-DE",
    "it": "it-IT",
    "pt": "pt-PT",
    "hi": "hi-IN",
    "ja": "ja-JP",
    "zh": "zh-CN",
    "zh-cn": "zh-CN",
    "zh-tw": "zh-TW",
    "ru": "ru-RU",
    "ar": "ar-SA",
    "ko": "ko-KR",
    "nl": "nl-NL",
    "tr": "tr-TR",
    "pl": "pl-PL",
    "uk": "uk-UA",
    "sv": "sv-SE",
    "id": "id-ID",
    "vi": "vi-VN",
}

# M2M-100 language codes (inspired by davy1ex/videoTranslator)
M2M100_LANG_CODES = {
    "en": "en", "es": "es", "fr": "fr", "de": "de", "hi": "hi",
    "ja": "ja", "zh": "zh", "ru": "ru", "ar": "ar", "pt": "pt",
    "it": "it", "ko": "ko", "nl": "nl", "tr": "tr", "pl": "pl",
    "uk": "uk", "sv": "sv", "id": "id", "vi": "vi"
}

class TranslationService:
    def __init__(self):
        """Initializes the high-speed translation service with memory caching and multi-engine support."""
        self._cache = {}
        self._m2m_pipeline = None

    def _translate_via_m2m100(self, text: str, target_language: str, source_language: str = "en") -> str:
        """
        Translates text using Facebook's M2M-100 offline neural translation model
        (inspired by davy1ex/videoTranslator).
        """
        if self._m2m_pipeline is None:
            print("[TranslationService] Loading local M2M-100 model (facebook/m2m100_418M)...")
            from transformers import pipeline
            self._m2m_pipeline = pipeline("translation", model="facebook/m2m100_418M")

        src_lang = M2M100_LANG_CODES.get(source_language.lower().split("-")[0], "en")
        tgt_lang = M2M100_LANG_CODES.get(target_language.lower().split("-")[0], "es")

        result = self._m2m_pipeline(text, src_lang=src_lang, tgt_lang=tgt_lang)
        if result and len(result) > 0:
            return result[0].get("translation_text", "").strip()
        raise ValueError("Empty output from M2M-100")

    def _translate_via_gtx(self, text: str, target_language: str) -> str:
        """Translates text using Google's direct neural endpoint (sub-second response)."""
        target = target_language.lower().split("-")[0] if "-" not in target_language else target_language
        q = urllib.parse.quote(text)
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl={target}&dt=t&q={q}"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        )
        with urllib.request.urlopen(req, timeout=6) as res:
            data = json.loads(res.read().decode("utf-8"))
            if data and data[0]:
                translated = "".join([item[0] for item in data[0] if item and item[0]])
                if translated.strip():
                    return translated.strip()
        raise ValueError("Empty translation from GTX")

    def _translate_via_deep_translator(self, text: str, target_language: str) -> str:
        """Fallback translation using deep-translator with locale mapping."""
        from deep_translator import GoogleTranslator, MyMemoryTranslator
        try:
            return GoogleTranslator(source="auto", target=target_language).translate(text)
        except Exception:
            # Map short code to valid locale for MyMemory
            lang_key = target_language.lower()
            target_locale = MYMEMORY_LOCALE_MAP.get(lang_key, target_language)
            fallback = MyMemoryTranslator(source="auto", target=target_locale)
            return fallback.translate(text)

    def translate_text(self, text: str, target_language: str, source_language: str = "en") -> str:
        """Translates a single string to the target language with robust cache & fallback."""
        if not text or not text.strip():
            return text

        cache_key = (text.strip(), target_language.lower())
        if cache_key in self._cache:
            return self._cache[cache_key]

        engine = os.environ.get("TRANSLATION_ENGINE", "auto").lower()
        result = text

        # If user explicitly configured M2M100 local engine
        if engine in ("m2m100", "local"):
            try:
                result = self._translate_via_m2m100(text.strip(), target_language, source_language)
                self._cache[cache_key] = result
                return result
            except Exception as e:
                print(f"[Translation Warning] M2M100 failed: {e}. Falling back to GTX...")

        # 1. Primary: Fast direct GTX endpoint
        try:
            result = self._translate_via_gtx(text.strip(), target_language)
        except Exception:
            # 2. Secondary fallback
            try:
                result = self._translate_via_deep_translator(text.strip(), target_language)
            except Exception as e:
                print(f"[Translation Warning] GTX and DeepTranslator failed: {e}. Trying M2M100...")
                try:
                    result = self._translate_via_m2m100(text.strip(), target_language, source_language)
                except Exception as ex2:
                    print(f"[Translation Error] All translation engines failed for '{text[:20]}...': {ex2}")
                    result = text

        self._cache[cache_key] = result
        return result

    def translate_audio_segments(self, segments: list, target_language: str) -> list:
        """
        Translates all audio segments using high-speed bundled translation.
        Translates entire video transcripts in a single or few batched calls instead of one-by-one.
        """
        if not segments:
            return []

        print(f"[FastTranslation] Translating {len(segments)} audio segments to '{target_language}'...")
        t0 = time.time()

        texts = [seg.get("text", "").strip() for seg in segments]

        # Check if all empty
        if not any(texts):
            return [{
                "id": idx,
                "start": seg["start"],
                "end": seg["end"],
                "original_text": seg.get("text", ""),
                "translated_text": seg.get("text", ""),
                "text": seg.get("text", ""),
                "speaker": seg.get("speaker", "SPEAKER_00")
            } for idx, seg in enumerate(segments, start=1)]

        # Batch translate using line bundles (up to 30 items per batch)
        BATCH_SIZE = 30
        translated_texts = []

        for i in range(0, len(texts), BATCH_SIZE):
            chunk = texts[i:i + BATCH_SIZE]
            delim = "\n"
            bundled_text = delim.join([t if t else "..." for t in chunk])

            try:
                translated_bundle = self.translate_text(bundled_text, target_language)
                split_results = [t.strip() for t in translated_bundle.split("\n")]

                if len(split_results) == len(chunk):
                    translated_texts.extend(split_results)
                else:
                    # Parallel worker fallback if newline split counts mismatched
                    with ThreadPoolExecutor(max_workers=6) as executor:
                        results = list(executor.map(lambda txt: self.translate_text(txt, target_language) if txt else "", chunk))
                    translated_texts.extend(results)
            except Exception as e:
                print(f"[FastTranslation Warning] Batch failed ({e}), using parallel workers...")
                with ThreadPoolExecutor(max_workers=6) as executor:
                    results = list(executor.map(lambda txt: self.translate_text(txt, target_language) if txt else "", chunk))
                translated_texts.extend(results)

        # Assemble translated segments
        translated_segments = []
        for idx, (seg, trans_text) in enumerate(zip(segments, translated_texts), start=1):
            original_text = seg.get("text", "")
            final_text = trans_text if trans_text and trans_text != "..." else original_text
            translated_segments.append({
                "id": idx,
                "start": seg["start"],
                "end": seg["end"],
                "original_text": original_text,
                "translated_text": final_text,
                "text": final_text,
                "speaker": seg.get("speaker", "SPEAKER_00")
            })

        print(f"[FastTranslation] Complete in {time.time() - t0:.2f}s ({len(translated_segments)} segments).")
        return translated_segments

    def translate_ocr_data(self, ocr_results: list, target_language: str) -> list:
        """Translates the text data detected by OCR per frame in parallel."""
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
