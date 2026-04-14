/**
 * Optional image compression before upload.
 *
 * With Gemini Flash OCR, the server accepts images up to 20MB natively —
 * so compression is NO LONGER required for the API to work. This function
 * just speeds up uploads on slow mobile connections by compressing files
 * over 4MB. Always falls back to the original file if compression fails.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  // Skip compression for files under 4MB — upload time is fine
  if (file.size <= 4 * 1024 * 1024) return file;

  // Try modern createImageBitmap API (handles large photos reliably)
  try {
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(file);
      const maxDim = 1800;
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      const w = Math.round(bitmap.width * scale);
      const h = Math.round(bitmap.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { bitmap.close?.(); return file; }

      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close?.();

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.85)
      );
      if (blob && blob.size < file.size) {
        return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
      }
    }
  } catch {
    // Fall through to original file — Gemini will handle it
  }

  return file;
}
