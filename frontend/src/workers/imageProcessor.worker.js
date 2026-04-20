import { 
  applyTemperature, 
  applyTint, 
  applyColourGroup 
} from '../utils/imageFilters.js';

// ── Inline tonal filters to prevent context switching overhead ─────────
const clamp = (x) => Math.max(0, Math.min(255, Math.round(x)));
const luma  = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

function applyExposure(data, v) {
  if (v === 0) return;
  const factor = Math.pow(2, (v / 100) * 3.32);
  for (let i = 0; i < data.length; i += 4) {
    data[i]   = clamp(data[i]   * factor);
    data[i+1] = clamp(data[i+1] * factor);
    data[i+2] = clamp(data[i+2] * factor);
  }
}

function applyBrightness(data, v) {
  if (v === 0) return;
  const offset = v * 2.55;
  for (let i = 0; i < data.length; i += 4) {
    data[i]   = clamp(data[i]   + offset);
    data[i+1] = clamp(data[i+1] + offset);
    data[i+2] = clamp(data[i+2] + offset);
  }
}

function applyContrast(data, v) {
  if (v === 0) return;
  const factor = (259 * (v + 255)) / (255 * (259 - v));
  for (let i = 0; i < data.length; i += 4) {
    data[i]   = clamp(factor * (data[i]   - 128) + 128);
    data[i+1] = clamp(factor * (data[i+1] - 128) + 128);
    data[i+2] = clamp(factor * (data[i+2] - 128) + 128);
  }
}

function applyHighlights(data, v) {
  if (v === 0) return;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i+1], b = data[i+2];
    const l = luma(r, g, b);
    if (l > 192) {
      const t = (l - 192) / 63;
      const shift = v * t * 0.8;
      data[i]   = clamp(r + shift);
      data[i+1] = clamp(g + shift);
      data[i+2] = clamp(b + shift);
    }
  }
}

function applyShadows(data, v) {
  if (v === 0) return;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i+1], b = data[i+2];
    const l = luma(r, g, b);
    if (l < 64) {
      const t = (64 - l) / 64;
      const shift = v * t * 0.8;
      data[i]   = clamp(r + shift);
      data[i+1] = clamp(g + shift);
      data[i+2] = clamp(b + shift);
    }
  }
}

function applyWhites(data, v) {
  if (v === 0) return;
  const shift = v * 0.6;
  for (let i = 0; i < data.length; i += 4) {
    const l = luma(data[i], data[i+1], data[i+2]);
    if (l > 220) {
      data[i]   = clamp(data[i]   + shift);
      data[i+1] = clamp(data[i+1] + shift);
      data[i+2] = clamp(data[i+2] + shift);
    }
  }
}

function applyBlacks(data, v) {
  if (v === 0) return;
  const shift = v * 0.6;
  for (let i = 0; i < data.length; i += 4) {
    const l = luma(data[i], data[i+1], data[i+2]);
    if (l < 30) {
      data[i]   = clamp(data[i]   + shift);
      data[i+1] = clamp(data[i+1] + shift);
      data[i+2] = clamp(data[i+2] + shift);
    }
  }
}

function applyVignette(data, width, height, vignetteAmount, vignetteMidpoint, vignetteRoundness, vignetteFeather) {
  if (vignetteAmount === 0) return;

  const cx = width / 2;
  const cy = height / 2;
  const maxDim = Math.max(cx, cy);
  const midpoint = vignetteMidpoint / 100;
  const feather = Math.max(0.01, vignetteFeather / 100);
  const roundness = vignetteRoundness / 100;
  const strength = Math.abs(vignetteAmount) / 100;
  const isBlack = vignetteAmount < 0;

  const aspectX = cx / maxDim;
  const aspectY = cy / maxDim;
  const rx = roundness >= 0 ? aspectX + (1 - aspectX) * roundness : aspectX * (1 + roundness);
  const ry = roundness >= 0 ? aspectY + (1 - aspectY) * roundness : aspectY * (1 + roundness);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = (x - cx) / (cx * (rx || 0.01));
      const ny = (y - cy) / (cy * (ry || 0.01));
      const dist = Math.sqrt(nx * nx + ny * ny);

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
        data[idx]   = clamp(data[idx]   * (1 - vigAmount));
        data[idx+1] = clamp(data[idx+1] * (1 - vigAmount));
        data[idx+2] = clamp(data[idx+2] * (1 - vigAmount));
      } else {
        data[idx]   = clamp(data[idx]   + (255 - data[idx])   * vigAmount);
        data[idx+1] = clamp(data[idx+1] + (255 - data[idx+1]) * vigAmount);
        data[idx+2] = clamp(data[idx+2] + (255 - data[idx+2]) * vigAmount);
      }
    }
  }
}

function rotatePixels(data, width, height, direction) {
  const result = new Uint8ClampedArray(width * height * 4);
  const newW = height;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      let dstX, dstY;
      if (direction === 'cw') { dstX = height - 1 - y; dstY = x; }
      else                    { dstX = y; dstY = width - 1 - x; }
      const dstIdx = (dstY * newW + dstX) * 4;
      result[dstIdx]   = data[srcIdx];
      result[dstIdx+1] = data[srcIdx+1];
      result[dstIdx+2] = data[srcIdx+2];
      result[dstIdx+3] = data[srcIdx+3];
    }
  }
  return { data: result, width: newW, height: width };
}

