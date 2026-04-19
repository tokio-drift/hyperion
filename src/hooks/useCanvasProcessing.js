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

const MAX_POOL_SIZE = 8;
const MIN_PIXELS_PER_WORKER = 512 * 512;

function getTargetWorkerCount(width, height, maxWorkers) {
  const pixelCount = width * height;
  const bySize = Math.max(1, Math.ceil(pixelCount / MIN_PIXELS_PER_WORKER));
  return Math.max(1, Math.min(maxWorkers, bySize));
}

function hasNonZeroAdjustments(adjustments = {}) {
  return Object.values(adjustments).some((v) => v !== 0);
}

function buildChunkMasks(masks, startRow, chunkHeight, width) {
  if (!Array.isArray(masks) || masks.length === 0) return [];

  const start = startRow * width;
  const end = start + chunkHeight * width;
  const chunkMasks = [];

  for (const mask of masks) {
    if (!mask?.visible) continue;
    const mAdj = mask.adjustments || {};
    if (!hasNonZeroAdjustments(mAdj)) continue;
    if (!mask.maskData || typeof mask.maskData.slice !== "function") continue;

    const sliced = mask.maskData.slice(start, end);
    const maskData =
      sliced instanceof Uint8ClampedArray
        ? sliced
        : new Uint8ClampedArray(sliced);

    if (!mask.inverted && !maskData.some((v) => v > 0)) continue;

    chunkMasks.push({
      visible: true,
      inverted: !!mask.inverted,
      adjustments: mAdj,
      maskData,
    });
  }

  return chunkMasks;
}

export function useCanvasProcessing({
  activeImage,
  activeAdjustments,
  activeCrop,
  maskMode = false,
  compareMode,
  zoom,
  pan,
  setZoom,
  setPan,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const workerPoolRef = useRef([]);
  const pendingRef = useRef(null);
  const busyRef = useRef(false);
  const activeJobRef = useRef(null);
  const jobIdRef = useRef(0);
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

  const dispatchProcessJob = useCallback((msg) => {
    const workers = workerPoolRef.current;
    if (!workers.length) return;

    const { id, width, height, pixelData, adjustments, masks } = msg;
    const source = new Uint8ClampedArray(pixelData);
    const workerCount = getTargetWorkerCount(width, height, workers.length);
    const rowsPerChunk = Math.ceil(height / workerCount);
    const chunkCount = Math.ceil(height / rowsPerChunk);

    activeJobRef.current = {
      id,
      width,
      height,
      chunkCount,
      completed: 0,
      chunks: new Array(chunkCount),
    };
    busyRef.current = true;

    for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
      const startRow = chunkIndex * rowsPerChunk;
      const chunkHeight = Math.min(rowsPerChunk, height - startRow);
      const pixelStart = startRow * width * 4;
      const pixelEnd = pixelStart + chunkHeight * width * 4;
      const chunkPixels = source.slice(pixelStart, pixelEnd);
      const chunkMasks = buildChunkMasks(masks, startRow, chunkHeight, width);
      const transferList = [chunkPixels.buffer];

      for (const mask of chunkMasks) {
        transferList.push(mask.maskData.buffer);
      }

      const worker = workers[chunkIndex % workerCount];
      worker.postMessage(
        {
          type: "PROCESS_CHUNK",
          id,
          chunkIndex,
          pixelData: chunkPixels.buffer,
          adjustments,
          masks: chunkMasks,
        },
        transferList,
      );
    }
  }, []);

  const drainPending = useCallback(() => {
    if (!pendingRef.current) return;
    const next = pendingRef.current;
    pendingRef.current = null;
    dispatchProcessJob(next);
  }, [dispatchProcessJob]);

  const handleWorkerMessage = useCallback(
    (e) => {
      const job = activeJobRef.current;
      if (!job) return;

      const { type, id, chunkIndex, pixelData } = e.data;
      if (id !== job.id) return;

      if (type === "ERROR") {
        busyRef.current = false;
        activeJobRef.current = null;
        drainPending();
        return;
      }

      if (type !== "DONE" || typeof chunkIndex !== "number") return;

      job.chunks[chunkIndex] = new Uint8ClampedArray(pixelData);
      job.completed += 1;

      if (job.completed !== job.chunkCount) return;

      const merged = new Uint8ClampedArray(job.width * job.height * 4);
      let offset = 0;
      for (let i = 0; i < job.chunkCount; i += 1) {
        const chunk = job.chunks[i];
        if (!chunk) continue;
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      processedRef.current = new ImageData(merged, job.width, job.height);
      activeJobRef.current = null;
      busyRef.current = false;

      if (drawRef.current) drawRef.current();
      drainPending();
    },
    [drainPending],
  );

  useEffect(() => {
    const poolSize = Math.max(
      1,
      Math.min(MAX_POOL_SIZE, navigator.hardwareConcurrency || 4),
    );
    const workers = Array.from(
      { length: poolSize },
      () => new Worker(WORKER_URL, { type: "module" }),
    );

    for (const worker of workers) {
      worker.onmessage = handleWorkerMessage;
      worker.onerror = () => {
        busyRef.current = false;
        activeJobRef.current = null;
        drainPending();
      };
    }

    workerPoolRef.current = workers;

    return () => {
      for (const worker of workers) worker.terminate();
      workerPoolRef.current = [];
      activeJobRef.current = null;
      pendingRef.current = null;
      busyRef.current = false;
    };
  }, [drainPending, handleWorkerMessage]);

  const queueProcessJob = useCallback(
    (msg) => {
      if (busyRef.current) {
        pendingRef.current = msg;
        return;
      }
      dispatchProcessJob(msg);
    },
    [dispatchProcessJob],
  );

  const debouncedProcess = useMemo(
    () =>
      debounce((orig, adj, masks) => {
        if (!orig) return;
        const msg = {
          type: "PROCESS",
          id: ++jobIdRef.current,
          pixelData: new Uint8ClampedArray(orig.data).buffer,
          width: orig.width,
          height: orig.height,
          adjustments: adj,
          masks,
        };

        queueProcessJob(msg);
      }, maskMode ? 48 : 16),
    [maskMode, queueProcessJob],
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