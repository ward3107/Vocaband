/**
 * Compress an image file using the Canvas API before upload.
 *
 * Anthropic's Vision API has a 5 MB base64 limit (~3.7 MB raw file).
 * Mobile camera photos are typically 3-12 MB, so we ALWAYS resize to
 * max 1500px and re-encode as JPEG at quality 0.80. This keeps OCR
 * accuracy high while ensuring the file stays well under the API limit.
 *
 * Falls back to the original file if compression fails (e.g. in a
 * browser without Canvas support).
 */
export async function compressImageForUpload(
  file: File,
  maxDimension = 1500,
  quality = 0.80,
): Promise<File> {
  // Always compress — even "small" files may exceed the 5MB base64 limit
  // when encoded. A 3MB JPEG becomes ~4MB base64.
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
            if (!blob || blob.size >= file.size) {
              // Compression made it bigger (rare) — use original
              resolve(file);
              return;
            }
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
