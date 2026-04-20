import React, { createContext, useContext, useReducer, useCallback } from "react";
import {
  defaultAdjustments,
  initialState,
  editorReducer,
} from "./editorReducer";

const EditorContext = createContext(null);

export function EditorProvider({ children }) {
  const [state, dispatch] = useReducer(editorReducer, initialState);

  const activeImage =
    state.images.find((img) => img.id === state.activeImageId) || null;
  const activeAdjustments = state.activeImageId
    ? state.adjustments[state.activeImageId] || { ...defaultAdjustments }
    : { ...defaultAdjustments };
  const activeCrop = state.activeImageId
    ? state.crop[state.activeImageId] || null
    : null;
  const activeHistory = state.activeImageId
    ? state.history[state.activeImageId] || []
    : [];
  const activeHistoryIndex = state.activeImageId
    ? (state.historyIndex[state.activeImageId] ?? -1)
    : -1;
  const canUndo = activeHistoryIndex > 0;
  const canRedo = activeHistoryIndex < activeHistory.length - 1;

  const showToast = useCallback((message, type = "info", duration = 3500) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    dispatch({ type: "ADD_TOAST", payload: { id, message, type } });
    setTimeout(() => dispatch({ type: "REMOVE_TOAST", payload: id }), duration);
  }, []);

  return (
    <EditorContext.Provider
      value={{
        state,
        dispatch,
        activeImage,
        activeAdjustments,
        activeCrop,
        activeHistory,
        activeHistoryIndex,
        canUndo,
        canRedo,
        showToast,
        defaultAdjustments,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be inside EditorProvider");
  return ctx;
}
