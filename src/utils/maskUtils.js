export function createEmptyMask(width, height) {
  return new Uint8Array(width * height);
}

export function paintStroke(maskData, width, height, x, y, brushSettings) {
  const { size, feather, opacity, tool } = brushSettings;
  const radius = size / 2;
  const featherRadius = feather / 2;
  const hardRadius = radius - featherRadius;
  const opacityFactor = opacity / 100;
  const isPaint = tool === 'paint';

  const minX = Math.max(0, Math.floor(x - radius));
  const maxX = Math.min(width - 1, Math.ceil(x + radius));
  const minY = Math.max(0, Math.floor(y - radius));
  const maxY = Math.min(height - 1, Math.ceil(y + radius));

  let isDirty = false;

  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      const dist = Math.sqrt(Math.pow(px - x, 2) + Math.pow(py - y, 2));
      if (dist > radius) continue;

      let falloff = 1.0;
      if (featherRadius > 0 && dist > hardRadius) {
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
  return {
    x: Math.floor(imageX),
    y: Math.floor(imageY)
  };
}