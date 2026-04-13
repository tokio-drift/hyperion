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

    default:
      return null;
  }
}
