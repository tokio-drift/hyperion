import { useRef, useEffect, useCallback } from "react";
import { paintStroke } from "../utils/maskUtils";

export function useMaskStrokeHandlers({ activeImage, brushSettings, dispatch }) {
  const strokeAccumulator = useRef(null);
  const activeMaskRef = useRef(null);
  const lastMaskDispatchRef = useRef(0);

  useEffect(() => {
    if (activeImage?.activeMaskId) {
      activeMaskRef.current = activeImage.masks.find(
        (m) => m.id === activeImage.activeMaskId,
      );
    } else {
      activeMaskRef.current = null;
    }
  }, [activeImage]);

  const handleStrokeStart = useCallback(
    (ix, iy) => {
      if (!activeMaskRef.current || !activeImage) return;
      strokeAccumulator.current = new Uint8Array(activeMaskRef.current.maskData);
      paintStroke(
        strokeAccumulator.current,
        activeImage.width,
        activeImage.height,
        ix,
        iy,
        brushSettings,
      );
      lastMaskDispatchRef.current = Date.now();
      dispatch({
        type: "UPDATE_MASK_DATA",
        payload: {
          imageId: activeImage.id,
          maskId: activeMaskRef.current.id,
          newMaskData: strokeAccumulator.current,
          isDirty: true,
        },
      });
    },
    [activeImage, brushSettings, dispatch],
  );

  const handleStrokeMove = useCallback(
    (ix, iy) => {
      if (!strokeAccumulator.current || !activeMaskRef.current || !activeImage) {
        return;
      }
      const changed = paintStroke(
        strokeAccumulator.current,
        activeImage.width,
        activeImage.height,
        ix,
        iy,
        brushSettings,
      );
      if (!changed) return;

      const now = Date.now();
      if (now - lastMaskDispatchRef.current >= 50) {
        lastMaskDispatchRef.current = now;
        dispatch({
          type: "UPDATE_MASK_DATA",
          payload: {
            imageId: activeImage.id,
            maskId: activeMaskRef.current.id,
            newMaskData: strokeAccumulator.current,
            isDirty: true,
          },
        });
      }
    },
    [activeImage, brushSettings, dispatch],
  );

  const handleStrokeEnd = useCallback(() => {
    if (!activeImage || !activeMaskRef.current || !strokeAccumulator.current) {
      strokeAccumulator.current = null;
      return;
    }

    dispatch({
      type: "UPDATE_MASK_DATA",
      payload: {
        imageId: activeImage.id,
        maskId: activeMaskRef.current.id,
        newMaskData: strokeAccumulator.current,
        isDirty: true,
      },
    });
    dispatch({
      type: "PUSH_HISTORY",
      payload: {
        imageId: activeImage.id,
        label: `Brush stroke (${brushSettings.tool})`,
      },
    });
    strokeAccumulator.current = null;
  }, [activeImage, brushSettings.tool, dispatch]);

  return {
    activeMaskRef,
    handleStrokeStart,
    handleStrokeMove,
    handleStrokeEnd,
  };
}