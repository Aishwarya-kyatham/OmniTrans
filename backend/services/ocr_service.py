import os
import re
import cv2
import time
import asyncio
import numpy as np
from difflib import SequenceMatcher
from typing import List, Dict, Optional, Tuple
from PIL import Image

# Engine 1: Windows Native OCR (DirectX/WinRT accelerated, zero torch dependency)
try:
    import winocr
    HAS_WINOCR = True
except Exception:
    HAS_WINOCR = False

# Engine 2: Tesseract OCR
try:
    import pytesseract
    # Check default Windows installation paths
    default_tess_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe")
    ]
    for p in default_tess_paths:
        if os.path.exists(p):
            pytesseract.pytesseract.tesseract_cmd = p
            break
    HAS_TESSERACT = True
except Exception:
    HAS_TESSERACT = False

# Engine 3: EasyOCR (PyTorch based deep learning OCR - loaded conditionally)
HAS_EASYOCR = False
easyocr_reader = None

def get_easyocr_reader(languages=['en']):
    global HAS_EASYOCR, easyocr_reader
    if easyocr_reader is not None:
        return easyocr_reader
    try:
        import easyocr
        easyocr_reader = easyocr.Reader(languages, gpu=False)
        HAS_EASYOCR = True
        return easyocr_reader
    except Exception as e:
        print(f"[OCR Warning] EasyOCR unavailable: {e}. Falling back to Windows OCR + Tesseract.")
        return None


class TranslumoQualityScorer:
    """
    Translumo-inspired heuristic text quality scoring and noise filtering.
    Scores OCR outputs to distinguish between genuine subtitle text and visual background noise.
    """
    
    # Common OCR noise characters that appear when scanning complex video backgrounds
    NOISE_SYMBOLS = set("~`!@#$%^&*()_+={}|[]\\:\";'<>/?")
    
    @classmethod
    def clean_text(cls, text: str) -> str:
        """Removes common video OCR artifacts while preserving natural punctuation."""
        if not text:
            return ""
        # Remove repetitive dashes, underscores, pipes
        text = re.sub(r'[-_=~|\\/]{3,}', ' ', text)
        # Collapse multiple whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    @classmethod
    def score_candidate(cls, text: str, raw_confidence: float = 0.8) -> float:
        """
        Calculates a quality score from 0.0 to 1.0 for an OCR text candidate.
        Factors:
        - Alphanumeric / letter ratio
        - Word count and length plausibility
        - Symbol / garbage character penalty
        """
        cleaned = cls.clean_text(text)
        if not cleaned or len(cleaned) < 2:
            return 0.0
            
        total_chars = len(cleaned)
        alpha_count = sum(1 for c in cleaned if c.isalnum() or '\u4e00' <= c <= '\u9fff' or '\u3040' <= c <= '\u30ff' or '\uac00' <= c <= '\ud7af')
        noise_count = sum(1 for c in cleaned if c in cls.NOISE_SYMBOLS)
        
        # Heavy penalty if symbols dominate
        if alpha_count == 0 or (noise_count / total_chars) > 0.35:
            return 0.0
            
        alpha_ratio = alpha_count / total_chars
        noise_penalty = (noise_count / total_chars) * 0.5
        
        # Words check: genuine subtitles have reasonable average word lengths (2-12 chars)
        words = cleaned.split()
        avg_word_len = sum(len(w) for w in words) / max(len(words), 1)
        length_bonus = 0.1 if (2.5 <= avg_word_len <= 10) else -0.1
        
        # Combine with engine confidence
        final_score = (raw_confidence * 0.5) + (alpha_ratio * 0.4) + length_bonus - noise_penalty
        return max(0.0, min(1.0, final_score))