function cropPixels(data, srcWidth, x, y, cw, ch) {
  const result = new Uint8ClampedArray(cw * ch * 4);
  for (let row = 0; row < ch; row++) {
    for (let col = 0; col < cw; col++) {
      const srcIdx = ((y + row) * srcWidth + (x + col)) * 4;
      const dstIdx = (row * cw + col) * 4;
      result[dstIdx]   = data[srcIdx];
      result[dstIdx+1] = data[srcIdx+1];
      result[dstIdx+2] = data[srcIdx+2];
      result[dstIdx+3] = data[srcIdx+3];
    }
  }
  return result;
}

function applyAllAdjustments(buffer, width, height, adjustments = {}) {
  const {
    exposure=0, brightness=0, contrast=0,
    highlights=0, shadows=0, whites=0, blacks=0,
    temperature=0, tint=0, hue=0, saturation=0, vibrance=0,
    vignetteAmount=0, vignetteMidpoint=50, vignetteRoundness=0, vignetteFeather=50,
  } = adjustments;

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
  applyVignette(buffer, width, height, vignetteAmount, vignetteMidpoint, vignetteRoundness, vignetteFeather);
}

function hasNonZeroAdjustments(adjustments = {}) {
  return Object.values(adjustments).some((v) => v !== 0);
}

function blendMasksIntoBuffer(buffer, width, height, masks) {
  if (!Array.isArray(masks) || masks.length === 0) return;

  for (const mask of masks) {
    if (!mask?.visible) continue;

    const mAdj = mask.adjustments || {};
    if (!hasNonZeroAdjustments(mAdj)) continue;

    const maskData = mask.maskData;
    const hasPaintedPixels = maskData.some(v => v > 0);
    if (!hasPaintedPixels && !mask.inverted) continue;

    const scratchBuffer = new Uint8ClampedArray(buffer);
    applyAllAdjustments(scratchBuffer, width, height, mAdj);

    for (let i = 0; i < buffer.length; i += 4) {
      const pixelIdx = i / 4;
      let maskVal = maskData[pixelIdx];
      if (mask.inverted) maskVal = 255 - maskVal;

      if (maskVal === 0) continue;

      if (maskVal === 255) {
        buffer[i]   = scratchBuffer[i];
        buffer[i+1] = scratchBuffer[i+1];
        buffer[i+2] = scratchBuffer[i+2];
      } else {
        const t = maskVal / 255;
        buffer[i]   = Math.round(buffer[i]   + (scratchBuffer[i]   - buffer[i])   * t);
        buffer[i+1] = Math.round(buffer[i+1] + (scratchBuffer[i+1] - buffer[i+1]) * t);
        buffer[i+2] = Math.round(buffer[i+2] + (scratchBuffer[i+2] - buffer[i+2]) * t);
      }
    }
  }
}

self.onmessage = function (e) {
  const msg = e.data;

  try {
    if (msg.type === 'PROCESS') {
      const { id, pixelData, width, height, adjustments, masks } = msg;
      const buffer = new Uint8ClampedArray(pixelData);

      applyAllAdjustments(buffer, width, height, adjustments);
      blendMasksIntoBuffer(buffer, width, height, masks);

      self.postMessage(
        { type: 'DONE', id, pixelData: buffer.buffer, width, height },
        [buffer.buffer]
      );

    } else if (msg.type === 'PROCESS_CHUNK') {
      const { id, chunkIndex, pixelData, adjustments, masks, chunkWidth, chunkHeight } = msg;
      const buffer = new Uint8ClampedArray(pixelData);
      const w = chunkWidth || (buffer.length / 4 / (chunkHeight || 1));

      applyAllAdjustments(buffer, w, chunkHeight || (buffer.length / 4 / w), adjustments);
      blendMasksIntoBuffer(buffer, w, chunkHeight || (buffer.length / 4 / w), masks);

      self.postMessage(
        {
          type: 'DONE',
          id,
          chunkIndex,
          pixelData: buffer.buffer,
        },
        [buffer.buffer]
      );

    } else if (msg.type === 'ROTATE') {
      const { id, pixelData, width, height, direction } = msg;
      const result = rotatePixels(new Uint8ClampedArray(pixelData), width, height, direction);
      self.postMessage(
        { type: 'DONE', id, pixelData: result.data.buffer, width: result.width, height: result.height },
        [result.data.buffer]
      );

    } else if (msg.type === 'CROP') {
      const { id, pixelData, width, x, y, cw, ch } = msg;
      const result = cropPixels(new Uint8ClampedArray(pixelData), width, x, y, cw, ch);
      self.postMessage(
        { type: 'DONE', id, pixelData: result.buffer, width: cw, height: ch },
        [result.buffer]
      );
    }
  } catch (err) {
    self.postMessage({ type: 'ERROR', id: msg.id, message: err.message });
  }
};