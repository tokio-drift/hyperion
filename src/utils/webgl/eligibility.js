export function shouldUseWebGLForAdjustments(masks = []) {
  if (!Array.isArray(masks) || masks.length === 0) return true;

  for (const mask of masks) {
    if (!mask?.visible) continue;
    const adjustments = mask.adjustments || {};
    if (Object.values(adjustments).some((value) => value !== 0)) {
      return false;
    }
  }

  return true;
}
