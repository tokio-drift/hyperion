import { useRef, useEffect, useCallback } from "react";
import { paintStroke, paintStrokeInterpolated, paintRadialGradient, paintLinearGradient } from "../utils/maskUtils";

export function useMaskStrokeHandlers({ activeImage, brushSettings, dispatch }) {
  const strokeAccumulator = useRef(null);
  const activeMaskRef = useRef(null);
  const lastMaskDispatchRef = useRef(0);
  const lastPointRef = useRef(null);
  const startPointRef = useRef(null);
  const originalMaskDataRef = useRef(null);

  useEffect(() => {
    if (activeImage?.activeMaskId) {
      activeMaskRef.current = activeImage.masks.find(
        (m) => m.id === activeImage.activeMaskId,
      );
    } else {
      activeMaskRef.current = null;
      strokeAccumulator.current = null;
      lastPointRef.current = null;
      startPointRef.current = null;
      originalMaskDataRef.current = null;
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
      originalMaskDataRef.current = new Uint8Array(activeMaskRef.current.maskData);
      strokeAccumulator.current = new Uint8Array(activeMaskRef.current.maskData);
      startPointRef.current = { x: ix, y: iy };
      lastPointRef.current = { x: ix, y: iy };
      
      if (brushSettings.tool === 'paint' || brushSettings.tool === 'erase') {
        paintStroke(
          strokeAccumulator.current,
          activeImage.width,
          activeImage.height,
          ix,
          iy,
          brushSettings,
        );
        dispatchMaskUpdate();
      }
      lastMaskDispatchRef.current = performance.now();
    },
    [activeImage, brushSettings, dispatchMaskUpdate],
  );

  const handleStrokeMove = useCallback(
    (ix, iy) => {
      if (!strokeAccumulator.current || !activeMaskRef.current || !activeImage) {
        return;
      }
      
      let changed = false;
      if (brushSettings.tool === 'paint' || brushSettings.tool === 'erase') {
        const lastPoint = lastPointRef.current || { x: ix, y: iy };
        changed = paintStrokeInterpolated(
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
      } else if (brushSettings.tool === 'radial' || brushSettings.tool === 'linear') {
        // Reset to original before drawing new gradient
        strokeAccumulator.current.set(originalMaskDataRef.current);
        const startPoint = startPointRef.current;
        if (brushSettings.tool === 'radial') {
          changed = paintRadialGradient(
            strokeAccumulator.current,
            activeImage.width,
            activeImage.height,
            startPoint.x,
            startPoint.y,
            ix,
            iy,
            brushSettings
          );
        } else {
          changed = paintLinearGradient(
            strokeAccumulator.current,
            activeImage.width,
            activeImage.height,
            startPoint.x,
            startPoint.y,
            ix,
            iy,
            brushSettings
          );
        }
      }
      
      if (!changed) return;

      const now = performance.now();
      // Radial/linear are full-image ops — throttle harder to avoid lag
      const throttleMs = (brushSettings.tool === 'radial' || brushSettings.tool === 'linear') ? 50 : 16;
      if (now - lastMaskDispatchRef.current >= throttleMs) {
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
      startPointRef.current = null;
      originalMaskDataRef.current = null;
      return;
    }

    dispatchMaskUpdate();
    dispatch({
      type: "PUSH_HISTORY",
      payload: {
        imageId: activeImage.id,
        label: `Mask Tool (${brushSettings.tool})`,
      },
    });
    strokeAccumulator.current = null;
    lastPointRef.current = null;
    startPointRef.current = null;
    originalMaskDataRef.current = null;
  }, [activeImage, brushSettings.tool, dispatch, dispatchMaskUpdate]);

  return {
    activeMaskRef,
    handleStrokeStart,
    handleStrokeMove,
    handleStrokeEnd,
  };
}