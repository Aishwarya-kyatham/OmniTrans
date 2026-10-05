import os
import asyncio
from abc import ABC, abstractmethod
from gtts import gTTS

class BaseTTSProvider(ABC):
    @abstractmethod
    async def generate_speech(self, text: str, voice: str, target_language: str, output_path: str) -> str:
        """Generates audio for given text and voice, saving output file to output_path."""
        pass

    @abstractmethod
    def get_available_voices(self, target_language: str) -> list:
        """Returns a list of voice identifiers for the given target language."""
        pass

class EdgeTTSProvider(BaseTTSProvider):
    """
    Microsoft Edge Neural TTS Provider using edge-tts library.
    Provides free, ultra-high quality, natural neural voices across 40+ languages.
    """
    DEFAULT_VOICES = {
        "es": [
            {"id": "es-ES-AlvaroNeural", "name": "Alvaro (Spanish - Spain, Male)", "gender": "Male"},
            {"id": "es-ES-ElviraNeural", "name": "Elvira (Spanish - Spain, Female)", "gender": "Female"},
            {"id": "es-MX-JorgeNeural", "name": "Jorge (Spanish - Mexico, Male)", "gender": "Male"},
            {"id": "es-MX-DaliaNeural", "name": "Dalia (Spanish - Mexico, Female)", "gender": "Female"},
        ],
        "en": [
            {"id": "en-US-GuyNeural", "name": "Guy (English - US, Male)", "gender": "Male"},
            {"id": "en-US-JennyNeural", "name": "Jenny (English - US, Female)", "gender": "Female"},
            {"id": "en-GB-RyanNeural", "name": "Ryan (English - UK, Male)", "gender": "Male"},
            {"id": "en-GB-SoniaNeural", "name": "Sonia (English - UK, Female)", "gender": "Female"},
        ],
        "fr": [
            {"id": "fr-FR-HenriNeural", "name": "Henri (French - France, Male)", "gender": "Male"},
            {"id": "fr-FR-DeniseNeural", "name": "Denise (French - France, Female)", "gender": "Female"},
        ],
        "de": [
            {"id": "de-DE-ConradNeural", "name": "Conrad (German - Germany, Male)", "gender": "Male"},
            {"id": "de-DE-KatjaNeural", "name": "Katja (German - Germany, Female)", "gender": "Female"},
        ],
        "hi": [
            {"id": "hi-IN-MadhurNeural", "name": "Madhur (Hindi - India, Male)", "gender": "Male"},
            {"id": "hi-IN-SwaraNeural", "name": "Swara (Hindi - India, Female)", "gender": "Female"},
        ],
        "ja": [
            {"id": "ja-JP-KeitaNeural", "name": "Keita (Japanese - Japan, Male)", "gender": "Male"},
            {"id": "ja-JP-NanamiNeural", "name": "Nanami (Japanese - Japan, Female)", "gender": "Female"},
        ],
        "zh": [
            {"id": "zh-CN-YunxiNeural", "name": "Yunxi (Chinese - China, Male)", "gender": "Male"},
            {"id": "zh-CN-XiaoxiaoNeural", "name": "Xiaoxiao (Chinese - China, Female)", "gender": "Female"},
        ],
        "it": [
            {"id": "it-IT-DiegoNeural", "name": "Diego (Italian - Italy, Male)", "gender": "Male"},
            {"id": "it-IT-[#]ElsaNeural", "name": "Elsa (Italian - Italy, Female)", "gender": "Female"},
        ],
        "pt": [
            {"id": "pt-BR-AntonioNeural", "name": "Antonio (Portuguese - Brazil, Male)", "gender": "Male"},
            {"id": "pt-BR-FranciscaNeural", "name": "Francisca (Portuguese - Brazil, Female)", "gender": "Female"},
        ]
    }

    def get_available_voices(self, target_language: str) -> list:
        lang = target_language.lower().split('-')[0]
        if lang in self.DEFAULT_VOICES:
            return self.DEFAULT_VOICES[lang]
        # Generic fallback voice matching language code prefix
        return [
            {"id": f"{lang}-{lang.upper()}-StandardMaleNeural", "name": f"Default {lang.upper()} Male", "gender": "Male"},
            {"id": f"{lang}-{lang.upper()}-StandardFemaleNeural", "name": f"Default {lang.upper()} Female", "gender": "Female"}
        ]

    async def generate_speech(self, text: str, voice: str, target_language: str, output_path: str) -> str:
        selected_voice = voice
        if not selected_voice or selected_voice == "default":
            voices = self.get_available_voices(target_language)
            selected_voice = voices[0]["id"]

        safe_text = text[:30].encode("ascii", "replace").decode("ascii")
        print(f"[EdgeTTS] Synthesizing voice '{selected_voice}' for text: '{safe_text}...'")
        try:
            import edge_tts
            communicate = edge_tts.Communicate(text, selected_voice)
            await communicate.save(output_path)
            return output_path
        except Exception as e:
            print(f"[EdgeTTS Warning] EdgeTTS generation failed ({e}). Falling back to gTTS...")
            gtts_fallback = GTTSProvider()
            return await gtts_fallback.generate_speech(text, voice, target_language, output_path)

