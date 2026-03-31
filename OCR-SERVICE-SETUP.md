# OCR Microservice Setup Guide

This application uses a Python microservice with PaddleOCR for state-of-the-art text recognition from images. The OCR service runs separately from the main Node.js application.

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

## Setup Instructions

### 1. Install Python Dependencies

Navigate to the project directory and install the required Python packages:

```bash
pip install -r requirements-ocr.txt
```

This will install:
- `paddleocr` - Baidu's state-of-the-art OCR library
- `fastapi` - Modern Python web framework
- `uvicorn` - ASGI server for FastAPI
- `python-multipart` - File upload support
- `opencv-python-headless` - Image preprocessing
- `pillow` - Image handling
- `numpy` - Numerical computing

### 2. Configure the OCR Service URL

In your `.env` file (create one if it doesn't exist), add:

```
OCR_SERVICE_URL="http://localhost:8001"
```

For production, deploy the Python service and update this URL to point to your deployed service.

### 3. Start the OCR Microservice

In a separate terminal, run:

```bash
python ocr_service.py
```

Or using uvicorn directly:

```bash
uvicorn ocr_service:app --host 0.0.0.0 --port 8001
```

The service will start on `http://localhost:8001`.

### 4. Start the Main Application

In another terminal, start the Node.js application:

```bash
npm run dev
```

The main app will communicate with the OCR service at the configured URL.

## Features

- **State-of-the-art accuracy**: PaddleOCR provides near-commercial OCR accuracy
- **English-only filtering**: Automatically extracts only English words (a-z)
- **Image preprocessing**: Automatic grayscale conversion, resizing, adaptive thresholding, and denoising
- **Teacher-only access**: JWT authentication ensures only teachers can upload images
- **File validation**: Maximum 10MB, supports JPEG, PNG, WebP

## Troubleshooting

### OCR service not responding

1. Check if the Python service is running:
   ```bash
   curl http://localhost:8001/health
   ```
   Should return: `{"status":"healthy","service":"OCR Microservice"}`

2. Verify `OCR_SERVICE_URL` in your `.env` file matches the service URL

3. Check the Python service terminal for any error messages

### "OCR service not configured" error

Add `OCR_SERVICE_URL` to your `.env` file (see step 2 above)

### "Authentication required" error

Ensure you're logged in as a teacher. Only teachers can use the OCR feature.

### Port already in use

If port 8001 is already in use, either:
- Stop the conflicting service, or
- Change the port by setting `OCR_SERVICE_PORT=8002` when running the Python service, and update the `OCR_SERVICE_URL` accordingly

## Development

### Running on a different port

```bash
OCR_SERVICE_PORT=8002 python ocr_service.py
```

Then update `.env`:
```
OCR_SERVICE_URL="http://localhost:8002"
```

### Testing the OCR service directly

```bash
curl -X POST http://localhost:8001/ocr \
  -F "file=@test-image.jpg" \
  -H "Content-Type: image/jpeg"
```

Expected response:
```json
{
  "words": ["word1", "word2", "word3"],
  "raw_text": "Full recognized text...",
  "success": true
}
```

## Production Deployment

For production, consider:

1. **Containerize**: Use Docker to package the Python service
2. **Cloud deployment**: Deploy to Cloud Run, AWS Lambda, Heroku, etc.
3. **Scaling**: The stateless service can be horizontally scaled
4. **Monitoring**: Add health checks and logging

Example Docker command:
```bash
docker run -p 8001:8001 \
  -v $(pwd)/ocr_service.py:/app/ocr_service.py \
  -e OCR_SERVICE_PORT=8001 \
  python:3.11 \
  python /app/ocr_service.py
```

## Architecture

```
┌─────────────────┐      HTTP + JWT       ┌──────────────────┐
│   Vite + React   │ ──────────────────────│  Node.js Server  │
│   (Client)       │                         │  (Express)      │
└─────────────────┘                         └────────┬─────────┘
                                                          │
                                                          │ HTTP (FormData)
                                                          ▼
                                                  ┌──────────────────┐
                                                  │  Python Service   │
                                                  │  (FastAPI)        │
                                                  │  - PaddleOCR      │
                                                  │  - OpenCV         │
                                                  │  - Image Preproc  │
                                                  └──────────────────┘
```

## Performance

- **Client**: Lightweight, no OCR processing in browser
- **Server**: Powerful OCR with preprocessing (0.5-3 seconds per image)
- **Network**: Single HTTP POST with image file
- **Memory**: Python service uses ~200-500MB RAM

## License

PaddleOCR is licensed under Apache 2.0. See https://github.com/PaddlePaddle/PaddleOCR for details.
