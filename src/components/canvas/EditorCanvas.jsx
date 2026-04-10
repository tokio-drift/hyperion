import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
} from "react";
import { useEditor } from "../../context/EditorContext";
import UploadZone from "../upload/UploadZone";

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

const WORKER_URL = new URL(
  "../../workers/imageProcessor.worker.js",
  import.meta.url,
);

export default function EditorCanvas() {
  const { state, dispatch, activeImage, activeAdjustments, activeCrop } =
    useEditor();
  const { compareMode } = state;

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const workerRef = useRef(null);
  const pendingRef = useRef(null);
  const busyRef = useRef(false);
  const processedRef = useRef(null);
  const offscreenRef = useRef(null);
  const lastDataRef = useRef(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef(null);

  // --- NEW: Crop Drag State ---
  const [cropDrag, setCropDrag] = useState(null);

  // Helper: Computes the current scaling and offset in CSS pixels
  const getTransform = useCallback(() => {
    const container = containerRef.current;
    const imageData = compareMode
      ? activeImage?.originalData
      : processedRef.current;
    if (!container || !imageData) return null;

    const iW = imageData.width;
    const iH = imageData.height;
    const cssW = container.clientWidth;
    const cssH = container.clientHeight;

    let fitScale = Math.min(cssW / iW, cssH / iH);
    if (fitScale > 1) fitScale = 1; // Prevent auto-upscaling
    const cssScale = fitScale * zoom;

    const css_ox = (cssW - iW * cssScale) / 2 + pan.x;
    const css_oy = (cssH - iH * cssScale) / 2 + pan.y;

    return { iW, iH, cssScale, css_ox, css_oy };
  }, [activeImage, processedRef, compareMode, zoom, pan]);

  // Handle Canvas Resizing
  // Handle Canvas Resizing
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
      canvas.style.width = cssW + "px";
      canvas.style.height = cssH + "px";
      draw();
    });
    ro.observe(container);
    return () => ro.disconnect();

    // FIX: Add activeImage here so the observer attaches AFTER the canvas is rendered!
  }, [activeImage]);

  // Web Worker Setup
  useEffect(() => {
    const w = new Worker(WORKER_URL, { type: "module" });
    workerRef.current = w;
    w.onmessage = (e) => {
      const { type, pixelData, width, height } = e.data;
      busyRef.current = false;
      if (type === "DONE") {
        processedRef.current = new ImageData(
          new Uint8ClampedArray(pixelData),
          width,
          height,
        );
        draw();
        if (pendingRef.current) {
          const next = pendingRef.current;
          pendingRef.current = null;
          sendToWorker(next);
        }
      }
    };
    return () => w.terminate();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const imageData = compareMode
      ? activeImage?.originalData
      : processedRef.current;
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
    const size = Math.round(10 * dpr);

    // Draw Checkerboard
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, oy, dW, dH);
    ctx.clip();
    const cols = Math.ceil(dW / size) + 1;
    const rows = Math.ceil(dH / size) + 1;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? "#2a2a2a" : "#1e1e1e";
        ctx.fillRect(ox + c * size, oy + r * size, size, size);
      }
    ctx.restore();

    // Cache temporary canvas (Fixes memory leaks)
    if (!offscreenRef.current)
      offscreenRef.current = document.createElement("canvas");
    const tmp = offscreenRef.current;

    if (
      tmp.width !== iW ||
      tmp.height !== iH ||
      lastDataRef.current !== imageData
    ) {
      tmp.width = iW;
      tmp.height = iH;
      tmp.getContext("2d").putImageData(imageData, 0, 0);
      lastDataRef.current = imageData;
    }

    // Draw Image (Turn off smoothing if 100% or larger to keep pixels crisp)
    ctx.save();
    ctx.imageSmoothingEnabled = cssScale < 1;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(tmp, ox, oy, dW, dH);
    ctx.restore();

    // Draw Crop Overlay
