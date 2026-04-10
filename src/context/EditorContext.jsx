import React, { createContext, useContext, useReducer, useCallback } from 'react';

export const defaultAdjustments = {
  exposure: 0, contrast: 0, highlights: 0,
  shadows: 0, whites: 0, blacks: 0, brightness: 0,
  hue: 0, saturation: 0, vibrance: 0, temperature: 0, tint: 0,
};

const initialState = {
  images: [],
  activeImageId: null,
  adjustments: {},
  crop: {},
  history: {},
  historyIndex: {},
  compareMode: false,
  ui: {
    sidePanelOpen: true,
    activePanelTab: 'tonal',
    exportModalOpen: false,
  },
  toasts: [],
};

const MAX_HISTORY = 10;

function makeEntry(label, adjustments, crop) {
  return { timestamp: Date.now(), label, adjustments: { ...adjustments }, crop: crop ? { ...crop } : null };
}

function pushHistory(entries, index, newEntry) {
  const trimmed = entries.slice(0, index + 1);
  const updated = [...trimmed, newEntry].slice(-MAX_HISTORY);
  return { entries: updated, index: updated.length - 1 };
}

function editorReducer(state, action) {
  switch (action.type) {

    case 'LOAD_IMAGES': {
      const newImages = action.payload;
      const merged = [...state.images];
      const adj = { ...state.adjustments };
      const crop = { ...state.crop };
      const hist = { ...state.history };
      const histIdx = { ...state.historyIndex };

      for (const img of newImages) {
        if (!merged.find(m => m.id === img.id)) merged.push(img);
        if (!adj[img.id])     adj[img.id]     = { ...defaultAdjustments };
        if (!crop[img.id])    crop[img.id]    = { active: false, x: 0, y: 0, width: img.width, height: img.height, aspectRatio: null };
        if (!hist[img.id])    { hist[img.id] = []; histIdx[img.id] = -1; }
      }

      return {
        ...state,
        images: merged,
        activeImageId: state.activeImageId || newImages[0]?.id || null,
        adjustments: adj, crop, history: hist, historyIndex: histIdx,
      };
    }

    case 'SET_ACTIVE_IMAGE':
      return { ...state, activeImageId: action.payload };

    case 'UPDATE_ADJUSTMENT': {
      const { imageId, key, value } = action.payload;
      return {
        ...state,
        adjustments: {
          ...state.adjustments,
          [imageId]: { ...(state.adjustments[imageId] || defaultAdjustments), [key]: value },
        },
      };
    }

    case 'RESET_ADJUSTMENTS': {
      const { imageId } = action.payload;
      return { ...state, adjustments: { ...state.adjustments, [imageId]: { ...defaultAdjustments } } };
    }
    case 'RESET_COLOUR_ADJUSTMENTS': {
      const { imageId } = action.payload;
      const current = state.adjustments[imageId] || defaultAdjustments;
      return { 
        ...state, 
        adjustments: { 
          ...state.adjustments, 
          [imageId]: { 
            ...current, 
            hue: 0, saturation: 0, vibrance: 0, temperature: 0, tint: 0 
          } 
        } 
      };
    }
    case 'PUSH_HISTORY': {
      const { imageId, label } = action.payload;
      const entry = makeEntry(label, state.adjustments[imageId] || defaultAdjustments, state.crop[imageId]);
      const { entries, index } = pushHistory(
        state.history[imageId] || [],
        state.historyIndex[imageId] ?? -1,
        entry
      );
      return {
        ...state,
        history: { ...state.history, [imageId]: entries },
        historyIndex: { ...state.historyIndex, [imageId]: index },
      };
    }

    case 'UNDO': {
      const { imageId } = action.payload;
      const idx = state.historyIndex[imageId] ?? -1;
      if (idx <= 0) return state;
      const prevIdx = idx - 1;
      const entry = state.history[imageId][prevIdx];
      return {
        ...state,
        adjustments: { ...state.adjustments, [imageId]: { ...entry.adjustments } },
        ...(entry.crop ? { crop: { ...state.crop, [imageId]: { ...entry.crop } } } : {}),
        historyIndex: { ...state.historyIndex, [imageId]: prevIdx },
      };
    }

    case 'REDO': {
      const { imageId } = action.payload;
      const entries = state.history[imageId] || [];
      const idx = state.historyIndex[imageId] ?? -1;
      if (idx >= entries.length - 1) return state;
      const nextIdx = idx + 1;
      const entry = entries[nextIdx];
      return {
        ...state,
        adjustments: { ...state.adjustments, [imageId]: { ...entry.adjustments } },
        ...(entry.crop ? { crop: { ...state.crop, [imageId]: { ...entry.crop } } } : {}),
        historyIndex: { ...state.historyIndex, [imageId]: nextIdx },
      };
    }

    case 'JUMP_HISTORY': {
      const { imageId, index } = action.payload;
      const entries = state.history[imageId] || [];
      if (index < 0 || index >= entries.length) return state;
      const entry = entries[index];
      return {
        ...state,
        adjustments: { ...state.adjustments, [imageId]: { ...entry.adjustments } },
        ...(entry.crop ? { crop: { ...state.crop, [imageId]: { ...entry.crop } } } : {}),
        historyIndex: { ...state.historyIndex, [imageId]: index },
      };
    }

    case 'CLEAR_HISTORY': {
      const { imageId } = action.payload;
      return {
        ...state,
        history: { ...state.history, [imageId]: [] },
        historyIndex: { ...state.historyIndex, [imageId]: -1 },
      };
    }

    case 'SET_CROP': {
      const { imageId, cropState } = action.payload;
      return { ...state, crop: { ...state.crop, [imageId]: { ...state.crop[imageId], ...cropState } } };
    }

    case 'APPLY_CROP': {
      const { imageId } = action.payload;
      const crop = state.crop[imageId];
      const entry = makeEntry('Crop applied', state.adjustments[imageId] || defaultAdjustments, crop);
      const { entries, index } = pushHistory(state.history[imageId] || [], state.historyIndex[imageId] ?? -1, entry);
      return {
        ...state,
        crop: { ...state.crop, [imageId]: { ...crop, active: false } },
        history: { ...state.history, [imageId]: entries },
        historyIndex: { ...state.historyIndex, [imageId]: index },
      };
    }

    case 'CANCEL_CROP': {
      const { imageId } = action.payload;
      return { ...state, crop: { ...state.crop, [imageId]: { ...state.crop[imageId], active: false } } };
    }

    case 'ROTATE_IMAGE': {
      const { imageId, direction } = action.payload;
      const label = direction === 'cw' ? 'Rotate 90° CW' : 'Rotate 90° CCW';
      const entry = makeEntry(label, state.adjustments[imageId] || defaultAdjustments, state.crop[imageId]);
      const { entries, index } = pushHistory(state.history[imageId] || [], state.historyIndex[imageId] ?? -1, entry);
      return {
        ...state,
        history: { ...state.history, [imageId]: entries },
        historyIndex: { ...state.historyIndex, [imageId]: index },
      };
    }

    case 'UPDATE_IMAGE_DATA': {
      const { imageId, originalData, width, height } = action.payload;
      return {
        ...state,
        images: state.images.map(img => img.id === imageId ? { ...img, originalData, width, height } : img),
      };
    }

    case 'TOGGLE_COMPARE':
      return { ...state, compareMode: action.payload ?? !state.compareMode };

    case 'TOGGLE_SIDE_PANEL':
      return { ...state, ui: { ...state.ui, sidePanelOpen: !state.ui.sidePanelOpen } };

    case 'SET_PANEL_TAB':
      return { ...state, ui: { ...state.ui, activePanelTab: action.payload } };

    case 'OPEN_EXPORT_MODAL':
      return { ...state, ui: { ...state.ui, exportModalOpen: true } };

    case 'CLOSE_EXPORT_MODAL':
      return { ...state, ui: { ...state.ui, exportModalOpen: false } };

    case 'ADD_TOAST': {
      const toast = { id: action.payload.id || `${Date.now()}`, message: action.payload.message, type: action.payload.type || 'info' };
      return { ...state, toasts: [...state.toasts, toast] };
    }

    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };

    default:
      return state;
  }
}

const EditorContext = createContext(null);

export function EditorProvider({ children }) {
  const [state, dispatch] = useReducer(editorReducer, initialState);

  const activeImage = state.images.find(img => img.id === state.activeImageId) || null;
  const activeAdjustments = state.activeImageId
    ? (state.adjustments[state.activeImageId] || { ...defaultAdjustments })
    : { ...defaultAdjustments };
  const activeCrop = state.activeImageId ? (state.crop[state.activeImageId] || null) : null;
  const activeHistory = state.activeImageId ? (state.history[state.activeImageId] || []) : [];
  const activeHistoryIndex = state.activeImageId ? (state.historyIndex[state.activeImageId] ?? -1) : -1;
  const canUndo = activeHistoryIndex > 0;
  const canRedo = activeHistoryIndex < activeHistory.length - 1;

  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    dispatch({ type: 'ADD_TOAST', payload: { id, message, type } });
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: id }), duration);
  }, []);

  return (
    <EditorContext.Provider value={{
      state, dispatch,
      activeImage, activeAdjustments, activeCrop,
      activeHistory, activeHistoryIndex,
      canUndo, canRedo,
      showToast, defaultAdjustments,
    }}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be inside EditorProvider');
  return ctx;
}
