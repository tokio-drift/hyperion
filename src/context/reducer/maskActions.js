import { defaultAdjustments } from "./constants";

export function reduceMaskActions(state, action) {
  switch (action.type) {
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
      return null;
  }
}
