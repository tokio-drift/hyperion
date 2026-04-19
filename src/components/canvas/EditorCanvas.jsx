import React, { useState } from "react";
import { useEditor } from "../../context/EditorContext";
import UploadZone from "../upload/UploadZone";
import MaskCanvas from "./MaskCanvas";
import { useMaskStrokeHandlers } from "../../hooks/useMaskStrokeHandlers";
import { useCanvasInteractions } from "../../hooks/useCanvasInteractions";
import { useCanvasProcessing } from "../../hooks/useCanvasProcessing";

export default function EditorCanvas() {
  const { state, dispatch, activeImage, activeAdjustments, activeCrop } =
    useEditor();
  const { compareMode } = state;

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const { canvasRef, containerRef, getTransform } = useCanvasProcessing({
    activeImage,
    activeAdjustments,
    activeCrop,
    maskMode: state.maskMode,
    compareMode,
    zoom,
    pan,
    setZoom,
    setPan,
  });

  const {
    cursorStyle,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  } = useCanvasInteractions({
    activeCrop,
    activeImage,
    getTransform,
    containerRef,
    dispatch,
    pan,
    setPan,
    setZoom,
  });

  const { activeMaskRef, handleStrokeStart, handleStrokeMove, handleStrokeEnd } =
    useMaskStrokeHandlers({
      activeImage,
      brushSettings: state.brushSettings,
      dispatch,
    });

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
      style={{ background: "#111", cursor: cursorStyle }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-10"
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          pointerEvents: state.maskMode ? "none" : "auto",
        }}
      />
      <UploadZone overlayMode />

      {compareMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <span className="compare-badge badge px-3 py-1 bg-gray-900/80 text-gray-300 border border-gray-600 rounded backdrop-blur-sm">
            before
          </span>
        </div>
      )}

      <MaskCanvas
        maskData={activeMaskRef.current?.maskData}
        maskRevision={activeMaskRef.current?.revision || 0}
        inverted={activeMaskRef.current?.inverted}
        width={activeImage.width}
        height={activeImage.height}
        imageRect={getTransform()}
        showOverlay={
          state.showMaskOverlay &&
          !!activeMaskRef.current &&
          activeMaskRef.current.visible
        }
        brushSettings={state.brushSettings}
        maskMode={state.maskMode}
        onStrokeStart={handleStrokeStart}
        onStrokeMove={handleStrokeMove}
        onStrokeEnd={handleStrokeEnd}
      />

      <div className="absolute bottom-3 left-3 z-40 pointer-events-none">
        <span className="text-xs font-mono text-gray-600 bg-black/30 px-2 py-0.5 rounded">
          {Math.round(zoom * 100)}%
        </span>
      </div>
      {zoom === 1 && (
        <div className="absolute bottom-3 right-3 z-40 pointer-events-none">
          <span className="text-xs text-gray-700">Alt+drag to pan</span>
        </div>
      )}
    </div>
  );
}