class GTTSProvider(BaseTTSProvider):
    """
    Fallback gTTS provider.
    """
    def get_available_voices(self, target_language: str) -> list:
        return [{"id": "gtts_default", "name": f"Google TTS ({target_language})", "gender": "Neutral"}]

    async def generate_speech(self, text: str, voice: str, target_language: str, output_path: str) -> str:
        print(f"[gTTS] Synthesizing text with gTTS: '{text[:30]}...'")
        temp_mp3 = output_path.replace(".wav", ".mp3")
        lang = target_language.lower().split('-')[0]
        tts = gTTS(text=text, lang=lang, slow=False)
        tts.save(temp_mp3)

        # Convert mp3 to wav via ffmpeg
        ffmpeg_path = os.environ.get("FFMPEG_BINARY", "ffmpeg")
        import subprocess
        subprocess.run([
            ffmpeg_path, "-y", "-i", temp_mp3, output_path
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        if os.path.exists(temp_mp3):
            os.remove(temp_mp3)
        return output_path

class XTTSProvider(BaseTTSProvider):
    """
    XTTS v2 / Coqui local voice cloning provider stub.
    """
    def get_available_voices(self, target_language: str) -> list:
        return [{"id": "xtts_clone_1", "name": "XTTS Cloned Speaker", "gender": "Custom"}]

    async def generate_speech(self, text: str, voice: str, target_language: str, output_path: str) -> str:
        print(f"[XTTS Stub] Falling back to EdgeTTS for synthesis...")
        fallback = EdgeTTSProvider()
        return await fallback.generate_speech(text, voice, target_language, output_path)

class TTSService:
    def __init__(self):
        provider_type = os.environ.get("TTS_PROVIDER", "edge").lower()
        if provider_type == "edge":
            self.provider = EdgeTTSProvider()
        elif provider_type == "xtts":
            self.provider = XTTSProvider()
        else:
            self.provider = GTTSProvider()
        print(f"Initialized TTSService with provider: {self.provider.__class__.__name__}")

    def get_available_voices(self, target_language: str) -> list:
        return self.provider.get_available_voices(target_language)

    def generate_speech_sync(self, text: str, voice: str, target_language: str, output_path: str) -> str:
        """Synchronous wrapper for generating speech across providers with per-thread event loops."""
        try:
            return asyncio.run(self.provider.generate_speech(text, voice, target_language, output_path))
        except RuntimeError:
            # If an event loop is already running in this thread
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(self.provider.generate_speech(text, voice, target_language, output_path))
            finally:
                loop.close()

