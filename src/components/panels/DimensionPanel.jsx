import React, { useState, useCallback, useEffect } from "react";
import { useEditor } from "../../context/EditorContext";
import { useHistory } from "../../hooks/useHistory";
import { useImageProcessor } from "../../hooks/useImageProcessor";
import ConfirmDialog from "../shared/ConfirmDialog";
import { ASPECT_RATIOS, computeCropForRatio } from "../../utils/aspectRatios";

export default function DimensionPanel() {
  const { dispatch, activeImage, activeCrop } = useEditor();
  const { push } = useHistory();
  const [confirmCrop, setConfirmCrop] = useState(false);
  const [confirmResize, setConfirmResize] = useState(false);
  const [resizeW, setResizeW] = useState("");
  const [resizeH, setResizeH] = useState("");
  const [lockAspect, setLockAspect] = useState(true);
  const [resizeError, setResizeError] = useState("");

  const { rotateImage, cropImage } = useImageProcessor({
    onResult: (imageData) => {
      if (!activeImage) return;
      dispatch({
        type: "UPDATE_IMAGE_DATA",
        payload: {
          imageId: activeImage.id,
          originalData: imageData,
          width: imageData.width,
          height: imageData.height,
        },
      });
    },
  });

  // Sync resize inputs with image dimensions
  useEffect(() => {
    if (activeImage) {
      setResizeW(String(activeImage.width));
      setResizeH(String(activeImage.height));
    }
  }, [activeImage?.id]);

  // ── Expose start crop globally (for 'C' key) ───────────────────────────
  const startCrop = useCallback(() => {
    if (!activeImage) return;
    dispatch({
      type: "SET_CROP",
      payload: {
        imageId: activeImage.id,
        cropState: {
          active: true,
          x: 0,
          y: 0,
          width: activeImage.width,
          height: activeImage.height,
          aspectRatio: null,
        },
      },
    });
  }, [dispatch, activeImage]);

  useEffect(() => {
    window.__hyperionStartCrop = startCrop;
    return () => {
      delete window.__hyperionStartCrop;
    };
  }, [startCrop]);

  // ── Aspect ratio selection ─────────────────────────────────────────────
  const selectRatio = useCallback(
    (ratio) => {
      if (!activeImage) return;
      const cropRect = computeCropForRatio(
        ratio,
        activeImage.width,
        activeImage.height,
      );
      dispatch({
        type: "SET_CROP",
        payload: {
          imageId: activeImage.id,
          cropState: { ...cropRect, active: true, aspectRatio: ratio },
        },
      });
    },
    [dispatch, activeImage],
  );

  // ── Apply crop ─────────────────────────────────────────────────────────
  const applyCrop = useCallback(() => {
    if (!activeImage || !activeCrop) return;
    const { x, y, width, height } = activeCrop;

    // FIX 2: Prevent passing floating point numbers from mouse-dragging to the Web Worker array logic
    const safeX = Math.round(x);
    const safeY = Math.round(y);
    const safeW = Math.round(width);
    const safeH = Math.round(height);

    cropImage(activeImage.originalData, safeX, safeY, safeW, safeH);
    dispatch({ type: "APPLY_CROP", payload: { imageId: activeImage.id } });
    push("Crop applied");
    setConfirmCrop(false);
  }, [activeImage, activeCrop, cropImage, dispatch, push]);

  // ── Rotate ─────────────────────────────────────────────────────────────
  const rotate = useCallback(
    (direction) => {
      if (!activeImage) return;
      rotateImage(activeImage.originalData, direction);
      dispatch({
        type: "ROTATE_IMAGE",
        payload: { imageId: activeImage.id, direction },
      });
      push(direction === "cw" ? "Rotate 90° CW" : "Rotate 90° CCW");
    },
    [activeImage, rotateImage, dispatch, push],
  );

  // ── Resize ─────────────────────────────────────────────────────────────
  const handleResizeW = (val) => {
    setResizeW(val);
    setResizeError("");
    if (lockAspect && activeImage) {
      const ratio = activeImage.height / activeImage.width;
      setResizeH(String(Math.round(Number(val) * ratio)));
    }
  };

  const handleResizeH = (val) => {
    setResizeH(val);
    setResizeError("");
    if (lockAspect && activeImage) {
      const ratio = activeImage.width / activeImage.height;
      setResizeW(String(Math.round(Number(val) * ratio)));
    }
  };

  const applyResize = useCallback(() => {
    const w = parseInt(resizeW, 10);
    const h = parseInt(resizeH, 10);
    if (!w || !h || w < 1 || h < 1 || w > 10000 || h > 10000) {
      setResizeError("Enter valid dimensions between 1 and 10,000 px");
      setConfirmResize(false);
      return;
    }
    if (!activeImage) return;

    // Use canvas to resize
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = w;
    tempCanvas.height = h;
    const ctx = tempCanvas.getContext("2d");
    const srcCanvas = document.createElement("canvas");
    srcCanvas.width = activeImage.originalData.width;
    srcCanvas.height = activeImage.originalData.height;
    srcCanvas.getContext("2d").putImageData(activeImage.originalData, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(srcCanvas, 0, 0, w, h);
    const newData = ctx.getImageData(0, 0, w, h);

    dispatch({
      type: "UPDATE_IMAGE_DATA",
      payload: {
        imageId: activeImage.id,
        originalData: newData,
        width: w,
        height: h,
      },
    });
    push(`Resize to ${w}×${h}`);
    setConfirmResize(false);
  }, [resizeW, resizeH, activeImage, dispatch, push]);

  if (!activeImage) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <p className="text-gray-600 text-sm">
          Open an image to use dimension tools
        </p>
      </div>
    );
  }

  const cropActive = activeCrop?.active;

  return (
    <div className="flex flex-col overflow-y-auto">
      {/* ── Crop ── */}
      <div className="panel-section">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
            Crop
          </span>
          <span className="text-xs text-gray-600">
            {activeImage.width} × {activeImage.height} px
          </span>
        </div>

        {!cropActive ? (
          <button
            onClick={startCrop}
            className="w-full py-2 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded transition-colors border border-gray-700"
          >
            Enter Crop Mode <kbd className="ml-1 text-gray-500">C</kbd>
          </button>
        ) : (
          <div className="space-y-3">
            {/* Aspect ratio presets */}
            <div className="flex flex-wrap gap-1.5">
              {ASPECT_RATIOS.map(({ label, value }) => (
                <button
                  key={label}
                  onClick={() => selectRatio(value)}
                  className={`
                    px-2 py-1 text-xs rounded border transition-colors
                    ${
                      activeCrop?.aspectRatio === value
                        ? "border-blue-500 bg-blue-500/20 text-blue-300"
                        : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"
                    }
                  `}
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="text-xs text-gray-500">
              Drag the handles on the canvas to adjust the crop region.
            </p>

            {/* Confirm / cancel */}
            <div className="flex gap-2">
              <button
                onClick={() =>
                  dispatch({
                    type: "CANCEL_CROP",
                    payload: { imageId: activeImage.id },
                  })
                }
                className="flex-1 py-1.5 text-xs rounded bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700 transition-colors"
              >
                Cancel <kbd className="text-gray-600">Esc</kbd>
              </button>
              <button
                onClick={() => setConfirmCrop(true)}
                className="flex-1 py-1.5 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
              >
                Apply <kbd className="text-blue-300">↵</kbd>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Rotate ── */}
      <div className="panel-section">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider block mb-3">
          Rotate
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => rotate("ccw")}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded border border-gray-700 transition-colors"
          >
            <span style={{ display: "inline-block", transform: "scaleX(-1)" }}>
              ↻
            </span>{" "}
            90° CCW
          </button>
          <button
            onClick={() => rotate("cw")}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded border border-gray-700 transition-colors"
          >
            ↻ 90° CW
          </button>
        </div>
      </div>

      {/* ── Resize ── */}
      <div className="panel-section">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider block mb-3">
          Resize
        </span>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 w-3">W</label>
            <input
              type="number"
              value={resizeW}
              onChange={(e) => handleResizeW(e.target.value)}
              min="1"
              max="10000"
              className={`flex-1 bg-gray-800 border rounded px-2 py-1.5 text-xs text-gray-200 outline-none focus:border-blue-500 transition-colors
                ${resizeError ? "border-red-500" : "border-gray-700"}`}
            />
            <span className="text-xs text-gray-600">px</span>
          </div>

          {/* Lock aspect ratio toggle */}
          <div className="flex items-center justify-center py-0.5">
            <button
              onClick={() => setLockAspect((l) => !l)}
              className={`flex items-center gap-1.5 text-xs transition-colors ${lockAspect ? "text-blue-400" : "text-gray-600"}`}
            >
              <span>{lockAspect ? "🔒" : "🔓"}</span>
              <span>Lock aspect ratio</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 w-3">H</label>
            <input
              type="number"
              value={resizeH}
              onChange={(e) => handleResizeH(e.target.value)}
              min="1"
              max="10000"
              className={`flex-1 bg-gray-800 border rounded px-2 py-1.5 text-xs text-gray-200 outline-none focus:border-blue-500 transition-colors
                ${resizeError ? "border-red-500" : "border-gray-700"}`}
            />
            <span className="text-xs text-gray-600">px</span>
          </div>

          {resizeError && <p className="text-xs text-red-400">{resizeError}</p>}

          <button
            onClick={() => setConfirmResize(true)}
            className="w-full py-2 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded border border-gray-700 transition-colors mt-1"
          >
            Apply Resize
          </button>
        </div>
      </div>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmCrop}
        title="Apply Crop"
        message="This will permanently crop the image. The original outside the crop area will be lost. You can undo this action."
        confirmLabel="Apply Crop"
        onConfirm={applyCrop}
        onCancel={() => setConfirmCrop(false)}
      />
      <ConfirmDialog
        open={confirmResize}
        title="Apply Resize"
        message={`This will resize the image to ${resizeW} × ${resizeH} px. This operation is destructive.`}
        confirmLabel="Apply Resize"
        onConfirm={applyResize}
        onCancel={() => setConfirmResize(false)}
      />
    </div>
  );
}
