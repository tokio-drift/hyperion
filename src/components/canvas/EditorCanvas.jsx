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
  }, []);
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
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { width: cW, height: cH } = canvas; 
    ctx.clearRect(0, 0, cW, cH);

    const imageData = compareMode
      ? activeImage?.originalData
      : processedRef.current;
    if (!imageData) return;

    const { width: iW, height: iH } = imageData;
    const dpr = window.devicePixelRatio || 1;

    const cssW = cW / dpr;
    const cssH = cH / dpr;

    let fitScale = Math.min(cssW / iW, cssH / iH);
    if (fitScale > 1) fitScale = 1;

    const cssScale = fitScale * zoom;
    const dW = iW * cssScale * dpr;
    const dH = iH * cssScale * dpr;
    
    const ox = (cW - dW) / 2 + pan.x * dpr;
    const oy = (cH - dH) / 2 + pan.y * dpr;
    const size = 10 * dpr;

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

    if (!offscreenRef.current) offscreenRef.current = document.createElement("canvas");
    const tmp = offscreenRef.current;
    
    if (tmp.width !== iW || tmp.height !== iH || lastDataRef.current !== imageData) {
      tmp.width = iW;
      tmp.height = iH;
      tmp.getContext("2d").putImageData(imageData, 0, 0);
      lastDataRef.current = imageData;
    }

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(tmp, ox, oy, dW, dH);
    ctx.restore();

    if (activeCrop?.active) {
      const cx = ox + activeCrop.x * cssScale * dpr;
      const cy = oy + activeCrop.y * cssScale * dpr;
      const cw = activeCrop.width * cssScale * dpr;
      const ch = activeCrop.height * cssScale * dpr;
      
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
  }, [activeImage, compareMode, zoom, pan, activeCrop]);
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
        if (busyRef.current) {
          pendingRef.current = msg;
        } else sendToWorker(msg);
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
    return () => {
      delete window.__hyperionFitToScreen;
    };
  }, [fitToScreen]);
  const handleWheel = useCallback((e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom((z) =>
      Math.max(0.05, Math.min(10, z * (e.deltaY > 0 ? 0.9 : 1.1))),
    );
  }, []);
  const handleMouseDown = useCallback(
    (e) => {
      if (e.button === 1) {
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      }
    },
    [pan],
  );
  const handleMouseMove = useCallback(
    (e) => {
      if (!isPanning || !panStartRef.current) return;
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    },
    [isPanning],
  );
  const stopPan = useCallback(() => {
    setIsPanning(false);
    panStartRef.current = null;
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
  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden"
      style={{ background: "#111", cursor: isPanning ? "grabbing" : "default" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={stopPan}
      onMouseLeave={stopPan}
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
          <span className="text-xs text-gray-700">Ctrl+scroll to zoom</span>
        </div>
      )}
    </div>
  );
}
