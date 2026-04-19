import { useRef, useEffect, useCallback } from "react";
import { paintStroke, paintStrokeInterpolated } from "../utils/maskUtils";

export function useMaskStrokeHandlers({ activeImage, brushSettings, dispatch }) {
  const strokeAccumulator = useRef(null);
  const activeMaskRef = useRef(null);
  const lastMaskDispatchRef = useRef(0);
  const lastPointRef = useRef(null);

  useEffect(() => {
    if (activeImage?.activeMaskId) {
      activeMaskRef.current = activeImage.masks.find(
        (m) => m.id === activeImage.activeMaskId,
      );
    } else {
      activeMaskRef.current = null;
      strokeAccumulator.current = null;
      lastPointRef.current = null;
    }
  }, [activeImage]);

  const dispatchMaskUpdate = useCallback(() => {
    if (!activeImage || !activeMaskRef.current || !strokeAccumulator.current) return;

    dispatch({
      type: "UPDATE_MASK_DATA",
      payload: {
        imageId: activeImage.id,
        maskId: activeMaskRef.current.id,
        newMaskData: strokeAccumulator.current,
      },
    });
  }, [activeImage, dispatch]);

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
      lastPointRef.current = { x: ix, y: iy };
      lastMaskDispatchRef.current = performance.now();
      dispatchMaskUpdate();
    },
    [activeImage, brushSettings, dispatchMaskUpdate],
  );

  const handleStrokeMove = useCallback(
    (ix, iy) => {
      if (!strokeAccumulator.current || !activeMaskRef.current || !activeImage) {
        return;
      }
      const lastPoint = lastPointRef.current || { x: ix, y: iy };
      const changed = paintStrokeInterpolated(
        strokeAccumulator.current,
        activeImage.width,
        activeImage.height,
        lastPoint.x,
        lastPoint.y,
        ix,
        iy,
        brushSettings,
      );
      lastPointRef.current = { x: ix, y: iy };
      if (!changed) return;

      const now = performance.now();
      if (now - lastMaskDispatchRef.current >= 16) {
        lastMaskDispatchRef.current = now;
        dispatchMaskUpdate();
      }
    },
    [activeImage, brushSettings, dispatchMaskUpdate],
  );

  const handleStrokeEnd = useCallback(() => {
    if (!activeImage || !activeMaskRef.current || !strokeAccumulator.current) {
      strokeAccumulator.current = null;
      lastPointRef.current = null;
      return;
    }

    dispatchMaskUpdate();
    dispatch({
      type: "PUSH_HISTORY",
      payload: {
        imageId: activeImage.id,
        label: `Brush stroke (${brushSettings.tool})`,
      },
    });
    strokeAccumulator.current = null;
    lastPointRef.current = null;
  }, [activeImage, brushSettings.tool, dispatch, dispatchMaskUpdate]);

  return {
    activeMaskRef,
    handleStrokeStart,
    handleStrokeMove,
    handleStrokeEnd,
  };
}