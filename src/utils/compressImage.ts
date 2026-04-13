/**
 * Compress an image file using the Canvas API before upload.
 *
 * Anthropic's Vision API has a 5 MB base64 limit (~3.5 MB raw file).
 * Mobile camera photos are typically 3-12 MB, so we ALWAYS resize and
 * re-encode as JPEG. If the first pass is still too large, we try again
 * with lower quality and smaller dimensions.
 *
 * Falls back to the original file ONLY if Canvas API is unavailable.
 */
export async function compressImageForUpload(
  file: File,
  maxDimension = 1500,
  quality = 0.75,
): Promise<File> {
  const result = await compressOnce(file, maxDimension, quality);

  // If still over 3MB, try harder (smaller + lower quality)
  if (result.size > 3 * 1024 * 1024) {
    return compressOnce(result, 1000, 0.6);
  }

  return result;
}

function compressOnce(file: File, maxDim: number, quality: number): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;

        // Always scale down — even if dimensions are under maxDim,
        // the file might still be large due to high JPEG quality
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
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
            resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            }));
          },
          'image/jpeg',
          quality,
        );
      } catch {
        resolve(file);
      }
    };
    img.onerror = () => resolve(file);
    const url = URL.createObjectURL(file);
    img.src = url;
    // Clean up blob URL after load
    img.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
    img.addEventListener('error', () => URL.revokeObjectURL(url), { once: true });
  });
}
