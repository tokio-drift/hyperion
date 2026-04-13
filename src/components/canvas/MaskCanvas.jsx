import React, { useRef, useEffect, useCallback } from 'react';
import { canvasToImageCoords } from '../../utils/maskUtils';

export default function MaskCanvas({
  maskData, inverted, width: iW, height: iH, imageRect, 
  showOverlay, brushSettings, maskMode, onStrokeStart, onStrokeMove, onStrokeEnd
}) {
  const canvasRef = useRef(null);
  const cursorRef = useRef({ x: -100, y: -100 });
  const isPainting = useRef(false);

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
      renderFrame();
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Red Tint Overlay
    if (showOverlay && maskData && imageRect) {
      const offscreen = new OffscreenCanvas(iW, iH);
      const oCtx = offscreen.getContext('2d');
      const imgData = oCtx.createImageData(iW, iH);
      
      for (let i = 0; i < maskData.length; i++) {
        const val = inverted ? (255 - maskData[i]) : maskData[i];
        if (val > 0) {
          imgData.data[i*4]   = 220; // R
          imgData.data[i*4+1] = 50;  // G
          imgData.data[i*4+2] = 50;  // B
          imgData.data[i*4+3] = Math.round(val * 0.55); // Alpha
        }
      }
      oCtx.putImageData(imgData, 0, 0);

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
    if (maskMode) {
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
  }, [maskData, inverted, iW, iH, imageRect, showOverlay, brushSettings, maskMode]);

  useEffect(() => {
    requestAnimationFrame(renderFrame);
  }, [renderFrame]);

  // Pointer Events
  const handlePointerDown = (e) => {
    if (!maskMode || !imageRect || e.button !== 0) return;
    isPainting.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const imgCoords = canvasToImageCoords(mx, my, imageRect);
    onStrokeStart(imgCoords.x, imgCoords.y);
  };

  const handlePointerMove = (e) => {
    if (!maskMode || !imageRect) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    cursorRef.current = { x: mx, y: my };

    if (isPainting.current) {
      const imgCoords = canvasToImageCoords(mx, my, imageRect);
      onStrokeMove(imgCoords.x, imgCoords.y);
    }
    requestAnimationFrame(renderFrame); // Update cursor position
  };

  const handlePointerUp = () => {
    if (isPainting.current) {
      isPainting.current = false;
      onStrokeEnd();
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-30"
      style={{ pointerEvents: maskMode ? 'all' : 'none', cursor: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  );
}