class OCRService:
    """
    Advanced Multi-Engine OCR & Subtitle Extraction Service
    Inspired by Translumo's architecture:
    - Multi-Engine Ensemble (Windows Native OCR, Tesseract OCR, EasyOCR)
    - Subtitle ROI (Region of Interest) adaptive cropping
    - Contrast Enhancement & Binarization Filters
    - Heuristic Quality Scoring & Noise Rejection
    - Temporal Subtitle Aggregation (consecutive frame de-duplication)
    """

    def __init__(self, languages: List[str] = ['en']):
        self.languages = languages
        self.primary_lang = languages[0] if languages else 'en'
        self.scorer = TranslumoQualityScorer()
        
        engines = self.get_available_engines()
        print(f"[OCRService] Initialized with available engines: {engines}")

    def get_available_engines(self) -> Dict[str, bool]:
        """Returns the readiness status of all supported OCR engines."""
        return {
            "windows_ocr": HAS_WINOCR,
            "tesseract": HAS_TESSERACT,
            "easyocr": HAS_EASYOCR or (easyocr_reader is not None)
        }

    def preprocess_image(self, img_bgr: np.ndarray, preset: str = "adaptive") -> np.ndarray:
        """
        Translumo-inspired pre-processing filter pipeline for burned-in video subtitles.
        Handles complex video backgrounds, gradients, and font stroke borders.
        """
        # Convert to grayscale
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        
        if preset == "clahe":
            # Contrast Limited Adaptive Histogram Equalization
            clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
            return clahe.apply(gray)
            
        elif preset == "adaptive":
            # High-contrast adaptive thresholding for white/yellow subtitles
            blurred = cv2.GaussianBlur(gray, (3, 3), 0)
            thresh = cv2.adaptiveThreshold(
                blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv2.THRESH_BINARY, 15, 3
            )
            return thresh
            
        elif preset == "otsu":
            # Otsu binarization
            _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            return thresh
            
        return gray

    def crop_subtitle_roi(
        self, 
        image: np.ndarray, 
        roi_mode: str = "bottom_third", 
        custom_box: Optional[Tuple[float, float, float, float]] = None
    ) -> Tuple[np.ndarray, Tuple[int, int, int, int]]:
        """
        Crops the Region of Interest where subtitles typically appear.
        Reduces computational load by 70% and prevents false-positives from background scenery.
        """
        h, w = image.shape[:2]
        
        if custom_box:
            # Format: (top_ratio, bottom_ratio, left_ratio, right_ratio)
            y1 = int(h * custom_box[0])
            y2 = int(h * custom_box[1])
            x1 = int(w * custom_box[2])
            x2 = int(w * custom_box[3])
        elif roi_mode == "bottom_third":
            y1, y2, x1, x2 = int(h * 0.65), h, 0, w
        elif roi_mode == "bottom_quarter":
            y1, y2, x1, x2 = int(h * 0.75), h, 0, w
        elif roi_mode == "top_third":
            y1, y2, x1, x2 = 0, int(h * 0.35), 0, w
        else: # "full"
            y1, y2, x1, x2 = 0, h, 0, w
            
        y1 = max(0, min(y1, h - 1))
        y2 = max(y1 + 1, min(y2, h))
        x1 = max(0, min(x1, w - 1))
        x2 = max(x1 + 1, min(x2, w))
        
        cropped = image[y1:y2, x1:x2]
        return cropped, (x1, y1, x2 - x1, y2 - y1)

    async def _run_windows_ocr(self, pil_image: Image.Image, lang: str = "en") -> List[Dict]:
        """Runs the Windows Native WinRT OCR engine."""
        if not HAS_WINOCR:
            return []
        try:
            res = await winocr.recognize_pil(pil_image, lang)
            results = []
            if res and res.text:
                for line in getattr(res, "lines", []):
                    line_text = getattr(line, "text", "").strip()
                    if line_text:
                        results.append({
                            "engine": "windows_ocr",
                            "text": line_text,
                            "confidence": 0.88,
                            "bbox": getattr(line, "bounding_rect", None)
                        })
                # Fallback to full text if lines attribute empty
                if not results and res.text.strip():
                    results.append({
                        "engine": "windows_ocr",
                        "text": res.text.strip(),
                        "confidence": 0.85,
                        "bbox": None
                    })
            return results
        except Exception as e:
            # Language not installed or engine error
            return []

    def _run_tesseract_ocr(self, img_array: np.ndarray, lang: str = "eng") -> List[Dict]:
        """Runs Tesseract OCR with detailed confidence metrics."""
        if not HAS_TESSERACT:
            return []
        try:
            # Use PSM 6 (Assume a single uniform block of text) for subtitle reading
            custom_config = r'--oem 3 --psm 6'
            data = pytesseract.image_to_data(
                img_array, 
                lang=lang, 
                config=custom_config, 
                output_type=pytesseract.Output.DICT
            )
            
            lines_dict = {}
            n_boxes = len(data['text'])
            for i in range(n_boxes):
                text = data['text'][i].strip()
                conf = float(data['conf'][i])
                if conf > 30 and text:
                    line_num = data['line_num'][i]
                    if line_num not in lines_dict:
                        lines_dict[line_num] = {"words": [], "confs": [], "x": data['left'][i], "y": data['top'][i]}
                    lines_dict[line_num]["words"].append(text)
                    lines_dict[line_num]["confs"].append(conf / 100.0)
                    
            results = []
            for line_info in lines_dict.values():
                full_line = " ".join(line_info["words"])
                avg_conf = sum(line_info["confs"]) / len(line_info["confs"])
                results.append({
                    "engine": "tesseract",
                    "text": full_line,
                    "confidence": avg_conf,
                    "bbox": [line_info["x"], line_info["y"]]
                })
            return results
        except Exception as e:
            return []

    def _run_easyocr(self, img_array: np.ndarray) -> List[Dict]:
        """Runs EasyOCR if loaded."""
        reader = get_easyocr_reader(self.languages)
        if not reader:
            return []
        try:
            res = reader.readtext(img_array)
            results = []
            for (bbox, text, prob) in res:
                if prob > 0.35 and text.strip():
                    results.append({
                        "engine": "easyocr",
                        "text": text.strip(),
                        "confidence": float(prob),
                        "bbox": [[int(p[0]), int(p[1])] for p in bbox]
                    })
            return results
        except Exception:
            return []

    def recognize_frame(
        self, 
        frame_path_or_array, 
        roi_mode: str = "bottom_third",
        lang: str = "en"
    ) -> List[Dict]:
        """
        Executes Translumo's multi-engine recognition on a single video frame.
        Combines candidate texts, scores with Translumo Quality Scorer, and picks the highest quality consensus.
        """
        if isinstance(frame_path_or_array, str):
            img_bgr = cv2.imread(frame_path_or_array)
            if img_bgr is None:
                return []
        else:
            img_bgr = frame_path_or_array

        # 1. Subtitle ROI crop
        crop_bgr, (rx, ry, rw, rh) = self.crop_subtitle_roi(img_bgr, roi_mode=roi_mode)
        
        # 2. Enhanced image filter
        crop_enhanced = self.preprocess_image(crop_bgr, preset="clahe")
        pil_crop = Image.fromarray(cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2RGB))
        
        # 3. Multi-Engine Querying
        candidates = []
        
        # Engine A: Windows OCR
        if HAS_WINOCR:
            try:
                win_lang = "en" if lang.startswith("en") else lang
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    import concurrent.futures
                    with concurrent.futures.ThreadPoolExecutor() as pool:
                        win_results = pool.submit(asyncio.run, self._run_windows_ocr(pil_crop, win_lang)).result()
                else:
                    win_results = asyncio.run(self._run_windows_ocr(pil_crop, win_lang))
                candidates.extend(win_results)
            except Exception:
                pass
                
        # Engine B: Tesseract OCR (run on enhanced contrast image)
        if HAS_TESSERACT:
            tess_lang = "eng" if lang.startswith("en") else lang
            tess_results = self._run_tesseract_ocr(crop_enhanced, tess_lang)
            candidates.extend(tess_results)
            
        # Engine C: EasyOCR (optional fallback)
        if not candidates and HAS_EASYOCR:
            candidates.extend(self._run_easyocr(crop_bgr))

        # 4. Translumo Scoring & Consensus Selection
        scored_candidates = []
        for cand in candidates:
            raw_text = cand["text"]
            cleaned = self.scorer.clean_text(raw_text)
            score = self.scorer.score_candidate(cleaned, cand.get("confidence", 0.8))
            if score >= 0.45: # Filter out background noise
                scored_candidates.append({
                    "engine": cand["engine"],
                    "text": cleaned,
                    "score": round(score, 3),
                    "confidence": cand.get("confidence", 0.8)
                })

        if not scored_candidates:
            return []

        # Multi-engine consensus check: If 2 engines agree, boost score
        for i in range(len(scored_candidates)):
            for j in range(i + 1, len(scored_candidates)):
                t1 = scored_candidates[i]["text"]
                t2 = scored_candidates[j]["text"]
                sim = SequenceMatcher(None, t1.lower(), t2.lower()).ratio()
                if sim >= 0.75:
                    scored_candidates[i]["score"] = min(1.0, scored_candidates[i]["score"] + 0.15)
                    scored_candidates[j]["score"] = min(1.0, scored_candidates[j]["score"] + 0.15)

        # Sort by score descending and return best candidates
        scored_candidates.sort(key=lambda x: x["score"], reverse=True)
        return scored_candidates

    def analyze_frames_translumo(
        self, 
        frames_dir: str, 
        fps: int = 1, 
        roi_mode: str = "bottom_third",
        lang: str = "en"
    ) -> List[Dict]:
        """
        Iterates over all extracted video frames and applies the multi-engine OCR pipeline.
        Returns chronological frame-level detections.
        """
        frame_files = sorted([f for f in os.listdir(frames_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
        print(f"[OCRService] Analyzing {len(frame_files)} frames with Translumo multi-engine OCR (ROI: {roi_mode})...")
        
        chronological_results = []
        
        for idx, filename in enumerate(frame_files):
            frame_path = os.path.join(frames_dir, filename)
            timestamp = idx / float(fps)
            
            top_detections = self.recognize_frame(frame_path, roi_mode=roi_mode, lang=lang)
            if top_detections:
                best = top_detections[0]
                chronological_results.append({
                    "timestamp": timestamp,
                    "frame": filename,
                    "text": best["text"],
                    "score": best["score"],
                    "engine": best["engine"],
                    "all_candidates": top_detections
                })
                
        return chronological_results

    def aggregate_temporal_subtitles(
        self, 
        frame_results: List[Dict], 
        min_duration: float = 1.0,
        max_gap: float = 1.5,
        similarity_threshold: float = 0.70
    ) -> List[Dict]:
        """
        Translumo Temporal Subtitle Grouping:
        Groups repeated detections across consecutive frames into coherent subtitle intervals [start, end].
        Eliminates duplicate subtitle flashing and creates production-ready subtitle segments.
        """
        if not frame_results:
            return []

        subtitle_segments = []
        current_segment = None

        for item in frame_results:
            ts = item["timestamp"]
            text = item["text"]
            score = item["score"]
            engine = item["engine"]

            if current_segment is None:
                # Start first subtitle segment
                current_segment = {
                    "id": len(subtitle_segments) + 1,
                    "start": ts,
                    "end": ts + min_duration,
                    "text": text,
                    "original_text": text,
                    "translated_text": "",
                    "speaker": "ONSCREEN_TEXT",
                    "score": score,
                    "engine": engine,
                    "instances": 1
                }
            else:
                # Check similarity with current active subtitle
                similarity = SequenceMatcher(
                    None, 
                    current_segment["text"].lower(), 
                    text.lower()
                ).ratio()
                
                time_gap = ts - (current_segment["end"] - min_duration)

                if similarity >= similarity_threshold and time_gap <= max_gap:
                    # Same subtitle is still displayed on screen
                    current_segment["end"] = ts + min_duration
                    current_segment["instances"] += 1
                    # Keep the higher scoring text candidate
                    if score > current_segment["score"] and len(text) >= len(current_segment["text"]):
                        current_segment["text"] = text
                        current_segment["original_text"] = text
                        current_segment["score"] = score
                else:
                    # Text changed or ended -> save previous segment and start new one
                    subtitle_segments.append(current_segment)
                    current_segment = {
                        "id": len(subtitle_segments) + 1,
                        "start": ts,
                        "end": ts + min_duration,
                        "text": text,
                        "original_text": text,
                        "translated_text": "",
                        "speaker": "ONSCREEN_TEXT",
                        "score": score,
                        "engine": engine,
                        "instances": 1
                    }

        if current_segment is not None:
            subtitle_segments.append(current_segment)

        # Post-cleanup: round timestamps
        for seg in subtitle_segments:
            seg["start"] = round(seg["start"], 2)
            seg["end"] = round(seg["end"], 2)

        return subtitle_segments
