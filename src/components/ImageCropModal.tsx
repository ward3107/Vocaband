import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RotateCw, ZoomIn, ZoomOut, Crop, X, Check } from "lucide-react";

interface ImageCropModalProps {
  file: File;
  onConfirm: (croppedFile: File) => void;
  onCancel: () => void;
}

export default function ImageCropModal({ file, onConfirm, onCancel }: ImageCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  // Load image from file
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImageLoaded(true);
    };
    img.src = URL.createObjectURL(file);
    return () => URL.revokeObjectURL(img.src);
  }, [file]);

  // Draw image on canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const container = containerRef.current;
    const cw = container?.clientWidth || 350;
    const ch = container?.clientHeight || 400;
    canvas.width = cw;
    canvas.height = ch;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, cw, ch);
    ctx.save();
    ctx.translate(cw / 2 + offset.x, ch / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Fit image within canvas
    const scale = Math.min(cw / img.width, ch / img.height) * 0.9;
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }, [rotation, zoom, offset]);

  useEffect(() => {
    if (imageLoaded) draw();
  }, [imageLoaded, draw]);

  // Touch/mouse drag
  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handlePointerUp = () => setDragging(false);

  const rotate90 = () => setRotation((r) => (r + 90) % 360);
  const zoomIn = () => setZoom((z) => Math.min(z + 0.25, 4));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) { onConfirm(file); return; }

    canvas.toBlob(
      (blob) => {
        if (!blob) { onConfirm(file); return; }
        const croppedFile = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        onConfirm(croppedFile);
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
            <h3 className="text-lg font-black text-stone-800 flex items-center gap-2">
              <Crop size={20} className="text-emerald-600" /> Edit Image
            </h3>
            <button onClick={onCancel} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
              <X size={20} className="text-stone-400" />
            </button>
          </div>

          {/* Canvas preview */}
          <div
            ref={containerRef}
            className="relative bg-stone-900 w-full"
            style={{ height: "55vh", maxHeight: 450, touchAction: "none" }}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-grab active:cursor-grabbing"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm">
                Loading image...
              </div>
            )}
          </div>

          {/* Tools */}
          <div className="flex items-center justify-center gap-3 px-5 py-3 bg-stone-50">
            <button onClick={rotate90} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white transition-colors" title="Rotate">
              <RotateCw size={22} className="text-stone-600" />
              <span className="text-[10px] font-bold text-stone-400">Rotate</span>
            </button>
            <button onClick={zoomIn} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white transition-colors" title="Zoom in">
              <ZoomIn size={22} className="text-stone-600" />
              <span className="text-[10px] font-bold text-stone-400">Zoom +</span>
            </button>
            <button onClick={zoomOut} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white transition-colors" title="Zoom out">
              <ZoomOut size={22} className="text-stone-600" />
              <span className="text-[10px] font-bold text-stone-400">Zoom −</span>
            </button>
            <button onClick={resetView} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white transition-colors" title="Reset">
              <span className="text-lg">↺</span>
              <span className="text-[10px] font-bold text-stone-400">Reset</span>
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 px-5 py-4">
            <button
              onClick={onCancel}
              className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-2xl font-bold text-sm hover:bg-stone-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-bold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Check size={18} /> Scan Words
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
