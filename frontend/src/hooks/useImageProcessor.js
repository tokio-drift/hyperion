import { useRef, useEffect, useCallback } from 'react';

const WORKER_URL = new URL('../workers/imageProcessor.worker.js', import.meta.url);
const LIMIT_SIZE = 4000000; // 4 MP

export function useImageProcessor({ onResult, onError } = {}) {
  const workerPoolRef = useRef([]);
  const busyRef      = useRef(false);
  const pendingRef   = useRef(null);
  const activeJobRef = useRef(null);
  const jobIdRef     = useRef(0);

  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  }, [onResult, onError]);

  useEffect(() => {
    const workers = Array.from({ length: 4 }, () => new Worker(WORKER_URL, { type: 'module' }));
    workerPoolRef.current = workers;

    const handleMessage = (e) => {
      const { type, id, pixelData, width, height, chunkIndex } = e.data;
      
      const job = activeJobRef.current;
      if (job && job.id === id) {
        if (type === 'ERROR') {
          busyRef.current = false;
          activeJobRef.current = null;
          onErrorRef.current?.(e.data.message, id);
          drainPending();
          return;
        }

        if (type === 'DONE') {
          if (typeof chunkIndex === 'number') {
            job.chunks[chunkIndex] = new Uint8ClampedArray(pixelData);
            job.completed += 1;

            if (job.completed === job.chunkCount) {
              const merged = new Uint8ClampedArray(job.width * job.height * 4);
              let offset = 0;
              for (let i = 0; i < job.chunkCount; i++) {
                merged.set(job.chunks[i], offset);
                offset += job.chunks[i].length;
              }
              const imageData = new ImageData(merged, job.width, job.height);
              onResultRef.current?.(imageData, id);
              busyRef.current = false;
              activeJobRef.current = null;
              drainPending();
            }
          } else {
            const buffer = new Uint8ClampedArray(pixelData);
            const imageData = new ImageData(buffer, width, height);
            onResultRef.current?.(imageData, id);
            busyRef.current = false;
            activeJobRef.current = null;
            drainPending();
          }
        }
      }
    };

    for (const worker of workers) {
      worker.onmessage = handleMessage;
      worker.onerror = (err) => {
        busyRef.current = false;
        activeJobRef.current = null;
        onErrorRef.current?.(err.message);
        drainPending();
      };
    }

    return () => {
      for (const worker of workers) worker.terminate();
    };
  }, []);

  function drainPending() {
    if (pendingRef.current) {
      const next = pendingRef.current;
      pendingRef.current = null;
      _sendJob(next);
    }
  }

  function _sendJob(jobDesc) {
    busyRef.current = true;
    activeJobRef.current = jobDesc;

    if (jobDesc.isChunked) {
      for (let i = 0; i < jobDesc.chunkCount; i++) {
        const worker = workerPoolRef.current[i];
        worker.postMessage(jobDesc.messages[i], [jobDesc.messages[i].pixelData]);
      }
    } else {
      const worker = workerPoolRef.current[0];
      worker.postMessage(jobDesc.message, jobDesc.transfer);
    }
  }

  const processImage = useCallback((originalData, adjustments, masks = []) => {
    const id = ++jobIdRef.current;
    const size = originalData.width * originalData.height;

    let jobDesc;
    if (size > LIMIT_SIZE) {
      const chunkCount = 4;
      const width = originalData.width;
      const height = originalData.height;
      const rowsPerChunk = Math.ceil(height / chunkCount);
      const source = new Uint8ClampedArray(originalData.data);
      const messages = [];

      for (let i = 0; i < chunkCount; i++) {
        const startRow = i * rowsPerChunk;
        const chunkHeight = Math.min(rowsPerChunk, height - startRow);
        const pixelStart = startRow * width * 4;
        const pixelEnd = pixelStart + chunkHeight * width * 4;
        const chunkPixels = source.slice(pixelStart, pixelEnd);

        // Simple mask slicing for the chunk
        const chunkMasks = masks.map(mask => {
          if (!mask || !mask.maskData) return mask;
          return {
            ...mask,
            maskData: mask.maskData.slice(startRow * width, (startRow + chunkHeight) * width)
          };
        });

        messages.push({
          type: 'PROCESS_CHUNK', id, chunkIndex: i,
          pixelData: chunkPixels.buffer, adjustments, masks: chunkMasks
        });
      }

      jobDesc = { id, isChunked: true, chunkCount, completed: 0, chunks: new Array(chunkCount), width, height, messages };
    } else {
      const pixelBuffer = new Uint8ClampedArray(originalData.data).buffer;
      const msg = {
        type: 'PROCESS', id,
        pixelData: pixelBuffer, width: originalData.width, height: originalData.height, adjustments, masks
      };
      jobDesc = { id, isChunked: false, message: msg, transfer: [pixelBuffer] };
    }

    if (busyRef.current) pendingRef.current = jobDesc;
    else _sendJob(jobDesc);
    return id;
  }, []);

  const rotateImage = useCallback((originalData, direction) => {
    const id = ++jobIdRef.current;
    const pixelBuffer = new Uint8ClampedArray(originalData.data).buffer;
    const msg = { type: 'ROTATE', id, pixelData: pixelBuffer, width: originalData.width, height: originalData.height, direction };
    const jobDesc = { id, isChunked: false, message: msg, transfer: [pixelBuffer] };
    
    if (busyRef.current) pendingRef.current = jobDesc;
    else _sendJob(jobDesc);
    return id;
  }, []);

  const cropImage = useCallback((originalData, x, y, cw, ch) => {
    const id = ++jobIdRef.current;
    const pixelBuffer = new Uint8ClampedArray(originalData.data).buffer;
    const msg = { type: 'CROP', id, pixelData: pixelBuffer, width: originalData.width, height: originalData.height, x, y, cw, ch };
    const jobDesc = { id, isChunked: false, message: msg, transfer: [pixelBuffer] };
    
    if (busyRef.current) pendingRef.current = jobDesc;
    else _sendJob(jobDesc);
    return id;
  }, []);

  return { processImage, rotateImage, cropImage };
}