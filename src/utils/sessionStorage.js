const DB_NAME = 'hyperion_session_db';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';
const TAB_SESSION_ID_KEY = 'hyperion_tab_session_id';

function getTabSessionId(createIfMissing = false) {
  if (typeof sessionStorage === 'undefined') return null;

  const existing = sessionStorage.getItem(TAB_SESSION_ID_KEY);
  if (existing) return existing;
  if (!createIfMissing) return null;

  const next = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  sessionStorage.setItem(TAB_SESSION_ID_KEY, next);
  return next;
}

function getSessionRecordKey(createIfMissing = false) {
  const tabId = getTabSessionId(createIfMissing);
  return tabId ? `tab:${tabId}` : null;
}

function openSessionDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

function runStoreRequest(db, mode, operation) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const req = operation(store);

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB request failed'));
  });
}

function serializeImageData(imageData) {
  if (!imageData) return null;
  return {
    width: imageData.width,
    height: imageData.height,
    // Clone to detach from mutable runtime buffers.
    buffer: imageData.data.buffer.slice(0),
  };
}

function deserializeImageData(serialized) {
  if (!serialized || !serialized.buffer) return null;
  return new ImageData(new Uint8ClampedArray(serialized.buffer), serialized.width, serialized.height);
}

function serializeMask(mask) {
  return {
    id: mask.id,
    label: mask.label,
    inverted: !!mask.inverted,
    visible: mask.visible !== false,
    revision: mask.revision || 0,
    adjustments: { ...(mask.adjustments || {}) },
    maskDataBuffer: mask.maskData ? mask.maskData.buffer.slice(0) : new ArrayBuffer(0),
  };
}

function deserializeMask(mask, width, height) {
  const fallbackLength = Math.max(1, width * height);
  const data = mask.maskDataBuffer
    ? new Uint8Array(mask.maskDataBuffer)
    : new Uint8Array(fallbackLength);

  if (data.length === fallbackLength) {
    return {
      id: mask.id,
      label: mask.label,
      inverted: !!mask.inverted,
      visible: mask.visible !== false,
      revision: mask.revision || 0,
      adjustments: { ...(mask.adjustments || {}) },
      maskData: data,
    };
  }

  const resized = new Uint8Array(fallbackLength);
  resized.set(data.subarray(0, Math.min(data.length, fallbackLength)));
  return {
    id: mask.id,
    label: mask.label,
    inverted: !!mask.inverted,
    visible: mask.visible !== false,
    revision: mask.revision || 0,
    adjustments: { ...(mask.adjustments || {}) },
    maskData: resized,
  };
}

function serializeImage(image) {
  return {
    id: image.id,
    name: image.name,
    width: image.width,
    height: image.height,
    originalData: serializeImageData(image.originalData),
    masks: Array.isArray(image.masks) ? image.masks.map(serializeMask) : [],
    activeMaskId: image.activeMaskId || null,
  };
}

function deserializeImage(image) {
  const originalData = deserializeImageData(image.originalData);
  const width = originalData?.width || image.width;
  const height = originalData?.height || image.height;

  return {
    id: image.id,
    name: image.name,
    width,
    height,
    originalData,
    currentData: originalData,
    masks: Array.isArray(image.masks)
      ? image.masks.map((mask) => deserializeMask(mask, width, height))
      : [],
    activeMaskId: image.activeMaskId || null,
  };
}

export function toPersistedSession(state) {
  return {
    version: 1,
    savedAt: Date.now(),
    images: state.images.map(serializeImage),
    adjustments: state.adjustments,
    crop: state.crop,
    activeImageId: state.activeImageId,
    brushSettings: state.brushSettings,
    showMaskOverlay: state.showMaskOverlay,
    ui: {
      sidePanelOpen: state.ui?.sidePanelOpen,
      activePanelTab: state.ui?.activePanelTab,
    },
    // Intentionally omit heavy history snapshots containing full image buffers.
    history: {},
    historyIndex: {},
  };
}

export function fromPersistedSession(session) {
  const images = Array.isArray(session?.images)
    ? session.images.map(deserializeImage).filter((img) => !!img.originalData)
    : [];

  const activeImageId =
    images.find((img) => img.id === session?.activeImageId)?.id ||
    images[0]?.id ||
    null;

  return {
    images,
    activeImageId,
    adjustments: session?.adjustments || {},
    crop: session?.crop || {},
    brushSettings: session?.brushSettings || null,
    showMaskOverlay:
      typeof session?.showMaskOverlay === 'boolean' ? session.showMaskOverlay : null,
    ui: session?.ui || null,
  };
}

export async function saveSession(state) {
  const key = getSessionRecordKey(true);
  if (!key) return;

  const db = await openSessionDb();
  try {
    const payload = toPersistedSession(state);
    await runStoreRequest(db, 'readwrite', (store) => store.put(payload, key));
  } finally {
    db.close();
  }
}

export async function loadSession() {
  const key = getSessionRecordKey(false);
  if (!key) return null;

  const db = await openSessionDb();
  try {
    const raw = await runStoreRequest(db, 'readonly', (store) => store.get(key));
    return raw ? fromPersistedSession(raw) : null;
  } finally {
    db.close();
  }
}

export async function clearSession() {
  const key = getSessionRecordKey(false);
  if (!key) return;

  const db = await openSessionDb();
  try {
    await runStoreRequest(db, 'readwrite', (store) => store.delete(key));
  } finally {
    db.close();
  }
}
