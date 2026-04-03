import React, {
  useRef, useEffect, useCallback, useState, useMemo,
} from 'react';
import { useEditor } from '../../context/EditorContext';
import UploadZone from '../upload/UploadZone';

// Debounce helper
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

const WORKER_URL = new URL('../../workers/imageProcessor.worker.js', import.meta.url);

export default function EditorCanvas() {
  const { state, dispatch, activeImage, activeAdjustments, activeCrop } = useEditor();
  const { compareMode } = state;

  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const workerRef    = useRef(null);
  const pendingRef   = useRef(null);
  const busyRef      = useRef(false);
  const processedRef = useRef(null); // latest processed ImageData

  const [zoom, setZoom] = useState(1);
  const [pan, setPan]   = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef(null);

  // ── Canvas resize observer ────────────────────────────────────────────────
  useEffect(() => {
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ro = new ResizeObserver(() => {
      canvas.width  = container.clientWidth;
      canvas.height = container.clientHeight;
      draw();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []); // eslint-disable-line

  // ── Worker lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    const w = new Worker(WORKER_URL, { type: 'module' });
    workerRef.current = w;
    w.onmessage = (e) => {
      const { type, pixelData, width, height } = e.data;
      busyRef.current = false;
      if (type === 'DONE') {
        processedRef.current = new ImageData(new Uint8ClampedArray(pixelData), width, height);
        draw();
        if (pendingRef.current) {
          const next = pendingRef.current;
          pendingRef.current = null;
          sendToWorker(next);
        }
      }
    };
    return () => w.terminate();
  }, []); // eslint-disable-line

  // ── Draw ──────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width: cW, height: cH } = canvas;
    ctx.clearRect(0, 0, cW, cH);

    const imageData = compareMode ? activeImage?.originalData : processedRef.current;
    if (!imageData) return;

    const { width: iW, height: iH } = imageData;
    const baseScale = Math.min(cW / iW, cH / iH) * zoom;
    const dW = iW * baseScale;
    const dH = iH * baseScale;
    const ox = (cW - dW) / 2 + pan.x;
    const oy = (cH - dH) / 2 + pan.y;

    // Checkerboard
    const size = 10;
    ctx.save();
    ctx.beginPath(); ctx.rect(ox, oy, dW, dH); ctx.clip();
    const cols = Math.ceil(dW / size) + 1;
    const rows = Math.ceil(dH / size) + 1;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#2a2a2a' : '#1e1e1e';
        ctx.fillRect(ox + c * size, oy + r * size, size, size);
      }
    ctx.restore();

    // Image
    const tmp = document.createElement('canvas');
    tmp.width = iW; tmp.height = iH;
    tmp.getContext('2d').putImageData(imageData, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(tmp, ox, oy, dW, dH);
    ctx.restore();

    // Crop overlay
    if (activeCrop?.active) {
      const scale = baseScale;
      const cx = ox + activeCrop.x * scale;
      const cy = oy + activeCrop.y * scale;
      const cw = activeCrop.width  * scale;
      const ch = activeCrop.height * scale;

      // Dim outside
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.52)';
      ctx.fillRect(ox, oy, dW, dH);
      ctx.clearRect(cx, cy, cw, ch);
      ctx.restore();

      // Border
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx, cy, cw, ch);

      // Rule-of-thirds grid
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 0.5;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(cx + cw * i / 3, cy); ctx.lineTo(cx + cw * i / 3, cy + ch); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy + ch * i / 3); ctx.lineTo(cx + cw, cy + ch * i / 3); ctx.stroke();
      }
      ctx.restore();

      // Corner handles
      ctx.fillStyle = 'white';
      const hs = 7;
      [[cx, cy], [cx + cw - hs, cy], [cx, cy + ch - hs], [cx + cw - hs, cy + ch - hs]].forEach(([x, y]) => {
        ctx.fillRect(x, y, hs, hs);
      });
    }
  }, [activeImage, compareMode, zoom, pan, activeCrop]);

  // ── Worker dispatch ───────────────────────────────────────────────────────
  function sendToWorker(msg) {
    if (!workerRef.current) return;
    busyRef.current = true;
    workerRef.current.postMessage(msg, [msg.pixelData]);
  }

  const debouncedProcess = useMemo(() => debounce((orig, adj) => {
    if (!orig) return;
    const buf = new Uint8ClampedArray(orig.data).buffer;
    const msg = { type: 'PROCESS', id: Date.now(), pixelData: buf, width: orig.width, height: orig.height, adjustments: adj };
    if (busyRef.current) { pendingRef.current = msg; }
    else sendToWorker(msg);
  }, 16), []);

  // ── React to image / adjustments change ──────────────────────────────────
  useEffect(() => {
    if (!activeImage) {
      processedRef.current = null;
      const c = canvasRef.current;
      if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
      return;
    }
    // Show original immediately while worker processes
    processedRef.current = activeImage.originalData;
    draw();
    debouncedProcess(activeImage.originalData, activeAdjustments);
  }, [activeImage, activeAdjustments]); // eslint-disable-line

  useEffect(() => { draw(); }, [draw]);

  // ── Fit to screen ─────────────────────────────────────────────────────────
  const fitToScreen = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);
  useEffect(() => {
    window.__hyperionFitToScreen = fitToScreen;
    return () => { delete window.__hyperionFitToScreen; };
  }, [fitToScreen]);

  // ── Zoom ──────────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom(z => Math.max(0.05, Math.min(10, z * (e.deltaY > 0 ? 0.9 : 1.1))));
  }, []);

  // ── Pan ───────────────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e) => {
    if (e.button === 1) { // middle mouse
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  }, [pan]);

  const handleMouseMove = useCallback((e) => {
    if (!isPanning || !panStartRef.current) return;
    setPan({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
  }, [isPanning]);

  const stopPan = useCallback(() => { setIsPanning(false); panStartRef.current = null; }, []);

  // No image → show upload zone
  if (!activeImage) {
    return (
      <div className="relative flex-1 flex items-center justify-center p-10 checkerboard">
        <div className="w-full h-full max-w-xl max-h-96">
          <UploadZone />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden"
      style={{ background: '#111', cursor: isPanning ? 'grabbing' : 'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={stopPan}
      onMouseLeave={stopPan}
      onWheel={handleWheel}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ display: 'block', width: '100%', height: '100%' }}
      />

      {/* Drop overlay for adding more images */}
      <UploadZone overlayMode />

      {/* Compare badge */}
      {compareMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <span className="compare-badge badge px-3 py-1 bg-gray-900/80 text-gray-300 border border-gray-600 rounded backdrop-blur-sm">
            before
          </span>
        </div>
      )}

      {/* Zoom indicator */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
        <span className="text-xs font-mono text-gray-600 bg-black/30 px-2 py-0.5 rounded">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Ctrl+scroll hint (only when no zoom) */}
      {zoom === 1 && (
        <div className="absolute bottom-3 right-3 z-10 pointer-events-none">
          <span className="text-xs text-gray-700">
            Ctrl+scroll to zoom
          </span>
        </div>
      )}
    </div>
  );
}
