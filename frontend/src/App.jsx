import React, { useEffect, useRef } from "react";
import { useEditor } from "./context/EditorContext";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import Toolbar from "./components/toolbar/Toolbar";
import EditorCanvas from "./components/canvas/EditorCanvas";
import SidePanel from "./components/panels/SidePanel";
import ExportModal from "./components/export/ExportModal";
import FeedbackModal from "./components/feedback/FeedbackModal";
import ToastStack from "./components/shared/ToastStack";
import GalleryView from "./components/gallery/GalleryView";
import UploadZone from "./components/upload/UploadZone";
import { saveSession, loadSession, clearSession } from "./utils/sessionStorage";
import HelpManual from "./components/help/HelpManual";
const LEGACY_SESSION_KEY = "hyperion_session";

export default function App() {
  const { state, dispatch, showToast } = useEditor();

  useKeyboardShortcuts();

  const saveTimerRef = useRef(null);
  const hydrationDoneRef = useRef(false);

  useEffect(() => {
    if (!hydrationDoneRef.current) return;

    clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      (async () => {
        try {
          if (!state.images.length) {
            await clearSession();
            return;
          }

          await saveSession(state);

          try {
            localStorage.removeItem(LEGACY_SESSION_KEY);
          } catch {}
        } catch (err) {
          console.warn("Failed to persist session to IndexedDB:", err);
        }
      })();
    }, 900);

    return () => clearTimeout(saveTimerRef.current);
  }, [
    state.images,
    state.activeImageId,
    state.adjustments,
    state.crop,
    state.brushSettings,
    state.showMaskOverlay,
    state.ui.sidePanelOpen,
    state.ui.activePanelTab,
  ]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const restored = await loadSession();
        if (cancelled) return;

        if (restored?.images?.length) {
          dispatch({ type: "LOAD_IMAGES", payload: restored.images });
          dispatch({
            type: "RESTORE_SESSION",
            payload: {
              adjustments: restored.adjustments,
              crop: restored.crop,
              activeImageId: restored.activeImageId,
              brushSettings: restored.brushSettings,
              showMaskOverlay: restored.showMaskOverlay,
              ui: restored.ui,
            },
          });

          showToast(
            `Session restored (${restored.images.length} image${restored.images.length > 1 ? "s" : ""})`,
            "success",
            3800,
          );
        }
      } catch (err) {
        console.warn("Failed to restore session from IndexedDB:", err);
      } finally {
        hydrationDoneRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch, showToast]);

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: "#111" }}
    >
      <Toolbar />

      <div className="flex flex-1 overflow-hidden relative">
        <div
          className="flex flex-1 w-full h-full"
          style={{ display: state.ui.galleryOpen ? "none" : "flex" }}
        >
          <EditorCanvas />
          <SidePanel />
        </div>

        {state.ui.galleryOpen && (
          <div className="absolute inset-0 w-full h-full flex z-10 bg-[#111]">
            <GalleryView />
          </div>
        )}

        {state.images.length > 0 && <UploadZone overlayMode />}
      </div>

      {state.images.length > 1 && !state.ui.galleryOpen && <Filmstrip />}
      <HelpManual />
      <FeedbackModal />
      <ExportModal />
      <ToastStack />
    </div>
  );
}

function Filmstrip() {
  const { state, dispatch } = useEditor();

  return (
    <div
      className="flex-shrink-0 flex items-center gap-2 px-3 border-t border-gray-800 overflow-x-auto"
      style={{ height: 72, background: "#1a1a1a" }}
    >
      {state.images.map((img) => (
        <FilmThumb
          key={img.id}
          image={img}
          isActive={img.id === state.activeImageId}
          onClick={() =>
            dispatch({ type: "SET_ACTIVE_IMAGE", payload: img.id })
          }
        />
      ))}
    </div>
  );
}

function FilmThumb({ image, isActive, onClick }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image.originalData) return;

    const src = image.originalData;
    const scale = Math.min(52 / (src.width || 1), 48 / (src.height || 1));
    const w = Math.max(1, Math.round((src.width || 1) * scale));
    const h = Math.max(1, Math.round((src.height || 1) * scale));

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    try {
      let drawable = src;
      if (src.data && !(src instanceof ImageData)) {
        drawable = new ImageData(
          new Uint8ClampedArray(src.data),
          src.width,
          src.height,
        );
      }

      if (drawable instanceof ImageData) {
        const temp = document.createElement("canvas");
        temp.width = drawable.width;
        temp.height = drawable.height;
        temp.getContext("2d").putImageData(drawable, 0, 0);
        ctx.drawImage(temp, 0, 0, w, h);
      } else {
        ctx.drawImage(drawable, 0, 0, w, h);
      }
    } catch (err) {
      console.warn("Failed to render filmstrip thumbnail:", err);
    }
  }, [image.originalData]);

  return (
    <button
      onClick={onClick}
      title={image.name}
      className={`
        flex-shrink-0 flex items-center justify-center rounded overflow-hidden transition-all duration-150
        ${
          isActive
            ? "ring-2 ring-blue-500 ring-offset-1 ring-offset-black"
            : "ring-1 ring-gray-700 hover:ring-gray-500"
        }
      `}
      style={{ width: 56, height: 56, background: "#2a2a2a" }}
    >
      <canvas
        ref={canvasRef}
        style={{ maxWidth: "100%", maxHeight: "100%", display: "block" }}
      />
    </button>
  );
}
