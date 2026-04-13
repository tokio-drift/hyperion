import { useRef, useEffect, useCallback, useMemo } from "react";
import {
  debounce,
  drawCheckerboard,
  drawImage,
  drawCropOverlay,
  drawCropHandles,
  buildProcessingSignature,
} from "../utils/canvasUtils";

const WORKER_URL = new URL(
  "../workers/imageProcessor.worker.js",
  import.meta.url,
);

export function useCanvasProcessing({
  activeImage,
  activeAdjustments,
  activeCrop,
  compareMode,
  zoom,
  pan,
  setZoom,
  setPan,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const workerRef = useRef(null);
  const pendingRef = useRef(null);
  const busyRef = useRef(false);
  const processedRef = useRef(null);
  const offscreenRef = useRef(null);
  const lastDataRef = useRef(null);
  const drawRef = useRef(null);

  const getTransform = useCallback(() => {
    const container = containerRef.current;
    const imageData = compareMode ? activeImage?.originalData : processedRef.current;
    if (!container || !imageData) return null;

    const iW = imageData.width;
    const iH = imageData.height;
    const cssW = container.clientWidth;
    const cssH = container.clientHeight;

    let fitScale = Math.min(cssW / iW, cssH / iH);
    if (fitScale > 1) fitScale = 1;
    const cssScale = fitScale * zoom;

    const css_ox = (cssW - iW * cssScale) / 2 + pan.x;
    const css_oy = (cssH - iH * cssScale) / 2 + pan.y;

    return { iW, iH, cssScale, css_ox, css_oy };
  }, [activeImage, compareMode, zoom, pan]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const imageData = compareMode ? activeImage?.originalData : processedRef.current;
    const transform = getTransform();

    if (!canvas || !imageData || !transform) return;

    const ctx = canvas.getContext("2d");
    const { width: cW, height: cH } = canvas;
    const dpr = window.devicePixelRatio || 1;
    const { iW, iH, cssScale, css_ox, css_oy } = transform;

    ctx.clearRect(0, 0, cW, cH);

    const dW = Math.round(iW * cssScale * dpr);
    const dH = Math.round(iH * cssScale * dpr);
    const ox = Math.round(css_ox * dpr);
    const oy = Math.round(css_oy * dpr);

    drawCheckerboard(ctx, ox, oy, dW, dH, dpr);

    if (!offscreenRef.current) offscreenRef.current = document.createElement("canvas");
    const tmp = offscreenRef.current;

    if (tmp.width !== iW || tmp.height !== iH || lastDataRef.current !== imageData) {
      tmp.width = iW;
      tmp.height = iH;
      tmp.getContext("2d").putImageData(imageData, 0, 0);
      lastDataRef.current = imageData;
    }

    drawImage(ctx, tmp, ox, oy, dW, dH, cssScale);

    if (activeCrop?.active) {
      const cx = Math.round(ox + activeCrop.x * cssScale * dpr);
      const cy = Math.round(oy + activeCrop.y * cssScale * dpr);
      const cw = Math.round(activeCrop.width * cssScale * dpr);
      const ch = Math.round(activeCrop.height * cssScale * dpr);

      drawCropOverlay(ctx, ox, oy, dW, dH, cx, cy, cw, ch);
      drawCropHandles(ctx, cx, cy, cw, ch, dpr);
    }
  }, [activeImage, activeCrop, compareMode, getTransform]);

  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      const cssW = container.clientWidth;
      const cssH = container.clientHeight;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      if (drawRef.current) drawRef.current();
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, [activeImage]);

  const sendToWorker = useCallback((msg) => {
    if (!workerRef.current) return;
    busyRef.current = true;
    workerRef.current.postMessage(msg, [msg.pixelData]);
  }, []);

  useEffect(() => {
    const w = new Worker(WORKER_URL, { type: "module" });
    workerRef.current = w;

    w.onmessage = (e) => {
      const { type, pixelData, width, height } = e.data;
      busyRef.current = false;
      if (type !== "DONE") return;

      processedRef.current = new ImageData(
        new Uint8ClampedArray(pixelData),
        width,
        height,
      );
      if (drawRef.current) drawRef.current();
      if (pendingRef.current) {
        const next = pendingRef.current;
        pendingRef.current = null;
        sendToWorker(next);
      }
    };

    return () => w.terminate();
  }, [sendToWorker]);

  const debouncedProcess = useMemo(
    () =>
      debounce((orig, adj, masks) => {
        if (!orig) return;
        const msg = {
          type: "PROCESS",
          id: Date.now(),
          pixelData: new Uint8ClampedArray(orig.data).buffer,
          width: orig.width,
          height: orig.height,
          adjustments: adj,
          masks,
        };

        if (busyRef.current) pendingRef.current = msg;
        else sendToWorker(msg);
      }, 16),
    [sendToWorker],
  );

  const activeImageIdRef = useRef(null);
  const lastProcessSigRef = useRef(null);
  const lastImageDimensionsRef = useRef(null);
  const needsReprocessRef = useRef(false);

  useEffect(() => {
    if (!activeImage) {
      processedRef.current = null;
      activeImageIdRef.current = null;
      lastProcessSigRef.current = null;
      lastImageDimensionsRef.current = null;
      needsReprocessRef.current = false;
      const c = canvasRef.current;
      if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height);
      return;
    }

    if (activeImageIdRef.current !== activeImage.id) {
      processedRef.current = null;
      activeImageIdRef.current = activeImage.id;
      lastProcessSigRef.current = null;
      lastImageDimensionsRef.current = null;
      needsReprocessRef.current = false;
    }

    const currentDims = `${activeImage.width}x${activeImage.height}`;
    const dimChanged = lastImageDimensionsRef.current !== currentDims;
    if (dimChanged) {
      lastImageDimensionsRef.current = currentDims;
      needsReprocessRef.current = true;
      lastProcessSigRef.current = null;
    }

    if (!processedRef.current) {
      processedRef.current = activeImage.originalData;
    }

    const sig = buildProcessingSignature(activeAdjustments, activeImage.masks);

    if (sig !== lastProcessSigRef.current || needsReprocessRef.current) {
      lastProcessSigRef.current = sig;
      needsReprocessRef.current = false;
      if (drawRef.current) drawRef.current();
      debouncedProcess(activeImage.originalData, activeAdjustments, activeImage.masks);
    } else {
      if (drawRef.current) drawRef.current();
    }
  }, [activeImage, activeAdjustments, debouncedProcess]);

  useEffect(() => {
    draw();
  }, [compareMode, draw]);

  const fitToScreen = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [setZoom, setPan]);

  useEffect(() => {
    window.__hyperionFitToScreen = fitToScreen;
    return () => delete window.__hyperionFitToScreen;
  }, [fitToScreen]);

  return {
    canvasRef,
    containerRef,
    getTransform,
    draw,
  };
}