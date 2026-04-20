import React, { useCallback, useRef, useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { validateFiles } from '../../utils/formatValidation';

const ACCEPTED = '.jpg,.jpeg,.png,.webp,.gif,.bmp';

async function fileToImageData(file) {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  let canvas;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(width, height);
  } else {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return { imageData: ctx.getImageData(0, 0, width, height), width, height };
}

function generateId() {
  return `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function UploadZone({ children, overlayMode = false }) {
  const { dispatch, showToast } = useEditor();
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const processFiles = useCallback(async (files) => {
    if (!files.length) return;

    const { valid, errors } = validateFiles(Array.from(files));

    for (const error of errors) {
      showToast(error, 'error');
    }

    if (!valid.length) return;

    setIsLoading(true);
    try {
      const imageObjects = await Promise.all(
        valid.map(async (file) => {
          const { imageData, width, height } = await fileToImageData(file);
          return {
            id: generateId(),
            file,
            originalData: imageData,
            currentData: imageData,
            name: file.name,
            width,
            height,
          };
        })
      );

      dispatch({ type: 'LOAD_IMAGES', payload: imageObjects });

      if (imageObjects.length === 1) {
        showToast(`Loaded "${imageObjects[0].name}"`, 'success');
      } else {
        showToast(`Loaded ${imageObjects.length} images`, 'success');
      }
    } catch (err) {
      showToast('Failed to load image. The file may be corrupted.', 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, showToast]);

  const handleFileInput = useCallback((e) => {
    processFiles(e.target.files);
    e.target.value = '';
  }, [processFiles]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  React.useEffect(() => {
    window.__hyperionOpenFilePicker = openFilePicker;
    return () => {
      if (window.__hyperionOpenFilePicker === openFilePicker) {
        delete window.__hyperionOpenFilePicker;
      }
    };
  }, [openFilePicker]);

  if (overlayMode) {
    return (
      <div
        className="absolute inset-0 z-10"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{ pointerEvents: isDragging ? 'all' : 'none' }}
      >
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 border-2 border-dashed border-blue-400 rounded z-20">
            <div className="text-center">
              <div className="text-4xl mb-2">+</div>
              <p className="text-blue-300 font-medium">Drop to add images</p>
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="hidden"
          onChange={handleFileInput}
        />
      </div>
    );
  }

  return (
    <div
      className={`
        flex flex-col items-center justify-center w-full h-full
        border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer select-none
        ${isDragging
          ? 'border-blue-400 bg-blue-900/20'
          : 'border-gray-600 hover:border-gray-400 bg-transparent hover:bg-white/[0.02]'
        }
      `}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={openFilePicker}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && openFilePicker()}
      aria-label="Upload images"
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        className="hidden"
        onChange={handleFileInput}
      />

      {isLoading ? (
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <LoadingSpinner />
          <p className="text-sm">Processing image…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 px-8 text-center pointer-events-none">
          <UploadIcon isDragging={isDragging} />
          <div>
            <p className={`text-lg font-medium mb-1 transition-colors ${isDragging ? 'text-blue-300' : 'text-gray-200'}`}>
              {isDragging ? 'Drop your images here' : 'Drop images to get started'}
            </p>
            <p className="text-gray-500 text-sm">
              or <span className="text-blue-400 underline underline-offset-2">browse files</span>
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5 mt-1">
            {['JPEG', 'PNG', 'WEBP', 'GIF', 'BMP'].map(fmt => (
              <span
                key={fmt}
                className="px-2 py-0.5 text-xs bg-gray-800 text-gray-400 rounded border border-gray-700 font-mono"
              >
                {fmt}
              </span>
            ))}
          </div>
          <p className="text-gray-600 text-xs">Max 30 MB per file · Multiple files supported</p>
        </div>
      )}
    </div>
  );
}

function UploadIcon({ isDragging }) {
  return (
    <div className={`
      w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-200
      ${isDragging ? 'bg-blue-500/20 scale-110' : 'bg-gray-800'}
    `}>
      <svg
        width="32" height="32" viewBox="0 0 24 24" fill="none"
        className={isDragging ? 'text-blue-400' : 'text-gray-400'}
        stroke="currentColor" strokeWidth="1.5"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="w-10 h-10 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
  );
}