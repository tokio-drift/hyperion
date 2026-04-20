import React, { useState, useCallback } from "react";
import { useEditor } from "../../context/EditorContext";
import {
  imageDataToBlob,
  downloadBlob,
  mimeToExtension,
  replaceExtension,
} from "../../utils/exportUtils";

const FORMATS = [
  { label: "JPEG", mime: "image/jpeg", hasQuality: true },
  { label: "PNG", mime: "image/png", hasQuality: false },
  { label: "WEBP", mime: "image/webp", hasQuality: true },
];

export default function ExportModal() {
  const { state, dispatch, activeImage, showToast } = useEditor();
  const { exportModalOpen } = state.ui;

  const [format, setFormat] = useState("image/jpeg");
  const [quality, setQuality] = useState(92);
  const [filename, setFilename] = useState("");
  const [exporting, setExporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null);

  React.useEffect(() => {
    if (exportModalOpen && activeImage) {
      setFilename(replaceExtension(activeImage.name, mimeToExtension(format)));
    }
  }, [exportModalOpen, activeImage?.id, format]);

  const close = () => dispatch({ type: "CLOSE_EXPORT_MODAL" });

async function getFinalImageData(image, adjustments) {
  const { applyAllAdjustments } = await import('../../utils/imageFilters.js');
  return applyAllAdjustments(image.originalData, adjustments, image.masks);
}

  const handleExport = useCallback(async () => {
    if (!activeImage) return;
    setExporting(true);
    try {
      const adj = state.adjustments[activeImage.id] || {};
      const finalData = await getFinalImageData(activeImage, adj);
      const blob = await imageDataToBlob(finalData, format, quality / 100);
      const name =
        filename || replaceExtension(activeImage.name, mimeToExtension(format));
      downloadBlob(blob, name);
      showToast(`Exported "${name}"`, "success");
      close();
    } catch (err) {
      showToast("Export failed: " + err.message, "error");
    } finally {
      setExporting(false);
    }
  }, [activeImage, state.adjustments, format, quality, filename, showToast]);

  const handleExportAll = useCallback(async () => {
    if (!state.images.length) return;
    setExporting(true);
    setBatchProgress({ done: 0, total: state.images.length });
    try {
      for (let i = 0; i < state.images.length; i++) {
        const img = state.images[i];
        const adj = state.adjustments[img.id] || {};
        const finalData = await getFinalImageData(img, adj);
        const blob = await imageDataToBlob(finalData, format, quality / 100);
        const name = replaceExtension(img.name, mimeToExtension(format));
        downloadBlob(blob, name);
        setBatchProgress({ done: i + 1, total: state.images.length });
        await new Promise((r) => setTimeout(r, 200));
      }
      showToast(`Exported ${state.images.length} images`, "success");
      close();
    } catch (err) {
      showToast("Batch export failed: " + err.message, "error");
    } finally {
      setExporting(false);
      setBatchProgress(null);
    }
  }, [state.images, state.adjustments, format, quality, showToast]);

  if (!exportModalOpen) return null;

  const selectedFormat = FORMATS.find((f) => f.mime === format);
  const hasMultiple = state.images.length > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(3px)" }}
      onClick={close}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-white font-semibold text-sm">Export Image</h2>
          <button
            onClick={close}
            className="text-gray-500 hover:text-white text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs text-gray-400 mb-2 font-medium">
              Format
            </label>
            <div className="flex gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.mime}
                  onClick={() => setFormat(f.mime)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors
                    ${
                      format === f.mime
                        ? "border-blue-500 bg-blue-500/20 text-blue-300"
                        : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"
                    }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {selectedFormat?.hasQuality && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400 font-medium">
                  Quality
                </label>
                <span className="text-xs font-mono text-blue-400">
                  {quality}%
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-700 mt-1">
                <span>Smaller file</span>
                <span>Best quality</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-400 mb-2 font-medium">
              Filename
            </label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 outline-none focus:border-blue-500 transition-colors font-mono"
              placeholder="output.jpg"
            />
          </div>

          {hasMultiple && (
            <div className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-2.5">
              <p className="text-xs text-gray-400">
                <span className="text-yellow-400 font-medium">
                  {state.images.length} images loaded.
                </span>{" "}
                Use "Export All" to download as separate files.
              </p>
            </div>
          )}

          {batchProgress && (
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>Exporting…</span>
                <span>
                  {batchProgress.done} / {batchProgress.total}
                </span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                  style={{
                    width: `${(batchProgress.done / batchProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={close}
            className="flex-1 py-2 text-sm rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors border border-gray-700"
          >
            Cancel
          </button>
          {hasMultiple && (
            <button
              onClick={handleExportAll}
              disabled={exporting}
              className="flex-1 py-2 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50"
            >
              {batchProgress
                ? `${batchProgress.done}/${batchProgress.total}`
                : "Export All"}
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={exporting || !activeImage}
            className="flex-1 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50"
          >
            {exporting && !batchProgress ? "Exporting…" : "Download"}
          </button>
        </div>
      </div>
    </div>
  );
}
