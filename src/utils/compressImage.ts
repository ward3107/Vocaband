/**
 * Compress an image file using the Canvas API before upload.
 *
 * Mobile camera photos are typically 3-8 MB, which exceeds OCR upload limits.
 * This resizes to a max dimension (default 2048px) and re-encodes as JPEG at
 * quality 0.85, which keeps OCR accuracy high while bringing most photos under
 * 1-2 MB. Falls back to the original file if compression fails (e.g. in a
 * browser without Canvas support).
 */
export async function compressImageForUpload(
  file: File,
  maxDimension = 2048,
  quality = 0.85,
): Promise<File> {
  // Skip if already small enough (under 3 MB)
  if (file.size <= 3 * 1024 * 1024) return file;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;

        // Scale down to maxDimension while preserving aspect ratio
        if (width > maxDimension || height > maxDimension) {
          const scale = maxDimension / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(file); return; }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            // Return compressed file with the same name
            resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            }));
          },
          'image/jpeg',
          quality,
        );
      } catch {
        resolve(file); // fallback to original
      }
    };
    img.onerror = () => resolve(file); // fallback to original
    img.src = URL.createObjectURL(file);
  });
}
