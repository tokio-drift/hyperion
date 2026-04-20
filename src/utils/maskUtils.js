export function createEmptyMask(width, height) {
  return new Uint8Array(width * height);
}

export function rotateMask(maskData, width, height, direction) {
  const newW = height;
  const newH = width;
  const result = new Uint8Array(newW * newH);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = y * width + x;
      let dstX, dstY;
      if (direction === 'cw') {
        dstX = height - 1 - y;
        dstY = x;
      } else {
        dstX = y;
        dstY = width - 1 - x;
      }
      result[dstY * newW + dstX] = maskData[srcIdx];
    }
  }
  return { data: result, width: newW, height: newH };
}

export function paintStroke(maskData, width, height, x, y, brushSettings) {
  const { size, feather, opacity, tool } = brushSettings;
  const radius = size / 2;
  const radiusSq = radius * radius;
  const featherRadius = feather / 2;
  const hardRadius = radius - featherRadius;
  const hardRadiusSq = hardRadius * hardRadius;
  const opacityFactor = opacity / 100;
  const isPaint = tool === 'paint';

  const minX = Math.max(0, Math.floor(x - radius));
  const maxX = Math.min(width - 1, Math.ceil(x + radius));
  const minY = Math.max(0, Math.floor(y - radius));
  const maxY = Math.min(height - 1, Math.ceil(y + radius));

  let isDirty = false;

  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      const dx = px - x;
      const dy = py - y;
      const distSq = dx * dx + dy * dy;
      if (distSq > radiusSq) continue;

      let falloff = 1.0;
      if (featherRadius > 0 && distSq > hardRadiusSq) {
        const dist = Math.sqrt(distSq);
        falloff = 1 - (dist - hardRadius) / featherRadius;
      }

      const alpha = Math.round(255 * opacityFactor * falloff);
      const idx = py * width + px;
      const current = maskData[idx];

      if (isPaint) {
        const newVal = Math.min(255, current + alpha);
        if (newVal !== current) {
          maskData[idx] = newVal;
          isDirty = true;
        }
      } else {
        const newVal = Math.max(0, current - alpha);
        if (newVal !== current) {
          maskData[idx] = newVal;
          isDirty = true;
        }
      }
    }
  }
  return isDirty;
}

export function paintStrokeInterpolated(
  maskData,
  width,
  height,
  fromX,
  fromY,
  toX,
  toY,
  brushSettings,
) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.hypot(dx, dy);

  if (distance === 0) {
    return paintStroke(maskData, width, height, toX, toY, brushSettings);
  }

  // Stamp along the segment to avoid gaps at high pointer speeds.
  const spacing = Math.max(1, brushSettings.size * 0.05); // Smoother interpolation
  const steps = Math.ceil(distance / spacing);
  let changed = false;

  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const x = fromX + dx * t;
    const y = fromY + dy * t;
    if (paintStroke(maskData, width, height, x, y, brushSettings)) {
      changed = true;
    }
  }

  return changed;
}

export function invertMask(maskData) {
  const result = new Uint8Array(maskData.length);
  for (let i = 0; i < maskData.length; i++) {
    result[i] = 255 - maskData[i];
  }
  return result;
}

export function getMaskPixelValue(maskData, inverted, x, y, width) {
  const raw = maskData[y * width + x];
  return inverted ? (255 - raw) : raw;
}

export function canvasToImageCoords(canvasX, canvasY, imageRect) {
  const imageX = (canvasX - imageRect.css_ox) / imageRect.cssScale;
  const imageY = (canvasY - imageRect.css_oy) / imageRect.cssScale;

  const maxX = Number.isFinite(imageRect.iW) ? imageRect.iW - 1 : imageX;
  const maxY = Number.isFinite(imageRect.iH) ? imageRect.iH - 1 : imageY;

  return {
    x: Math.max(0, Math.min(maxX, imageX)),
    y: Math.max(0, Math.min(maxY, imageY)),
  };
}

export function paintRadialGradient(maskData, width, height, fromX, fromY, toX, toY, brushSettings) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const radiusSq = dx * dx + dy * dy;
  if (radiusSq === 0) return false;
  const radius = Math.sqrt(radiusSq);

  const featherRatio = brushSettings.feather / 100;
  const hardRadius = radius * (1 - featherRatio);
  const hardRadiusSq = hardRadius * hardRadius;
  const featherRange = radius - hardRadius;
  const opacityFactor = brushSettings.opacity / 100;

  const minX = Math.max(0, (fromX - radius) | 0);
  const maxX = Math.min(width - 1, (fromX + radius + 1) | 0);
  const minY = Math.max(0, (fromY - radius) | 0);
  const maxY = Math.min(height - 1, (fromY + radius + 1) | 0);

  let isDirty = false;
  for (let py = minY; py <= maxY; py++) {
    const rowDy = py - fromY;
    const rowDySq = rowDy * rowDy;
    const rowOff = py * width;
    for (let px = minX; px <= maxX; px++) {
      const pxDx = px - fromX;
      const distSq = pxDx * pxDx + rowDySq;
      if (distSq > radiusSq) continue;

      let falloff = 1.0;
      if (featherRatio > 0 && distSq > hardRadiusSq) {
        falloff = 1 - (Math.sqrt(distSq) - hardRadius) / featherRange;
      }

      const alpha = (255 * opacityFactor * falloff + 0.5) | 0;
      const idx = rowOff + px;
      const current = maskData[idx];
      const newVal = current + alpha;
      if (newVal > current) {
        maskData[idx] = newVal > 255 ? 255 : newVal;
        isDirty = true;
      }
    }
  }
  return isDirty;
}

export function paintLinearGradient(maskData, width, height, fromX, fromY, toX, toY, brushSettings) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return false;

  const opacityFactor = brushSettings.opacity / 100;
  const invLenSq = 1 / lengthSq;

  let isDirty = false;
  for (let py = 0; py < height; py++) {
    const vy = py - fromY;
    const vyDy = vy * dy;
    const rowOff = py * width;
    for (let px = 0; px < width; px++) {
      const vx = px - fromX;
      const t = (vx * dx + vyDy) * invLenSq;

      if (t < 0 || t > 1) continue;

      const falloff = 1.0 - t;
      const alpha = (255 * opacityFactor * falloff + 0.5) | 0;
      if (alpha <= 0) continue;

      const idx = rowOff + px;
      const current = maskData[idx];
      const newVal = current + alpha;
      if (newVal > current) {
        maskData[idx] = newVal > 255 ? 255 : newVal;
        isDirty = true;
      }
    }
  }
  return isDirty;
}