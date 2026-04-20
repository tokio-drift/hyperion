import { defaultAdjustments } from "./constants";
import { makeEntry } from "../../utils/historyUtils";

export function reduceImageActions(state, action) {
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
        const initialCrop = crop[img.id] || {
          active: false,
          x: 0,
          y: 0,
          width: img.width,
          height: img.height,
          aspectRatio: null,
        };
        if (!crop[img.id]) crop[img.id] = initialCrop;
        if (!img.masks) {
          img.masks = [];
          img.activeMaskId = null;
        }
        if (!hist[img.id]) {
          hist[img.id] = [
            makeEntry(
              "Image loaded",
              defaultAdjustments,
              initialCrop,
              img.originalData || null,
              img.masks || [],
            ),
          ];
          histIdx[img.id] = 0;
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

    case "UPDATE_IMAGE_DATA": {
      const { imageId, originalData, width, height } = action.payload;
      return {
        ...state,
        images: state.images.map((img) =>
          img.id === imageId ? { ...img, originalData, width, height } : img,
        ),
      };
    }

    case "RESTORE_SESSION": {
      const {
        adjustments,
        crop,
        activeImageId,
        brushSettings,
        showMaskOverlay,
        ui,
      } = action.payload;

      const resolvedActiveId =
        state.images.find((img) => img.id === activeImageId)?.id ||
        state.activeImageId ||
        state.images[0]?.id ||
        null;

      return {
        ...state,
        activeImageId: resolvedActiveId,
        adjustments: adjustments || state.adjustments,
        crop: crop || state.crop,
        brushSettings: brushSettings
          ? { ...state.brushSettings, ...brushSettings }
          : state.brushSettings,
        showMaskOverlay:
          typeof showMaskOverlay === "boolean"
            ? showMaskOverlay
            : state.showMaskOverlay,
        ui: ui
          ? {
              ...state.ui,
              ...ui,
              exportModalOpen: false,
            }
          : state.ui,
        compareMode: false,
        maskMode: false,
      };
    }

    default:
      return null;
  }
}
