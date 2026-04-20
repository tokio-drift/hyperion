import { defaultAdjustments } from "./constants";
import { makeEntry, pushHistory } from "../../utils/historyUtils";

/**
 * Helper: restore masks from a history entry onto the image object.
 * Returns updated images array, or empty object if no mask snapshot.
 */
function restoreMasksFromEntry(state, imageId, entry) {
  if (!entry.masks || entry.masks.length === 0) {
    // Entry has no mask snapshot — clear masks
    return {
      images: state.images.map((img) =>
        img.id === imageId
          ? { ...img, masks: [], activeMaskId: null }
          : img,
      ),
    };
  }

  // Deep-clone saved masks so they are independent from the history entry
  const restoredMasks = entry.masks.map((m) => ({
    ...m,
    adjustments: { ...m.adjustments },
    maskData: new Uint8Array(m.maskData),
  }));
  const lastActiveMask = restoredMasks[restoredMasks.length - 1];

  return {
    images: state.images.map((img) =>
      img.id === imageId
        ? { ...img, masks: restoredMasks, activeMaskId: lastActiveMask?.id || null }
        : img,
    ),
  };
}

function getCurrentMasks(state, imageId) {
  const img = state.images.find((i) => i.id === imageId);
  return img?.masks || [];
}

export function reduceHistoryActions(state, action) {
  switch (action.type) {
    case "PUSH_HISTORY": {
      const { imageId, label } = action.payload;
      const entry = makeEntry(
        label,
        state.adjustments[imageId] || defaultAdjustments,
        state.crop[imageId],
        null, // only destructive ops store originalData
        getCurrentMasks(state, imageId),
      );
      const { entries, index } = pushHistory(
        state.history[imageId] || [],
        state.historyIndex[imageId] ?? -1,
        entry,
      );
      return {
        ...state,
        history: { ...state.history, [imageId]: entries },
        historyIndex: { ...state.historyIndex, [imageId]: index },
      };
    }

    case "UNDO": {
      const { imageId } = action.payload;
      const idx = state.historyIndex[imageId] ?? -1;
      if (idx <= 0) return state;
      const prevIdx = idx - 1;
      const entry = state.history[imageId][prevIdx];
      const imageDataUpdate = entry.originalData
        ? {
            images: state.images.map((img) =>
              img.id === imageId
                ? {
                    ...img,
                    originalData: entry.originalData,
                    width: entry.originalData.width,
                    height: entry.originalData.height,
                  }
                : img,
            ),
          }
        : {};
      // Restore masks from the entry
      const maskUpdate = entry.masks ? restoreMasksFromEntry(state, imageId, entry) : {};
      // If both imageDataUpdate and maskUpdate touch `images`, merge them
      let mergedImages = state.images;
      if (imageDataUpdate.images && maskUpdate.images) {
        mergedImages = state.images.map((img) => {
          if (img.id !== imageId) return img;
          const fromData = imageDataUpdate.images.find((i) => i.id === imageId) || img;
          const fromMask = maskUpdate.images.find((i) => i.id === imageId) || img;
          return { ...fromData, masks: fromMask.masks, activeMaskId: fromMask.activeMaskId };
        });
      } else if (imageDataUpdate.images) {
        mergedImages = imageDataUpdate.images;
      } else if (maskUpdate.images) {
        mergedImages = maskUpdate.images;
      }

      return {
        ...state,
        images: mergedImages,
        adjustments: {
          ...state.adjustments,
          [imageId]: { ...entry.adjustments },
        },
        ...(entry.crop
          ? { crop: { ...state.crop, [imageId]: { ...entry.crop } } }
          : {}),
        historyIndex: { ...state.historyIndex, [imageId]: prevIdx },
      };
    }

    case "REDO": {
      const { imageId } = action.payload;
      const entries = state.history[imageId] || [];
      const idx = state.historyIndex[imageId] ?? -1;
      if (idx >= entries.length - 1) return state;
      const nextIdx = idx + 1;
      const entry = entries[nextIdx];
      const postOperationData = entry.postRotateData || entry.postCropData;
      const imageDataUpdate = postOperationData
        ? {
            images: state.images.map((img) =>
              img.id === imageId
                ? {
                    ...img,
                    originalData: postOperationData,
                    width: postOperationData.width,
                    height: postOperationData.height,
                  }
                : img,
            ),
          }
        : {};
      const maskUpdate = entry.masks ? restoreMasksFromEntry(state, imageId, entry) : {};
      let mergedImages = state.images;
      if (imageDataUpdate.images && maskUpdate.images) {
        mergedImages = state.images.map((img) => {
          if (img.id !== imageId) return img;
          const fromData = imageDataUpdate.images.find((i) => i.id === imageId) || img;
          const fromMask = maskUpdate.images.find((i) => i.id === imageId) || img;
          return { ...fromData, masks: fromMask.masks, activeMaskId: fromMask.activeMaskId };
        });
      } else if (imageDataUpdate.images) {
        mergedImages = imageDataUpdate.images;
      } else if (maskUpdate.images) {
        mergedImages = maskUpdate.images;
      }

      return {
        ...state,
        images: mergedImages,
        adjustments: {
          ...state.adjustments,
          [imageId]: { ...entry.adjustments },
        },
        ...(entry.crop
          ? { crop: { ...state.crop, [imageId]: { ...entry.crop } } }
          : {}),
        historyIndex: { ...state.historyIndex, [imageId]: nextIdx },
      };
    }

    case "JUMP_HISTORY": {
      const { imageId, index } = action.payload;
      const entries = state.history[imageId] || [];
      if (index < 0 || index >= entries.length) return state;
      const entry = entries[index];

      // Check if we need to restore pixel data.
      // Walk forward from entry 0 to `index` to find the latest pixel data snapshot.
      let pixelData = null;
      for (let i = index; i >= 0; i--) {
        const e = entries[i];
        if (e.postRotateData || e.postCropData) {
          pixelData = e.postRotateData || e.postCropData;
          break;
        }
        if (e.originalData) {
          pixelData = e.originalData;
          break;
        }
      }

      const imageDataUpdate = pixelData
        ? {
            images: state.images.map((img) =>
              img.id === imageId
                ? { ...img, originalData: pixelData, width: pixelData.width, height: pixelData.height }
                : img,
            ),
          }
        : {};
      const maskUpdate = entry.masks ? restoreMasksFromEntry(state, imageId, entry) : {};
      let mergedImages = state.images;
      if (imageDataUpdate.images && maskUpdate.images) {
        mergedImages = state.images.map((img) => {
          if (img.id !== imageId) return img;
          const fromData = imageDataUpdate.images.find((i) => i.id === imageId) || img;
          const fromMask = maskUpdate.images.find((i) => i.id === imageId) || img;
          return { ...fromData, masks: fromMask.masks, activeMaskId: fromMask.activeMaskId };
        });
      } else if (imageDataUpdate.images) {
        mergedImages = imageDataUpdate.images;
      } else if (maskUpdate.images) {
        mergedImages = maskUpdate.images;
      }

      return {
        ...state,
        images: mergedImages,
        adjustments: {
          ...state.adjustments,
          [imageId]: { ...entry.adjustments },
        },
        ...(entry.crop
          ? { crop: { ...state.crop, [imageId]: { ...entry.crop } } }
          : {}),
        historyIndex: { ...state.historyIndex, [imageId]: index },
      };
    }

    case "CLEAR_HISTORY": {
      const { imageId } = action.payload;
      return {
        ...state,
        history: { ...state.history, [imageId]: [] },
        historyIndex: { ...state.historyIndex, [imageId]: -1 },
      };
    }

    case "APPLY_CROP": {
      const { imageId, preCropData } = action.payload;
      const crop = state.crop[imageId];
      const entry = makeEntry(
        "Crop applied",
        state.adjustments[imageId] || defaultAdjustments,
        crop,
        preCropData || null,
        getCurrentMasks(state, imageId),
      );
      const { entries, index } = pushHistory(
        state.history[imageId] || [],
        state.historyIndex[imageId] ?? -1,
        entry,
      );
      return {
        ...state,
        crop: { ...state.crop, [imageId]: { ...crop, active: false } },
        history: { ...state.history, [imageId]: entries },
        historyIndex: { ...state.historyIndex, [imageId]: index },
      };
    }

    case "ROTATE_IMAGE": {
      const { imageId, direction } = action.payload;
      const label = direction === "cw" ? "Rotate 90° CW" : "Rotate 90° CCW";
      const preRotateImage = state.images.find((img) => img.id === imageId);
      const entry = makeEntry(
        label,
        state.adjustments[imageId] || defaultAdjustments,
        state.crop[imageId],
        preRotateImage?.originalData || null,
        getCurrentMasks(state, imageId),
      );
      const { entries, index } = pushHistory(
        state.history[imageId] || [],
        state.historyIndex[imageId] ?? -1,
        entry,
      );
      return {
        ...state,
        history: { ...state.history, [imageId]: entries },
        historyIndex: { ...state.historyIndex, [imageId]: index },
      };
    }

    case "PATCH_HISTORY_IMAGE_DATA": {
      const { imageId, postRotateData, postCropData } = action.payload;
      const entries = state.history[imageId] || [];
      const idx = state.historyIndex[imageId] ?? -1;
      if (idx < 0 || idx >= entries.length) return state;
      const updatedEntries = entries.map((entry, i) =>
        i === idx
          ? {
              ...entry,
              ...(postRotateData ? { postRotateData } : {}),
              ...(postCropData ? { postCropData } : {}),
            }
          : entry,
      );
      return {
        ...state,
        history: { ...state.history, [imageId]: updatedEntries },
      };
    }

    default:
      return null;
  }
}
