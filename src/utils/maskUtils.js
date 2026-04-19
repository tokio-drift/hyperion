export function createEmptyMask(width, height) {
  return new Uint8Array(width * height);
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
  const spacing = Math.max(1, brushSettings.size * 0.15);
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