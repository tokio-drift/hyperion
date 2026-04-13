const MAX_HISTORY = 10;

export function makeEntry(label, adjustments, crop, originalData) {
  return {
    timestamp: Date.now(),
    label,
    adjustments: { ...adjustments },
    crop: crop ? { ...crop } : null,
    originalData: originalData || null,
  };
}

export function pushHistory(entries, index, newEntry) {
  const trimmed = entries.slice(0, index + 1);
  const updated = [...trimmed, newEntry].slice(-MAX_HISTORY);
  return { entries: updated, index: updated.length - 1 };
}