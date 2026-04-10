import { useRef, useEffect, useCallback } from 'react';

const WORKER_URL = new URL('../workers/imageProcessor.worker.js', import.meta.url);

export function useImageProcessor({ onResult, onError } = {}) {
  const workerRef    = useRef(null);
  const pendingRef   = useRef(null);
  const busyRef      = useRef(false);
  const jobIdRef     = useRef(0);

  // --- FIX 1: Keep callbacks fresh to prevent stale closures ---
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  }, [onResult, onError]);

  // Boot worker
  useEffect(() => {
    const worker = new Worker(WORKER_URL, { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type, pixelData, width, height, id } = e.data;
      busyRef.current = false;

      if (type === 'DONE') {
        const buffer = new Uint8ClampedArray(pixelData);
        const imageData = new ImageData(buffer, width, height);
        // Use the ref to guarantee we have the latest state!
        onResultRef.current?.(imageData, id);
      } else if (type === 'ERROR') {
        onErrorRef.current?.(e.data.message, id);
      }

      // Drain queue
      if (pendingRef.current) {
        const next = pendingRef.current;
        pendingRef.current = null;
        _send(next);
      }
    };

    worker.onerror = (err) => {
      busyRef.current = false;
      onErrorRef.current?.(err.message);
    };

    return () => worker.terminate();
  }, []); // eslint-disable-line

  function _send(msg) {
    if (!workerRef.current) return;
    busyRef.current = true;
    const transfer = msg.pixelData instanceof ArrayBuffer ? [msg.pixelData] : [];
    workerRef.current.postMessage(msg, transfer);
  }

  const processImage = useCallback((originalData, adjustments) => {
    const id = ++jobIdRef.current;
    const pixelBuffer = new Uint8ClampedArray(originalData.data).buffer;
    const msg = {
      type: 'PROCESS', id,
      pixelData: pixelBuffer,
      width: originalData.width,
      height: originalData.height,
      adjustments,
    };
    if (busyRef.current) pendingRef.current = msg;
    else _send(msg);
    return id;
  }, []);

  const rotateImage = useCallback((originalData, direction) => {
    const id = ++jobIdRef.current;
    const pixelBuffer = new Uint8ClampedArray(originalData.data).buffer;
    _send({ type: 'ROTATE', id, pixelData: pixelBuffer, width: originalData.width, height: originalData.height, direction });
    return id;
  }, []);

  const cropImage = useCallback((originalData, x, y, cw, ch) => {
    const id = ++jobIdRef.current;
    const pixelBuffer = new Uint8ClampedArray(originalData.data).buffer;
    _send({ type: 'CROP', id, pixelData: pixelBuffer, width: originalData.width, height: originalData.height, x, y, cw, ch });
    return id;
  }, []);

  return { processImage, rotateImage, cropImage };
}