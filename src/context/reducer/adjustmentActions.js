import { defaultAdjustments } from "./constants";

export function reduceAdjustmentActions(state, action) {
  switch (action.type) {
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

    default:
      return null;
  }
}
