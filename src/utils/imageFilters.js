import { rgbToHsl, hslToRgb } from './colourUtils.js';
export const clamp = (x) => Math.max(0, Math.min(255, Math.round(x)));
const clamp01 = (x) => Math.max(0, Math.min(1, x));
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

export function applyTemperature(data, v) {
  if (v === 0) return;
  const shift = v * 1.2;
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = clamp(data[i] + shift);    
    data[i + 2] = clamp(data[i + 2] - shift);
  }
}

export function applyTint(data, v) {
  if (v === 0) return;
  const shift = v * 0.8;
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = clamp(data[i] + shift);
    data[i + 1] = clamp(data[i + 1] - shift); 
    data[i + 2] = clamp(data[i + 2] + shift); 
  }
}

export function applyColourGroup(data, hue, saturation, vibrance) {
  if (hue === 0 && saturation === 0 && vibrance === 0) return;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    let { h, s, l } = rgbToHsl(r, g, b);
    if (s < 0.01 && hue !== 0 && saturation === 0 && vibrance === 0) {
      continue;
    }

    if (hue !== 0) {
      h = (h + hue + 360) % 360;
    }

    if (saturation !== 0) {
      if (saturation >= 0) {
        s = s + (1 - s) * (saturation / 100);
      } else {
        s = s + s * (saturation / 100);
      }
    }

    if (vibrance !== 0) {
      let scale = (1 - s) * (vibrance / 100);
      if (vibrance >= 0) {
        if (h >= 20 && h <= 40) scale *= 0.7;
        s = s + scale;
      } else {
        s = s + s * (vibrance / 100);
      }
    }

    s = clamp01(s);
    const rgb = hslToRgb(h, s, l);
    
    data[i]     = rgb.r;
    data[i + 1] = rgb.g;
    data[i + 2] = rgb.b;
  }
}
export function applyVignette(data, width, height, vignetteAmount, vignetteMidpoint, vignetteRoundness, vignetteFeather) {
  if (vignetteAmount === 0) return;

  const cx = width / 2;
  const cy = height / 2;
  const maxDim = Math.max(cx, cy);
  const midpoint = vignetteMidpoint / 100; // 0-1 range
  const feather = Math.max(0.01, vignetteFeather / 100); // avoid div-by-zero
  const roundness = vignetteRoundness / 100; // -1 to 1
  const strength = Math.abs(vignetteAmount) / 100;
  const isBlack = vignetteAmount < 0;

  // Roundness controls aspect ratio of the vignette ellipse
  // 0 = follows image aspect, positive = more circular, negative = more rectangular
  const aspectX = cx / maxDim;
  const aspectY = cy / maxDim;
  const rx = roundness >= 0 ? aspectX + (1 - aspectX) * roundness : aspectX * (1 + roundness);
  const ry = roundness >= 0 ? aspectY + (1 - aspectY) * roundness : aspectY * (1 + roundness);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = (x - cx) / (cx * (rx || 0.01));
      const ny = (y - cy) / (cy * (ry || 0.01));
      const dist = Math.sqrt(nx * nx + ny * ny);

      // Vignette starts at midpoint, full effect at midpoint + feather
      const start = midpoint;
      const end = midpoint + feather;
      let factor = 0;
      if (dist > start) {
        factor = Math.min(1, (dist - start) / (end - start));
      }

      if (factor <= 0) continue;

      const vigAmount = factor * strength;
      const idx = (y * width + x) * 4;

      if (isBlack) {
        data[idx]     = clamp(data[idx]     * (1 - vigAmount));
        data[idx + 1] = clamp(data[idx + 1] * (1 - vigAmount));
        data[idx + 2] = clamp(data[idx + 2] * (1 - vigAmount));
      } else {
        data[idx]     = clamp(data[idx]     + (255 - data[idx])     * vigAmount);
        data[idx + 1] = clamp(data[idx + 1] + (255 - data[idx + 1]) * vigAmount);
        data[idx + 2] = clamp(data[idx + 2] + (255 - data[idx + 2]) * vigAmount);
      }
    }
  }
}

export function applyAllAdjustments(originalData, adjustments) {
  const {
    exposure = 0, brightness = 0, contrast = 0,
    highlights = 0, shadows = 0, whites = 0, blacks = 0,
    temperature = 0, tint = 0, hue = 0, saturation = 0, vibrance = 0,
    vignetteAmount = 0, vignetteMidpoint = 50, vignetteRoundness = 0, vignetteFeather = 50,
  } = adjustments;

  const buffer = new Uint8ClampedArray(originalData.data);
  
  applyExposure(buffer, exposure);
  applyBrightness(buffer, brightness);
  applyContrast(buffer, contrast);
  applyHighlights(buffer, highlights);
  applyShadows(buffer, shadows);
  applyWhites(buffer, whites);
  applyBlacks(buffer, blacks);
  applyTemperature(buffer, temperature);
  applyTint(buffer, tint);
  applyColourGroup(buffer, hue, saturation, vibrance);
  applyVignette(buffer, originalData.width, originalData.height, vignetteAmount, vignetteMidpoint, vignetteRoundness, vignetteFeather);

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