if (activeCrop?.active) {
      const cx = Math.round(ox + activeCrop.x * cssScale * dpr);
      const cy = Math.round(oy + activeCrop.y * cssScale * dpr);
      const cw = Math.round(activeCrop.width * cssScale * dpr);
      const ch = Math.round(activeCrop.height * cssScale * dpr);

      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(ox, oy, dW, cy - oy); // top
      ctx.fillRect(ox, cy + ch, dW, oy + dH - (cy + ch)); // bottom
      ctx.fillRect(ox, cy, cx - ox, ch); // left
      ctx.fillRect(cx + cw, cy, ox + dW - (cx + cw), ch); // right
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx, cy, cw, ch);
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 0.5;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + (cw * i) / 3, cy);
        ctx.lineTo(cx + (cw * i) / 3, cy + ch);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy + (ch * i) / 3);
        ctx.lineTo(cx + cw, cy + (ch * i) / 3);
        ctx.stroke();
      }
      ctx.restore();

      ctx.fillStyle = "white";
      const hs = 7 * dpr;
      [
        [cx, cy],
        [cx + cw - hs, cy],
        [cx, cy + ch - hs],
        [cx + cw - hs, cy + ch - hs],
      ].forEach(([x, y]) => {
        ctx.fillRect(x, y, hs, hs);
      });
    }
  }, [activeImage, compareMode, zoom, pan, activeCrop, getTransform]);

  function sendToWorker(msg) {
    if (!workerRef.current) return;
    busyRef.current = true;
    workerRef.current.postMessage(msg, [msg.pixelData]);
  }

  const debouncedProcess = useMemo(
    () =>
      debounce((orig, adj) => {
        if (!orig) return;
        const buf = new Uint8ClampedArray(orig.data).buffer;
        const msg = {
          type: "PROCESS",
          id: Date.now(),
          pixelData: buf,
          width: orig.width,
          height: orig.height,
          adjustments: adj,
        };
        if (busyRef.current) pendingRef.current = msg;
        else sendToWorker(msg);
      }, 16),
    [],
  );

  useEffect(() => {
    if (!activeImage) {
      processedRef.current = null;
      const c = canvasRef.current;
      if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height);
      return;
    }
    processedRef.current = activeImage.originalData;
    draw();
    debouncedProcess(activeImage.originalData, activeAdjustments);
  }, [activeImage, activeAdjustments]);

  useEffect(() => {
    draw();
  }, [draw]);

  const fitToScreen = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);
  useEffect(() => {
    window.__hyperionFitToScreen = fitToScreen;
    return () => delete window.__hyperionFitToScreen;
  }, [fitToScreen]);

  const handleWheel = useCallback((e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom((z) =>
      Math.max(0.05, Math.min(10, z * (e.deltaY > 0 ? 0.9 : 1.1))),
    );
  }, []);

  // --- INTERACTIVE MOUSE LOGIC ---
  const handleMouseDown = useCallback(
    (e) => {
      const transform = getTransform();
      if (!transform) return;

      // Start Panning (Middle Click OR Alt + Left Click)
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        return;
      }

      // Start Cropping (Left Click on Handles)
      if (e.button === 0 && activeCrop?.active) {
        const rect = containerRef.current.getBoundingClientRect();
        const mx = e.clientX - rect.left; // Mouse CSS X
        const my = e.clientY - rect.top; // Mouse CSS Y

        const { cssScale, css_ox, css_oy } = transform;

        // Calculate crop box in CSS pixels
        const cx = css_ox + activeCrop.x * cssScale;
        const cy = css_oy + activeCrop.y * cssScale;
        const cw = activeCrop.width * cssScale;
        const ch = activeCrop.height * cssScale;

        const hitZone = 12; // 12px clickable radius around handles

        let handle = null;
        if (Math.abs(mx - cx) < hitZone && Math.abs(my - cy) < hitZone)
          handle = "nw";
        else if (
          Math.abs(mx - (cx + cw)) < hitZone &&
          Math.abs(my - cy) < hitZone
        )
          handle = "ne";
        else if (
          Math.abs(mx - cx) < hitZone &&
          Math.abs(my - (cy + ch)) < hitZone
        )
          handle = "sw";
        else if (
          Math.abs(mx - (cx + cw)) < hitZone &&
          Math.abs(my - (cy + ch)) < hitZone
        )
          handle = "se";
        else if (mx > cx && mx < cx + cw && my > cy && my < cy + ch)
          handle = "move"; // Clicked inside box

        if (handle) {
          e.preventDefault();
          setCropDrag({
            handle,
            startX: mx,
            startY: my,
            origCrop: { ...activeCrop },
          });
        }
      }
    },
    [pan, activeCrop, getTransform],
  );

  const handleMouseMove = useCallback(
    (e) => {
      // Process Panning
      if (isPanning && panStartRef.current) {
        setPan({
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        });
        return;
      }

      // Process Crop Dragging
      if (cropDrag && activeImage) {
        const transform = getTransform();
        if (!transform) return;
        const rect = containerRef.current.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // Translate CSS movement delta back to Image Pixel delta
        const dx = (mx - cropDrag.startX) / transform.cssScale;
        const dy = (my - cropDrag.startY) / transform.cssScale;

        let { x, y, width, height, aspectRatio } = cropDrag.origCrop;
        const { iW, iH } = transform;

        if (cropDrag.handle === "move") {
          x += dx;
          y += dy;
          // Keep bounds strictly inside image
          if (x < 0) x = 0;
          if (y < 0) y = 0;
          if (x + width > iW) x = iW - width;
          if (y + height > iH) y = iH - height;
        } else {
          // Resize Handles
          if (cropDrag.handle.includes("e")) width += dx;
          if (cropDrag.handle.includes("s")) height += dy;
          if (cropDrag.handle.includes("w")) {
            x += dx;
            width -= dx;
          }
          if (cropDrag.handle.includes("n")) {
            y += dy;
            height -= dy;
          }

          // Enforce predefined Aspect Ratio during manual scaling
          if (aspectRatio) {
            height = width / aspectRatio;
            // Compensate Y position if dragging a top handle
            if (cropDrag.handle.includes("n"))
              y = cropDrag.origCrop.y + (cropDrag.origCrop.height - height);
          }

          const MIN = 20;
          if (width < MIN) width = MIN;
          if (height < MIN) height = MIN;
          if (x < 0) x = 0;
          if (y < 0) y = 0;
          if (x + width > iW) width = iW - x;
          if (y + height > iH) height = iH - y;
        }

        dispatch({
          type: "SET_CROP",
          payload: {
            imageId: activeImage.id,
            cropState: { x, y, width, height, aspectRatio },
          },
        });
      }
    },
    [isPanning, cropDrag, activeImage, getTransform, dispatch],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    panStartRef.current = null;
    setCropDrag(null);
  }, []);

  if (!activeImage) {
    return (
      <div className="relative flex-1 flex items-center justify-center p-10 checkerboard">
        <div className="w-full h-full max-w-xl max-h-96">
          <UploadZone />
        </div>
      </div>
    );
  }

  let cursorStyle = "default";
  if (isPanning) cursorStyle = "grabbing";
  else if (cropDrag?.handle === "move") cursorStyle = "move";
  else if (cropDrag) cursorStyle = "crosshair";

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden"
      style={{ background: "#111", cursor: cursorStyle }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ display: "block", width: "100%", height: "100%" }}
      />
      <UploadZone overlayMode />

      {compareMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <span className="compare-badge badge px-3 py-1 bg-gray-900/80 text-gray-300 border border-gray-600 rounded backdrop-blur-sm">
            before
          </span>
        </div>
      )}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
        <span className="text-xs font-mono text-gray-600 bg-black/30 px-2 py-0.5 rounded">
          {Math.round(zoom * 100)}%
        </span>
      </div>
      {zoom === 1 && (
        <div className="absolute bottom-3 right-3 z-10 pointer-events-none">
          <span className="text-xs text-gray-700">Alt+drag to pan</span>
        </div>
      )}
    </div>
  );
}
