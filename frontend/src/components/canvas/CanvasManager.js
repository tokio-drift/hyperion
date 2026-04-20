/**
 * CanvasManager.js
 * Handles all canvas draw calls. Stateless utility — takes canvas + data, draws.
 */

export class CanvasManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  /**
   * Draw processed ImageData onto the visible canvas, scaled to fit.
   * Returns the transform info (scale, offsetX, offsetY) for overlay calculations.
   */
  drawImage(imageData, zoom = 1, panX = 0, panY = 0) {
    const { canvas, ctx } = this;
    const { width: imgW, height: imgH } = imageData;
    const { width: canvasW, height: canvasH } = canvas;

    ctx.clearRect(0, 0, canvasW, canvasH);

    // Base scale to fit image in canvas (object-fit: contain logic)
    const scaleX = canvasW / imgW;
    const scaleY = canvasH / imgH;
    const baseScale = Math.min(scaleX, scaleY);
    const scale = baseScale * zoom;

    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const offsetX = (canvasW - drawW) / 2 + panX;
    const offsetY = (canvasH - drawH) / 2 + panY;
    const tempCanvas = new OffscreenCanvas(imgW, imgH);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(tempCanvas, offsetX, offsetY, drawW, drawH);
    ctx.restore();
    return { scale, offsetX, offsetY, drawW, drawH };
  }

  /**
   * Draw checkerboard pattern (for transparent pixels behind image).
   */
  drawCheckerboard(x, y, w, h) {
    const { ctx } = this;
    const size = 8;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    for (let row = 0; row < Math.ceil(h / size); row++) {
      for (let col = 0; col < Math.ceil(w / size); col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? '#2a2a2a' : '#1e1e1e';
        ctx.fillRect(x + col * size, y + row * size, size, size);
      }
    }
    ctx.restore();
  }

  clear() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  resize(width, height) {
    this.canvas.width  = width;
    this.canvas.height = height;
  }
}
