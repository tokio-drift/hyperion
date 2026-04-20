/**
 * Deep-clone mask array for history snapshots.
 * We store a lightweight copy: id, label, inverted, visible, adjustments,
 * and a *copy* of the Uint8Array maskData so undo/redo can restore brush strokes.
 */
function cloneMasks(masks) {
  if (!Array.isArray(masks) || masks.length === 0) return [];
  return masks.map(m => ({
    id: m.id,
    label: m.label,
    inverted: m.inverted,
    visible: m.visible,
    revision: m.revision || 0,
    adjustments: { ...m.adjustments },
    maskData: new Uint8Array(m.maskData),
  }));
}

export function makeEntry(label, adjustments, crop, originalData, masks) {
  return {
    timestamp: Date.now(),
    label,
    adjustments: { ...adjustments },
    crop: crop ? { ...crop } : null,
    originalData: originalData || null,
    masks: cloneMasks(masks),
  };
}

export function pushHistory(entries, index, newEntry) {
  const trimmed = entries.slice(0, index + 1);
  const updated = [...trimmed, newEntry];
  return { entries: updated, index: updated.length - 1 };
}