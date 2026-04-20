export function reduceUiActions(state, action) {
  switch (action.type) {
    case "TOGGLE_COMPARE":
      return { ...state, compareMode: action.payload ?? !state.compareMode };

    case "TOGGLE_SIDE_PANEL":
      return {
        ...state,
        ui: { ...state.ui, sidePanelOpen: !state.ui.sidePanelOpen },
      };

    case "SET_PANEL_TAB":
      return { ...state, ui: { ...state.ui, activePanelTab: action.payload } };

    case "OPEN_EXPORT_MODAL":
      return { ...state, ui: { ...state.ui, exportModalOpen: true } };

    case "CLOSE_EXPORT_MODAL":
      return { ...state, ui: { ...state.ui, exportModalOpen: false } };

    case "TOGGLE_GALLERY":
      return {
        ...state,
        ui: {
          ...state.ui,
          galleryOpen: action.payload ?? !state.ui.galleryOpen,
        },
      };

    case "ADD_TOAST": {
      const toast = {
        id: action.payload.id || `${Date.now()}`,
        message: action.payload.message,
        type: action.payload.type || "info",
      };
      return { ...state, toasts: [...state.toasts, toast] };
    }
    case "OPEN_FEEDBACK_MODAL":
      return { ...state, ui: { ...state.ui, feedbackModalOpen: true } };
    case "CLOSE_FEEDBACK_MODAL":
      return { ...state, ui: { ...state.ui, feedbackModalOpen: false } };
    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.payload),
      };

    default:
      return null;
  }
}
