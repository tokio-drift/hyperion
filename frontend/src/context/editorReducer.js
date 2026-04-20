import { reduceImageActions } from "./reducer/imageActions";
import { reduceAdjustmentActions } from "./reducer/adjustmentActions";
import { reduceHistoryActions } from "./reducer/historyActions";
import { reduceMaskActions } from "./reducer/maskActions";
import { reduceUiActions } from "./reducer/uiActions";

export { defaultAdjustments, initialState } from "./reducer/constants";

const reducers = [
  reduceImageActions,
  reduceAdjustmentActions,
  reduceHistoryActions,
  reduceMaskActions,
  reduceUiActions,
];

export function editorReducer(state, action) {
  for (const reduce of reducers) {
    const nextState = reduce(state, action);
    if (nextState !== null) return nextState;
  }
  return state;
}
