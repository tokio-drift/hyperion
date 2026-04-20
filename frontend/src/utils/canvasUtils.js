export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function drawCheckerboard(ctx, ox, oy, dW, dH, dpr) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(ox, oy, dW, dH);
  ctx.clip();
  const size = Math.round(10 * dpr);
  const cols = Math.ceil(dW / size) + 1;
  const rows = Math.ceil(dH / size) + 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? "#2a2a2a" : "#1e1e1e";
      ctx.fillRect(ox + c * size, oy + r * size, size, size);
    }
  }
  ctx.restore();
}

export function drawImage(ctx, offscreenCanvas, ox, oy, dW, dH, cssScale) {
  ctx.save();
  ctx.imageSmoothingEnabled = cssScale < 1;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(offscreenCanvas, ox, oy, dW, dH);
  ctx.restore();
}

export function drawCropOverlay(ctx, ox, oy, dW, dH, cx, cy, cw, ch) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(ox, oy, dW, cy - oy);
  ctx.fillRect(ox, cy + ch, dW, oy + dH - (cy + ch));
  ctx.fillRect(ox, cy, cx - ox, ch);
  ctx.fillRect(cx + cw, cy, ox + dW - (cx + cw), ch);
  ctx.restore();
}

export function drawCropHandles(ctx, cx, cy, cw, ch, dpr) {
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
  [[cx, cy], [cx + cw - hs, cy], [cx, cy + ch - hs], [cx + cw - hs, cy + ch - hs]].forEach(
    ([x, y]) => {
      ctx.fillRect(x, y, hs, hs);
    },
  );
}

export function buildProcessingSignature(activeAdjustments, masks = []) {
  return JSON.stringify(activeAdjustments) +
    (masks
      .map(
        (m) =>
          m.id +
          (m.revision || 0) +
          m.visible +
          m.inverted +
          JSON.stringify(m.adjustments),
      )
      .join("|") || "");
}
