/**
 * exportUtils.js
 * Utilities for exporting canvas data to image files.
 */

/**
 * Convert ImageData to a Blob of the given format/quality.
 */
export function imageDataToBlob(imageData, format = 'image/jpeg', quality = 0.92) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width  = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      },
      format,
      quality
    );
  });
}

/**
 * Trigger a browser download from a Blob.
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get the file extension for a MIME type.
 */
export function mimeToExtension(mime) {
  const map = {
    'image/jpeg': 'jpg',
    'image/png':  'png',
    'image/webp': 'webp',
  };
  return map[mime] || 'jpg';
}

/**
 * Strip the original extension from a filename and replace with new one.
 */
export function replaceExtension(filename, newExt) {
  const dot = filename.lastIndexOf('.');
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  return `${base}.${newExt}`;
}
