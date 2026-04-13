import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
} from "react";

export const defaultAdjustments = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  brightness: 0,
  hue: 0,
  saturation: 0,
  vibrance: 0,
  temperature: 0,
  tint: 0,
};

const initialState = {
  images: [],
  activeImageId: null,
  adjustments: {},
  crop: {},
  history: {},
  historyIndex: {},
  compareMode: false,
  ui: {
    sidePanelOpen: true,
    activePanelTab: "tonal",
    exportModalOpen: false,
  },
  toasts: [],
  maskMode: false,
  brushSettings: { size: 40, feather: 20, opacity: 100, tool: "paint" },
  showMaskOverlay: true,
};

const MAX_HISTORY = 10;

function makeEntry(label, adjustments, crop, originalData) {
  return {
    timestamp: Date.now(),
    label,
    adjustments: { ...adjustments },
    crop: crop ? { ...crop } : null,
    originalData: originalData || null,
  };
}

function pushHistory(entries, index, newEntry) {
  const trimmed = entries.slice(0, index + 1);
  const updated = [...trimmed, newEntry].slice(-MAX_HISTORY);
  return { entries: updated, index: updated.length - 1 };
}

function editorReducer(state, action) {
  switch (action.type) {
    case "LOAD_IMAGES": {
      const newImages = action.payload;
      const merged = [...state.images];
      const adj = { ...state.adjustments };
      const crop = { ...state.crop };
      const hist = { ...state.history };
      const histIdx = { ...state.historyIndex };

      for (const img of newImages) {
        if (!merged.find((m) => m.id === img.id)) merged.push(img);
        if (!adj[img.id]) adj[img.id] = { ...defaultAdjustments };
        if (!crop[img.id])
          crop[img.id] = {
            active: false,
            x: 0,
            y: 0,
            width: img.width,
            height: img.height,
            aspectRatio: null,
          };
        if (!img.masks) {
          img.masks = [];
          img.activeMaskId = null;
        }
        if (!hist[img.id]) {
          hist[img.id] = [];
          histIdx[img.id] = -1;
        }
      }

      return {
        ...state,
        images: merged,
        activeImageId: state.activeImageId || newImages[0]?.id || null,
        adjustments: adj,
        crop,
        history: hist,
        historyIndex: histIdx,
      };
    }

    case "SET_ACTIVE_IMAGE":
      return { ...state, activeImageId: action.payload };

    case "UPDATE_ADJUSTMENT": {
      const { imageId, key, value } = action.payload;
      return {
        ...state,
        adjustments: {
          ...state.adjustments,
          [imageId]: {
            ...(state.adjustments[imageId] || defaultAdjustments),
            [key]: value,
          },
        },
      };
    }

    case "RESET_ADJUSTMENTS": {
      const { imageId } = action.payload;
      return {
        ...state,
        adjustments: {
          ...state.adjustments,
          [imageId]: { ...defaultAdjustments },
        },
      };
    }
    case "RESET_COLOUR_ADJUSTMENTS": {
      const { imageId } = action.payload;
      const current = state.adjustments[imageId] || defaultAdjustments;
      return {
        ...state,
        adjustments: {
          ...state.adjustments,
          [imageId]: {
            ...current,
            hue: 0,
            saturation: 0,
            vibrance: 0,
            temperature: 0,
            tint: 0,
          },
        },
      };
    }
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
      // If the entry we're going back to has a stored originalData, restore it
      // (this happens when undoing past a rotate)
      const imageUpdate = entry.originalData
        ? {
            images: state.images.map((img) =>
              img.id === imageId
                ? { ...img, originalData: entry.originalData, width: entry.originalData.width, height: entry.originalData.height }
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
      // If redoing into a rotate or crop entry, restore the post-operation pixel data
      const postOperationData = entry.postRotateData || entry.postCropData;
      const imageUpdate = postOperationData
        ? {
            images: state.images.map((img) =>
              img.id === imageId
                ? { ...img, originalData: postOperationData, width: postOperationData.width, height: postOperationData.height }
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

    case "SET_CROP": {
      const { imageId, cropState } = action.payload;
      return {
        ...state,
        crop: {
          ...state.crop,
          [imageId]: { ...state.crop[imageId], ...cropState },
        },
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

    case "CANCEL_CROP": {
      const { imageId } = action.payload;
      return {
        ...state,
        crop: {
          ...state.crop,
          [imageId]: { ...state.crop[imageId], active: false },
        },
      };
    }

    case "ROTATE_IMAGE": {
      const { imageId, direction } = action.payload;
      const label = direction === "cw" ? "Rotate 90° CW" : "Rotate 90° CCW";
      // Capture the pre-rotation originalData so undo can restore it
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
      // After a rotate/crop completes, we patch the latest history entry with the
      // new (post-operation) pixel data so that REDO can restore it correctly.
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

    case "UPDATE_IMAGE_DATA": {
      const { imageId, originalData, width, height } = action.payload;
      return {
        ...state,
        images: state.images.map((img) =>
          img.id === imageId ? { ...img, originalData, width, height } : img,
        ),
      };
    }

    case "TOGGLE_COMPARE":
      return { ...state, compareMode: action.payload ?? !state.compareMode };

    case "TOGGLE_SIDE_PANEL":
      return {
        ...state,
        ui: { ...state.ui, sidePanelOpen: !state.ui.sidePanelOpen },
      };

    case "SET_PANEL_TAB":
      return { ...state, ui: { ...state.ui, activePanelTab: action.payload } };

    case "OPEN_EXPORT_MODAL":
      return { ...state, ui: { ...state.ui, exportModalOpen: true } };

    case "CLOSE_EXPORT_MODAL":
      return { ...state, ui: { ...state.ui, exportModalOpen: false } };

    case "ADD_TOAST": {
      const toast = {
        id: action.payload.id || `${Date.now()}`,
        message: action.payload.message,
        type: action.payload.type || "info",
      };
      return { ...state, toasts: [...state.toasts, toast] };
    }

    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.payload),
      };

    case "ADD_MASK": {
      const { imageId } = action.payload;
      return {
        ...state,
        images: state.images.map((img) => {
          if (img.id !== imageId) return img;
          const newMask = {
            id: `mask-${Date.now()}`,
            label: `Mask ${img.masks.length + 1}`,
            maskData: new Uint8Array(img.width * img.height),
            adjustments: { ...defaultAdjustments },
            inverted: false,
            visible: true,
            isDirty: false,
          };
          return {
            ...img,
            masks: [...img.masks, newMask],
            activeMaskId: newMask.id,
          };
        }),
      };
    }

    case "DELETE_MASK": {
      const { imageId, maskId } = action.payload;
      return {
        ...state,
        images: state.images.map((img) => {
          if (img.id !== imageId) return img;
          const newMasks = img.masks.filter((m) => m.id !== maskId);
          return {
            ...img,
            masks: newMasks,
            activeMaskId:
              newMasks.length > 0 ? newMasks[newMasks.length - 1].id : null,
          };
        }),
      };
    }

    case "SET_ACTIVE_MASK": {
      const { imageId, maskId } = action.payload;
      return {
        ...state,
        images: state.images.map((img) =>
          img.id === imageId ? { ...img, activeMaskId: maskId } : img,
        ),
      };
    }

    case "UPDATE_MASK_DATA": {
      const { imageId, maskId, newMaskData, isDirty } = action.payload;
      return {
        ...state,
        images: state.images.map((img) => {
          if (img.id !== imageId) return img;
          return {
            ...img,
            masks: img.masks.map((m) =>
              m.id === maskId ? { ...m, maskData: newMaskData, isDirty } : m,
            ),
          };
        }),
      };
    }

    case "UPDATE_MASK_ADJUSTMENT": {
      const { imageId, maskId, key, value } = action.payload;
      return {
        ...state,
        images: state.images.map((img) => {
          if (img.id !== imageId) return img;
          return {
            ...img,
            masks: img.masks.map((m) =>
              m.id === maskId
                ? { ...m, adjustments: { ...m.adjustments, [key]: value } }
                : m,
            ),
          };
        }),
      };
    }

    case "RESET_MASK_ADJUSTMENTS": {
      const { imageId, maskId } = action.payload;
      return {
        ...state,
        images: state.images.map((img) => {
          if (img.id !== imageId) return img;
          return {
            ...img,
            masks: img.masks.map((m) =>
              m.id === maskId
                ? { ...m, adjustments: { ...defaultAdjustments } }
                : m,
            ),
          };
        }),
      };
    }

    case "INVERT_MASK": {
      const { imageId, maskId } = action.payload;
      return {
        ...state,
        images: state.images.map((img) => {
          if (img.id !== imageId) return img;
          return {
            ...img,
            masks: img.masks.map((m) =>
              m.id === maskId ? { ...m, inverted: !m.inverted } : m,
            ),
          };
        }),
      };
    }

    case "TOGGLE_MASK_VISIBLE": {
      const { imageId, maskId } = action.payload;
      return {
        ...state,
        images: state.images.map((img) => {
          if (img.id !== imageId) return img;
          return {
            ...img,
            masks: img.masks.map((m) =>
              m.id === maskId ? { ...m, visible: !m.visible } : m,
            ),
          };
        }),
      };
    }

    case "SET_MASK_MODE":
      return { ...state, maskMode: action.payload };

    case "UPDATE_BRUSH":
      return {
        ...state,
        brushSettings: { ...state.brushSettings, ...action.payload },
      };

    case "TOGGLE_MASK_OVERLAY":
      return { ...state, showMaskOverlay: !state.showMaskOverlay };
    default:
      return state;
  }
}

const EditorContext = createContext(null);

export function EditorProvider({ children }) {
  const [state, dispatch] = useReducer(editorReducer, initialState);

  const activeImage =
    state.images.find((img) => img.id === state.activeImageId) || null;
  const activeAdjustments = state.activeImageId
    ? state.adjustments[state.activeImageId] || { ...defaultAdjustments }
    : { ...defaultAdjustments };
  const activeCrop = state.activeImageId
    ? state.crop[state.activeImageId] || null
    : null;
  const activeHistory = state.activeImageId
    ? state.history[state.activeImageId] || []
    : [];
  const activeHistoryIndex = state.activeImageId
    ? (state.historyIndex[state.activeImageId] ?? -1)
    : -1;
  const canUndo = activeHistoryIndex > 0;
  const canRedo = activeHistoryIndex < activeHistory.length - 1;

  const showToast = useCallback((message, type = "info", duration = 3500) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    dispatch({ type: "ADD_TOAST", payload: { id, message, type } });
    setTimeout(() => dispatch({ type: "REMOVE_TOAST", payload: id }), duration);
  }, []);

  return (
    <EditorContext.Provider
      value={{
        state,
        dispatch,
        activeImage,
        activeAdjustments,
        activeCrop,
        activeHistory,
        activeHistoryIndex,
        canUndo,
        canRedo,
        showToast,
        defaultAdjustments,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be inside EditorProvider");
  return ctx;
}
