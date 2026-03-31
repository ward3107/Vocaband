"""
OCR Microservice using Tesseract
Run with: uvicorn ocr_service_tesseract:app --host 0.0.0.0 --port 8001
Requirements: pip install fastapi uvicorn python-multipart pytesseract pillow
System requirement: Install Tesseract OCR from https://github.com/UB-Mannheim/tesseract/wiki
"""

import os
import io
import re
from typing import List, Optional
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import pytesseract

app = FastAPI(title="OCR Microservice (Tesseract)")

# CORS - allow requests from your Vite dev server and production domain
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# English-only word pattern (same as client-side)
ENGLISH_WORD_PATTERN = re.compile(r'^[a-z]+$')


def preprocess_image(image_bytes: bytes) -> Optional[Image.Image]:
    """
    Preprocess image to improve OCR accuracy:
    1. Convert to grayscale
    2. Resize if too small
    3. Apply thresholding for better text extraction
    """
    try:
        # Load image
        image = Image.open(io.BytesIO(image_bytes))

        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')

        # Check if image is too small and upscale if needed
        width, height = image.size
        min_dimension = 720

        if width < min_dimension or height < min_dimension:
            scale = max(min_dimension / width, min_dimension / height)
            new_width = int(width * scale)
            new_height = int(height * scale)
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)

        return image

    except Exception as e:
        print(f"[OCR] Preprocessing error: {e}")
        # If preprocessing fails, return original image
        image = Image.open(io.BytesIO(image_bytes))
        if image.mode != 'RGB':
            image = image.convert('RGB')
        return image


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
    Perform OCR on uploaded image using Tesseract.
    Returns only English words (a-z).
    """
    try:
        # Read image bytes
        image_bytes = await file.read()

        # Preprocess image for better OCR accuracy
        print(f"[OCR] Processing image ({len(image_bytes)} bytes)")
        processed_image = preprocess_image(image_bytes)

        # Perform OCR with Tesseract
        # psm 6 = single uniform block of text
        # OEM 3 = Legacy engine only (faster, less accurate but more compatible)
        custom_config = r'--oem 3 --psm 6 -l eng'
        text = pytesseract.image_to_string(processed_image, config=custom_config)

        print(f"[OCR] Raw text: {text[:100]}...")

        # Extract only English words
        english_words = extract_english_words(text)
        print(f"[OCR] Found {len(english_words)} English words: {english_words[:10]}...")

        return {
            "words": english_words,
            "raw_text": text,
            "success": True
        }

    except Exception as e:
        print(f"[OCR] Error: {e}")
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")


@app.get("/health")
async def health():
    """Health check endpoint"""
    # Check if Tesseract is available
    try:
        pytesseract.get_tesseract_version()
        return {"status": "healthy", "service": "OCR Microservice (Tesseract)", "tesseract": "available"}
    except Exception as e:
        return {"status": "unhealthy", "service": "OCR Microservice (Tesseract)", "error": str(e)}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("OCR_SERVICE_PORT", 8001))
    print(f"Starting OCR microservice (Tesseract) on port {port}...")
    print(f"Allowed origins: {ALLOWED_ORIGINS}")

    uvicorn.run(app, host="0.0.0.0", port=port)
