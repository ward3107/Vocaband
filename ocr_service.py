"""
OCR Microservice using PaddleOCR
Run with: uvicorn ocr_service:app --host 0.0.0.0 --port 8001
Requirements: pip install paddleocr fastapi uvicorn python-multipart opencv-python-headless pillow
"""

import os
import io
import re
import base64
from typing import List, Optional
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from paddleocr import PaddleOCR
from PIL import Image
import cv2
import numpy as np

app = FastAPI(title="OCR Microservice")

# CORS - allow requests from your Vite dev server and production domain
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize PaddleOCR with English language
# use_textline_orientation disabled due to CPU compatibility issues
ocr = PaddleOCR(lang='en')

# English-only word pattern (same as client-side)
ENGLISH_WORD_PATTERN = re.compile(r'^[a-z]+$')


def preprocess_image(image_bytes: bytes) -> Optional[np.ndarray]:
    """
    Preprocess image to improve OCR accuracy:
    1. Convert to grayscale
    2. Resize if too small (min 2x DPI scaling)
    3. Apply adaptive thresholding for better text extraction
    4. Denoise if needed
    """
    try:
        # Load image
        image = Image.open(io.BytesIO(image_bytes))

        # Convert to RGB if needed (PaddleOCR expects RGB)
        if image.mode != 'RGB':
            image = image.convert('RGB')

        img_array = np.array(image)

        # Convert to grayscale for preprocessing
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)

        # Check if image is too small and upscale if needed
        height, width = gray.shape
        min_dimension = 720  # minimum size for good OCR

        if height < min_dimension or width < min_dimension:
            scale = max(min_dimension / height, min_dimension / width)
            new_height = int(height * scale)
            new_width = int(width * scale)
            gray = cv2.resize(gray, (new_width, new_height), interpolation=cv2.INTER_CUBIC)

        # Apply adaptive thresholding for better text extraction
        # This helps with varying lighting conditions
        binary = cv2.adaptiveThreshold(
            gray, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 11, 2
        )

        # Denoise using median blur (preserves edges better than Gaussian)
        denoised = cv2.medianBlur(binary, 3)

        # Convert back to RGB for PaddleOCR
        denoised_rgb = cv2.cvtColor(denoised, cv2.COLOR_GRAY2RGB)

        return denoised_rgb

    except Exception as e:
        print(f"Preprocessing error: {e}")
        # If preprocessing fails, return original image
        image = Image.open(io.BytesIO(image_bytes))
        if image.mode != 'RGB':
            image = image.convert('RGB')
        return np.array(image)


def extract_english_words(text: str) -> List[str]:
    """
    Extract only English words from OCR text.
    Filters out numbers, punctuation, and non-English characters.
    """
    if not text:
        return []

    # Convert to lowercase and split by whitespace
    words = text.lower().split()

    # Filter to only English words (a-z only)
    english_words = [w for w in words if ENGLISH_WORD_PATTERN.match(w)]

    # Remove duplicates while preserving order
    seen = set()
    result = []
    for word in english_words:
        if word not in seen:
            seen.add(word)
            result.append(word)

    return result


@app.post("/ocr")
async def perform_ocr(file: UploadFile):
    """
    Perform OCR on uploaded image using PaddleOCR.
    Returns only English words (a-z).
    """
    try:
        # Read image bytes
        image_bytes = await file.read()

        # Preprocess image for better OCR accuracy
        print(f"[OCR] Processing image ({len(image_bytes)} bytes)")
        processed_image = preprocess_image(image_bytes)

        # Perform OCR with PaddleOCR
        result = ocr.ocr(processed_image)

        # Extract text from PaddleOCR result
        # PaddleOCR returns list of lists (one per detected text block)
        all_text = []
        if result and result[0]:
            for line in result[0]:
                if line and len(line) >= 2:
                    # line[0] is the text, line[1] is position/confidence
                    text = line[0]
                    if text:
                        all_text.append(text)

        # Combine all detected text
        combined_text = ' '.join(all_text)
        print(f"[OCR] Raw text: {combined_text[:100]}...")

        # Extract only English words
        english_words = extract_english_words(combined_text)
        print(f"[OCR] Found {len(english_words)} English words: {english_words[:10]}...")

        return {
            "words": english_words,
            "raw_text": combined_text,
            "success": True
        }

    except Exception as e:
        print(f"[OCR] Error: {e}")
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "OCR Microservice"}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("OCR_SERVICE_PORT", 8001))
    print(f"Starting OCR microservice on port {port}...")
    print(f"Allowed origins: {ALLOWED_ORIGINS}")

    uvicorn.run(app, host="0.0.0.0", port=port)
