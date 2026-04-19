import { useRef, useEffect, useCallback } from "react";
import { createWebGLImageProcessor } from "../../utils/webglProcessor";

export function useWebGLProcessing({
  latestProcessIdRef,
  processedRef,
  drawRef,
  pendingRef,
  onBackendChange,
}) {
  const processorRef = useRef(null);
  const webglEnabledRef = useRef(false);

  useEffect(() => {
    try {
      const processor = createWebGLImageProcessor();
      processorRef.current = processor;
      webglEnabledRef.current = !!processor;
    } catch {
      processorRef.current = null;
      webglEnabledRef.current = false;
    }

    return () => {
      if (processorRef.current) {
        processorRef.current.destroy();
      }
      processorRef.current = null;
      webglEnabledRef.current = false;
    };
  }, []);

  const tryProcessWithWebGL = useCallback(
    (originalData, adjustments, masks, id) => {
      const processor = processorRef.current;
      if (!processor || !webglEnabledRef.current) return false;

      try {
        pendingRef.current = null;
        const result = processor.process(originalData, adjustments, masks);
        if (id !== latestProcessIdRef.current) return true;
        processedRef.current = result;
        onBackendChange?.("gpu");
        if (drawRef.current) drawRef.current();
        return true;
      } catch {
        webglEnabledRef.current = false;
        if (processorRef.current) {
          processorRef.current.destroy();
        }
        processorRef.current = null;
        return false;
      }
    },
    [drawRef, latestProcessIdRef, onBackendChange, pendingRef, processedRef],
  );

  return {
    tryProcessWithWebGL,
  };
}
