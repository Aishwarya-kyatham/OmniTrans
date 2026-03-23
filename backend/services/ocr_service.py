import easyocr
import os

class OCRService:
    def __init__(self, languages=['en']):
        """
        Initializes EasyOCR.
        Downloading the model weights happens automatically the first time.
        """
        print(f"Loading EasyOCR Model for languages: {languages}...")
        # gpu=False assumes CPU run, set True if user has setup PyTorch CUDA
        self.reader = easyocr.Reader(languages, gpu=False) 
        print("EasyOCR Model Loaded.")

    def analyze_frames(self, frames_dir: str, fps: int = 1) -> list:
        """
        Iterates over all frames in the directory and extracts text.
        Calculates the timestamp based on the frame number.
        """
        ocr_results = []
        
        # Sort frames to process them in chronological order
        frame_files = sorted([f for f in os.listdir(frames_dir) if f.endswith('.jpg')])
        
        print(f"Starting OCR analysis on {len(frame_files)} frames...")
        
        for idx, filename in enumerate(frame_files):
            frame_path = os.path.join(frames_dir, filename)
            
            # The exact second this frame was captured
            current_second = idx / fps
            
            # result is a list of tuples: (bounding_box, text, confidence)
            results = self.reader.readtext(frame_path)
            
            frame_text_data = []
            for (bbox, text, prob) in results:
                if prob > 0.4: # Filter out low confidence noise
                    frame_text_data.append({
                        "text": text,
                        "confidence": float(prob),
                        "bbox": [[int(coord) for coord in point] for point in bbox] 
                    })
            
            if frame_text_data:
                ocr_results.append({
                    "timestamp": current_second,
                    "frame_data": frame_text_data
                })
                
        return ocr_results
