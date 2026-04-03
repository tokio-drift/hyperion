/**
 * formatValidation.js
 * File type and size validation for image uploads.
 */

export const ACCEPTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
]);

export const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024; // 30 MB

export const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];

/**
 * Validate a single File object.
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateFile(file) {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return {
      valid: false,
      error: `Unsupported format. Please upload JPEG, PNG, WEBP, GIF, or BMP.`,
    };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `"${file.name}" exceeds the 30 MB limit.`,
    };
  }
  return { valid: true };
}

/**
 * Validate a list of files, returning valid files and error messages.
 */
export function validateFiles(files) {
  const valid = [];
  const errors = [];

  for (const file of files) {
    const result = validateFile(file);
    if (result.valid) {
      valid.push(file);
    } else {
      errors.push(result.error);
    }
  }

  return { valid, errors };
}
