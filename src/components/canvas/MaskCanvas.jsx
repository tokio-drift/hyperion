import React, { useRef, useEffect, useCallback } from 'react';
import { canvasToImageCoords } from '../../utils/maskUtils';

export default function MaskCanvas({
  maskData, maskRevision = 0, inverted, width: iW, height: iH, imageRect,
  showOverlay, brushSettings, maskMode, onStrokeStart, onStrokeMove, onStrokeEnd
}) {
  const canvasRef = useRef(null);
  const cursorRef = useRef({ x: -100, y: -100 });
  const isPainting = useRef(false);
  const activePointerId = useRef(null);
  const overlayCanvasRef = useRef(null);
  const overlayCtxRef = useRef(null);
  const overlayImageDataRef = useRef(null);
  const framePendingRef = useRef(false);
  const renderFrameRef = useRef(null);

  const scheduleRender = useCallback(() => {
    if (framePendingRef.current) return;
    framePendingRef.current = true;
    requestAnimationFrame(() => {
      framePendingRef.current = false;
      renderFrameRef.current?.();
    });
  }, []);

  const ensureOverlayBuffer = useCallback(() => {
    if (!overlayCanvasRef.current) {
      overlayCanvasRef.current =
        typeof OffscreenCanvas !== 'undefined'
          ? new OffscreenCanvas(iW, iH)
          : document.createElement('canvas');
    }

    const overlayCanvas = overlayCanvasRef.current;
    if (overlayCanvas.width !== iW || overlayCanvas.height !== iH) {
      overlayCanvas.width = iW;
      overlayCanvas.height = iH;
      overlayCtxRef.current = null;
      overlayImageDataRef.current = null;
    }

    if (!overlayCtxRef.current) {
      overlayCtxRef.current = overlayCanvas.getContext('2d');
    }

    if (!overlayImageDataRef.current) {
      overlayImageDataRef.current = overlayCtxRef.current.createImageData(iW, iH);
    }

    return {
      overlayCanvas,
      overlayCtx: overlayCtxRef.current,
      overlayImageData: overlayImageDataRef.current,
    };
  }, [iW, iH]);

  const rebuildOverlayBitmap = useCallback(() => {
    if (!showOverlay || !maskData) {
      return;
    }

    const { overlayCtx, overlayImageData } = ensureOverlayBuffer();
    const out = overlayImageData.data;

    out.fill(0);
    for (let i = 0; i < maskData.length; i += 1) {
      const val = inverted ? 255 - maskData[i] : maskData[i];
      if (val === 0) continue;

      const base = i * 4;
      out[base] = 220;
      out[base + 1] = 50;
      out[base + 2] = 50;
      out[base + 3] = Math.round(val * 0.55);
    }

    overlayCtx.putImageData(overlayImageData, 0, 0);
  }, [ensureOverlayBuffer, inverted, maskData, showOverlay]);

  // Resize canvas to exactly match the container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(parent.clientWidth * dpr);
      canvas.height = Math.round(parent.clientHeight * dpr);
      canvas.style.width = parent.clientWidth + "px";
      canvas.style.height = parent.clientHeight + "px";
      scheduleRender();
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, [scheduleRender]);

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Red Tint Overlay
    if (showOverlay && imageRect && overlayCanvasRef.current) {
      const offscreen = overlayCanvasRef.current;

      const dW = Math.round(iW * imageRect.cssScale * dpr);
      const dH = Math.round(iH * imageRect.cssScale * dpr);
      const ox = Math.round(imageRect.css_ox * dpr);
      const oy = Math.round(imageRect.css_oy * dpr);

      ctx.save();
      ctx.imageSmoothingEnabled = imageRect.cssScale < 1;
      ctx.drawImage(offscreen, ox, oy, dW, dH);
      ctx.restore();
    }

    // 2. Draw Brush Cursor
    if (maskMode && imageRect) {
      const cx = cursorRef.current.x * dpr;
      const cy = cursorRef.current.y * dpr;
      const radius = (brushSettings.size / 2) * imageRect.cssScale * dpr;
      const innerRadius = ((brushSettings.size - brushSettings.feather) / 2) * imageRect.cssScale * dpr;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = brushSettings.tool === 'erase' ? 'rgba(255,100,100,0.8)' : 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();
      
      // Outer black ring for visibility on light backgrounds
      ctx.beginPath();
      ctx.arc(cx, cy, radius + (1*dpr), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.stroke();

      if (innerRadius > 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.setLineDash([4 * dpr, 4 * dpr]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [iW, iH, imageRect, showOverlay, brushSettings, maskMode]);

  useEffect(() => {
    renderFrameRef.current = renderFrame;
  }, [renderFrame]);

  useEffect(() => {
    rebuildOverlayBitmap();
    scheduleRender();
  }, [rebuildOverlayBitmap, scheduleRender, maskRevision]);

  useEffect(() => {
    scheduleRender();
  }, [renderFrame, scheduleRender]);

  // Pointer Events
  const handlePointerDown = (e) => {
    if (!maskMode || !imageRect || e.button !== 0) return;
    e.preventDefault();
    isPainting.current = true;
    activePointerId.current = e.pointerId;
    canvasRef.current.setPointerCapture(e.pointerId);

    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    cursorRef.current = { x: mx, y: my };
    const imgCoords = canvasToImageCoords(mx, my, imageRect);
    onStrokeStart(imgCoords.x, imgCoords.y);
    scheduleRender();
  };

  const handlePointerMove = (e) => {
    if (!maskMode || !imageRect) return;
    const nativeEvent = e.nativeEvent || e;
    const samples =
      typeof nativeEvent.getCoalescedEvents === 'function'
        ? nativeEvent.getCoalescedEvents()
        : [nativeEvent];

    const rect = canvasRef.current.getBoundingClientRect();
    for (const sample of samples) {
      const mx = sample.clientX - rect.left;
      const my = sample.clientY - rect.top;
      cursorRef.current = { x: mx, y: my };

      if (isPainting.current) {
        const imgCoords = canvasToImageCoords(mx, my, imageRect);
        onStrokeMove(imgCoords.x, imgCoords.y);
      }
    }

    scheduleRender();
  };

  const handlePointerUp = () => {
    if (activePointerId.current !== null && canvasRef.current?.hasPointerCapture(activePointerId.current)) {
      canvasRef.current.releasePointerCapture(activePointerId.current);
    }
    activePointerId.current = null;

    if (isPainting.current) {
      isPainting.current = false;
      onStrokeEnd();
    }
    scheduleRender();
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-30"
      style={{ pointerEvents: maskMode ? 'all' : 'none', cursor: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  );
}