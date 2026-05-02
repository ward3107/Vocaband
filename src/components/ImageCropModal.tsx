import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RotateCw, Crop, X, Check, Maximize } from "lucide-react";

interface ImageCropModalProps {
  file: File;
  onConfirm: (croppedFile: File) => void;
  onCancel: () => void;
}

// Crop rect in percentage of the displayed image (0-100)
interface CropRect {
  x: number; y: number; w: number; h: number;
}

const HANDLE_SIZE = 28; // touch-friendly handle size in px
const MIN_CROP = 10;    // minimum crop size in %

export default function ImageCropModal({ file, onConfirm, onCancel }: ImageCropModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgSrc, setImgSrc] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [rotation, setRotation] = useState(0);

  // Image display dimensions (fitted in container)
  const [imgDisplay, setImgDisplay] = useState({ x: 0, y: 0, w: 0, h: 0 });

  // Crop rectangle (percentage of image)
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 100, h: 100 });

  // Drag state
  const [dragType, setDragType] = useState<
    "move" | "tl" | "tr" | "bl" | "br" | null
  >(null);
  const dragStart = useRef({ px: 0, py: 0, crop: { x: 0, y: 0, w: 100, h: 100 } });

  // Load image — only allow blob: URLs (from createObjectURL) to prevent XSS
  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (!url.startsWith("blob:")) return; // safety: reject non-blob URLs
    setImgSrc(url);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImageLoaded(true);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Calculate image fit within container
  const updateLayout = useCallback(() => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;

    // Account for rotation — swap width/height for 90/270
    const isRotated = rotation === 90 || rotation === 270;
    const iw = isRotated ? img.naturalHeight : img.naturalWidth;
    const ih = isRotated ? img.naturalWidth : img.naturalHeight;

    const scale = Math.min(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    setImgDisplay({ x: dx, y: dy, w: dw, h: dh });
  }, [rotation]);

  useEffect(() => {
    if (imageLoaded) updateLayout();
  }, [imageLoaded, updateLayout]);

  useEffect(() => {
    const handleResize = () => updateLayout();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateLayout]);

  // Convert crop % to pixel position relative to container
  const cropToPx = (c: CropRect) => ({
    left: imgDisplay.x + (c.x / 100) * imgDisplay.w,
    top: imgDisplay.y + (c.y / 100) * imgDisplay.h,
    width: (c.w / 100) * imgDisplay.w,
    height: (c.h / 100) * imgDisplay.h,
  });

  const pxRect = cropToPx(crop);

  // Pointer → crop percentage coords
  const pxToCropCoords = (clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return { cx: 0, cy: 0 };
    const rect = container.getBoundingClientRect();
    const px = clientX - rect.left - imgDisplay.x;
    const py = clientY - rect.top - imgDisplay.y;
    return {
      cx: Math.max(0, Math.min(100, (px / imgDisplay.w) * 100)),
      cy: Math.max(0, Math.min(100, (py / imgDisplay.h) * 100)),
    };
  };

  // --- Pointer handlers ---
  const handlePointerDown = (e: React.PointerEvent, type: typeof dragType) => {
    e.preventDefault();
    e.stopPropagation();
    setDragType(type);
    const { cx, cy } = pxToCropCoords(e.clientX, e.clientY);
    dragStart.current = { px: cx, py: cy, crop: { ...crop } };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragType) return;
    e.preventDefault();

    const { cx, cy } = pxToCropCoords(e.clientX, e.clientY);
    const dx = cx - dragStart.current.px;
    const dy = cy - dragStart.current.py;
    const s = dragStart.current.crop;

    let next: CropRect;

    if (dragType === "move") {
      const nx = Math.max(0, Math.min(100 - s.w, s.x + dx));
      const ny = Math.max(0, Math.min(100 - s.h, s.y + dy));
      next = { x: nx, y: ny, w: s.w, h: s.h };
    } else {
      // Corner resize
      let x1 = s.x, y1 = s.y, x2 = s.x + s.w, y2 = s.y + s.h;

      if (dragType === "tl") { x1 = s.x + dx; y1 = s.y + dy; }
      if (dragType === "tr") { x2 = s.x + s.w + dx; y1 = s.y + dy; }
      if (dragType === "bl") { x1 = s.x + dx; y2 = s.y + s.h + dy; }
      if (dragType === "br") { x2 = s.x + s.w + dx; y2 = s.y + s.h + dy; }

      // Clamp to image bounds
      x1 = Math.max(0, Math.min(100 - MIN_CROP, x1));
      y1 = Math.max(0, Math.min(100 - MIN_CROP, y1));
      x2 = Math.max(MIN_CROP, Math.min(100, x2));
      y2 = Math.max(MIN_CROP, Math.min(100, y2));

      // Enforce minimum size
      if (x2 - x1 < MIN_CROP) { if (dragType === "tl" || dragType === "bl") x1 = x2 - MIN_CROP; else x2 = x1 + MIN_CROP; }
      if (y2 - y1 < MIN_CROP) { if (dragType === "tl" || dragType === "tr") y1 = y2 - MIN_CROP; else y2 = y1 + MIN_CROP; }

      next = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    }

    setCrop(next);
  };

  const handlePointerUp = () => setDragType(null);

  // Rotate
  const rotate90 = () => {
    setRotation((r) => (r + 90) % 360);
    setCrop({ x: 0, y: 0, w: 100, h: 100 }); // reset crop on rotate
  };

  // Reset crop to full image
  const resetCrop = () => setCrop({ x: 0, y: 0, w: 100, h: 100 });

  // Confirm — export cropped region
  const handleConfirm = () => {
    // If crop is the default (full image) and no rotation, skip canvas
    // manipulation entirely — send the original file as-is. This avoids
    // mobile canvas size limits and EXIF orientation bugs.
    const isFullImage = crop.x === 0 && crop.y === 0 && crop.w === 100 && crop.h === 100;
    if (isFullImage && rotation === 0) {
      onConfirm(file);
      return;
    }

    const img = imgRef.current;
    if (!img) { onConfirm(file); return; }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) { onConfirm(file); return; }

    // Source dimensions (natural image pixels)
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;

    // For rotation: draw full image rotated onto a temp canvas first
    const isRotated = rotation === 90 || rotation === 270;
    const fullW = isRotated ? nh : nw;
    const fullH = isRotated ? nw : nh;

    // Limit temp canvas to avoid mobile memory crashes (max 4096px)
    const maxCanvas = 4096;
    const canvasScale = Math.min(1, maxCanvas / Math.max(fullW, fullH));
    const scaledW = Math.round(fullW * canvasScale);
    const scaledH = Math.round(fullH * canvasScale);

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = scaledW;
    tempCanvas.height = scaledH;
    const tctx = tempCanvas.getContext("2d");
    if (!tctx) { onConfirm(file); return; }

    tctx.translate(scaledW / 2, scaledH / 2);
    tctx.rotate((rotation * Math.PI) / 180);
    const drawW = nw * canvasScale;
    const drawH = nh * canvasScale;
    tctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

    // Extract crop region from the rotated image
    const sx = (crop.x / 100) * scaledW;
    const sy = (crop.y / 100) * scaledH;
    const sw = (crop.w / 100) * scaledW;
    const sh = (crop.h / 100) * scaledH;

    // Output canvas — max 2048px for OCR
    const maxDim = 2048;
    const outScale = Math.min(1, maxDim / Math.max(sw, sh));
    canvas.width = Math.max(1, Math.round(sw * outScale));
    canvas.height = Math.max(1, Math.round(sh * outScale));

    ctx.drawImage(tempCanvas, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) { onConfirm(file); return; }
        onConfirm(
          new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
            type: "image/jpeg",
            lastModified: Date.now(),
          })
        );
      },
      "image/jpeg",
      0.9
    );
  };

  // Dark overlay path (everything outside the crop)
  const overlayPath = imgDisplay.w > 0
    ? `M${imgDisplay.x},${imgDisplay.y} h${imgDisplay.w} v${imgDisplay.h} h${-imgDisplay.w}Z ` +
      `M${pxRect.left},${pxRect.top} v${pxRect.height} h${pxRect.width} v${-pxRect.height}Z`
    : "";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/90">
          <button onClick={onCancel} className="p-2 text-white/70 hover:text-white">
            <X size={24} />
          </button>
          <h3 className="text-white font-bold flex items-center gap-2">
            <Crop size={18} /> Crop & Scan
          </h3>
          <div className="w-10" /> {/* spacer */}
        </div>

        {/* Image + crop overlay */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-black"
          style={{ touchAction: "none" }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Image */}
          {imgSrc && (
            <img
              src={imgSrc}
              alt="Preview"
              className="absolute pointer-events-none select-none"
              style={{
                left: imgDisplay.x,
                top: imgDisplay.y,
                width: imgDisplay.w,
                height: imgDisplay.h,
                transform: `rotate(${rotation}deg)`,
                transformOrigin: "center center",
                objectFit: "contain",
              }}
              draggable={false}
            />
          )}

          {/* Dark overlay outside crop */}
          {imgDisplay.w > 0 && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
              <path d={overlayPath} fill="rgba(0,0,0,0.55)" fillRule="evenodd" />
            </svg>
          )}

          {/* Crop border + handles */}
          {imgDisplay.w > 0 && (
            <div style={{ position: "absolute", zIndex: 2, ...pxRectToStyle(pxRect) }}>
              {/* Move handle (entire crop area) */}
              <div
                className="absolute inset-0 cursor-move"
                onPointerDown={(e) => handlePointerDown(e, "move")}
              />

              {/* Border */}
              <div className="absolute inset-0 border-2 border-white rounded-sm pointer-events-none" />

              {/* Grid lines (rule of thirds) */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
              </div>

              {/* Corner handles */}
              {(["tl", "tr", "bl", "br"] as const).map((corner) => (
                <div
                  key={corner}
                  onPointerDown={(e) => handlePointerDown(e, corner)}
                  className="absolute bg-[var(--vb-surface)] rounded-full shadow-lg border-2 border-emerald-500"
                  style={{
                    width: HANDLE_SIZE,
                    height: HANDLE_SIZE,
                    ...(corner.includes("t") ? { top: -HANDLE_SIZE / 2 } : { bottom: -HANDLE_SIZE / 2 }),
                    ...(corner.includes("l") ? { left: -HANDLE_SIZE / 2 } : { right: -HANDLE_SIZE / 2 }),
                    cursor: corner === "tl" || corner === "br" ? "nwse-resize" : "nesw-resize",
                    zIndex: 3,
                  }}
                />
              ))}
            </div>
          )}

          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm">
              Loading image...
            </div>
          )}
        </div>

        {/* Tools bar */}
        <div className="flex items-center justify-center gap-6 px-4 py-3 bg-black/90">
          <button onClick={rotate90} className="flex flex-col items-center gap-1 p-2 text-white/70 hover:text-white active:scale-90 transition-all">
            <RotateCw size={22} />
            <span className="text-[10px] font-bold">Rotate</span>
          </button>
          <button onClick={resetCrop} className="flex flex-col items-center gap-1 p-2 text-white/70 hover:text-white active:scale-90 transition-all">
            <Maximize size={22} />
            <span className="text-[10px] font-bold">Full image</span>
          </button>
        </div>

        {/* Bottom actions */}
        <div className="flex gap-3 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-black/90">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 bg-white/10 text-white rounded-2xl font-bold text-sm active:scale-95 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Check size={18} /> Scan Words
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Helper: convert pxRect to CSS style object
function pxRectToStyle(r: { left: number; top: number; width: number; height: number }) {
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}
