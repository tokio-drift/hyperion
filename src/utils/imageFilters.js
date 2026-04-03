/**
 * imageFilters.js
 * Pure pixel-manipulation functions operating on Uint8ClampedArray (RGBA).
 * Each function mutates the data in-place for performance.
 * Call order: exposure -> brightness -> contrast -> highlights -> shadows -> whites -> blacks
 */

export const clamp = (x) => Math.max(0, Math.min(255, Math.round(x)));
const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

export function applyExposure(data, v) {
  if (v === 0) return;
  const factor = Math.pow(2, (v / 100) * 3.32);
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = clamp(data[i]     * factor);
    data[i + 1] = clamp(data[i + 1] * factor);
    data[i + 2] = clamp(data[i + 2] * factor);
  }
}

export function applyBrightness(data, v) {
  if (v === 0) return;
  const offset = v * 2.55;
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = clamp(data[i]     + offset);
    data[i + 1] = clamp(data[i + 1] + offset);
    data[i + 2] = clamp(data[i + 2] + offset);
  }
}

export function applyContrast(data, v) {
  if (v === 0) return;
  const factor = (259 * (v + 255)) / (255 * (259 - v));
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = clamp(factor * (data[i]     - 128) + 128);
    data[i + 1] = clamp(factor * (data[i + 1] - 128) + 128);
    data[i + 2] = clamp(factor * (data[i + 2] - 128) + 128);
  }
}

export function applyHighlights(data, v) {
  if (v === 0) return;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const l = luma(r, g, b);
    if (l > 192) {
      const t = (l - 192) / 63;
      const shift = v * t * 0.8;
      data[i]     = clamp(r + shift);
      data[i + 1] = clamp(g + shift);
      data[i + 2] = clamp(b + shift);
    }
  }
}

export function applyShadows(data, v) {
  if (v === 0) return;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const l = luma(r, g, b);
    if (l < 64) {
      const t = (64 - l) / 64;
      const shift = v * t * 0.8;
      data[i]     = clamp(r + shift);
      data[i + 1] = clamp(g + shift);
      data[i + 2] = clamp(b + shift);
    }
  }
}

export function applyWhites(data, v) {
  if (v === 0) return;
  const shift = v * 0.6;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const l = luma(r, g, b);
    if (l > 220) {
      data[i]     = clamp(r + shift);
      data[i + 1] = clamp(g + shift);
      data[i + 2] = clamp(b + shift);
    }
  }
}

export function applyBlacks(data, v) {
  if (v === 0) return;
  const shift = v * 0.6;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const l = luma(r, g, b);
    if (l < 30) {
      data[i]     = clamp(r + shift);
      data[i + 1] = clamp(g + shift);
      data[i + 2] = clamp(b + shift);
    }
  }
}

export function applyAllAdjustments(originalData, adjustments) {
  const {
    exposure = 0, brightness = 0, contrast = 0,
    highlights = 0, shadows = 0, whites = 0, blacks = 0,
  } = adjustments;

  const buffer = new Uint8ClampedArray(originalData.data);
  const allZero = [exposure, brightness, contrast, highlights, shadows, whites, blacks].every(v => v === 0);

  if (!allZero) {
    applyExposure(buffer, exposure);
    applyBrightness(buffer, brightness);
    applyContrast(buffer, contrast);
    applyHighlights(buffer, highlights);
    applyShadows(buffer, shadows);
    applyWhites(buffer, whites);
    applyBlacks(buffer, blacks);
  }

  return new ImageData(buffer, originalData.width, originalData.height);
}

export function rotateImageData(imageData, direction) {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(width * height * 4);
  const newW = height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      let dstX, dstY;
      if (direction === 'cw') {
        dstX = height - 1 - y;
        dstY = x;
      } else {
        dstX = y;
        dstY = width - 1 - x;
      }
      const dstIdx = (dstY * newW + dstX) * 4;
      result[dstIdx]     = data[srcIdx];
      result[dstIdx + 1] = data[srcIdx + 1];
      result[dstIdx + 2] = data[srcIdx + 2];
      result[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  return new ImageData(result, newW, width);
}

export function cropImageData(imageData, x, y, cw, ch) {
  const { width, data } = imageData;
  const result = new Uint8ClampedArray(cw * ch * 4);
  for (let row = 0; row < ch; row++) {
    for (let col = 0; col < cw; col++) {
      const srcIdx = ((y + row) * width + (x + col)) * 4;
      const dstIdx = (row * cw + col) * 4;
      result[dstIdx]     = data[srcIdx];
      result[dstIdx + 1] = data[srcIdx + 1];
      result[dstIdx + 2] = data[srcIdx + 2];
      result[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  return new ImageData(result, cw, ch);
}
