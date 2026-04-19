const MIN_PIXELS_PER_WORKER = 512 * 512;

export function getTargetWorkerCount(width, height, maxWorkers) {
  const pixelCount = width * height;
  const bySize = Math.max(1, Math.ceil(pixelCount / MIN_PIXELS_PER_WORKER));
  return Math.max(1, Math.min(maxWorkers, bySize));
}

function hasNonZeroAdjustments(adjustments = {}) {
  return Object.values(adjustments).some((value) => value !== 0);
}

export function buildChunkMasks(masks, startRow, chunkHeight, width) {
  if (!Array.isArray(masks) || masks.length === 0) return [];

  const start = startRow * width;
  const end = start + chunkHeight * width;
  const chunkMasks = [];

  for (const mask of masks) {
    if (!mask?.visible) continue;

    const maskAdjustments = mask.adjustments || {};
    if (!hasNonZeroAdjustments(maskAdjustments)) continue;
    if (!mask.maskData || typeof mask.maskData.slice !== "function") continue;

    const sliced = mask.maskData.slice(start, end);
    const maskData =
      sliced instanceof Uint8ClampedArray
        ? sliced
        : new Uint8ClampedArray(sliced);

    if (!mask.inverted && !maskData.some((value) => value > 0)) continue;

    chunkMasks.push({
      visible: true,
      inverted: !!mask.inverted,
      adjustments: maskAdjustments,
      maskData,
    });
  }

  return chunkMasks;
}
