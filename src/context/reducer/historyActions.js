import { defaultAdjustments } from "./constants";
import { makeEntry, pushHistory } from "../../utils/historyUtils";

export function reduceHistoryActions(state, action) {
  switch (action.type) {
    case "PUSH_HISTORY": {
      const { imageId, label } = action.payload;
      const entry = makeEntry(
        label,
        state.adjustments[imageId] || defaultAdjustments,
        state.crop[imageId],
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
      const imageUpdate = entry.originalData
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
      return {
        ...state,
        ...imageUpdate,
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
      const imageUpdate = postOperationData
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
      return {
        ...state,
        ...imageUpdate,
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
      return {
        ...state,
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
