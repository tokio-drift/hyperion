import React, { useEffect, useRef } from 'react';
import { useEditor } from '../../context/EditorContext';
import UploadZone from '../upload/UploadZone';

export default function GalleryView() {
  const { state } = useEditor();

  if (state.images.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-10 bg-[#111] checkerboard">
        <div className="w-full h-full max-w-xl max-h-96">
          <UploadZone />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#111] p-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {state.images.map((img) => (
          <GalleryCard key={img.id} image={img} />
        ))}
      </div>
    </div>
  );
}

function GalleryCard({ image }) {
  const { state, dispatch } = useEditor();
  const canvasRef = useRef(null);
  const isActive = state.activeImageId === image.id;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image.originalData) return;
    const src = image.originalData;
    
    // Scale down image data for the thumbnail to optimize memory 
    const maxDim = 300;
    const scale = Math.min(maxDim / src.width, maxDim / src.height);
    const w = Math.max(1, Math.round(src.width * scale));
    const h = Math.max(1, Math.round(src.height * scale));
    
    canvas.width = w;
    canvas.height = h;
    
    const temp = document.createElement('canvas');
    temp.width = src.width;
    temp.height = src.height;
    temp.getContext('2d').putImageData(src, 0, 0);
    
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(temp, 0, 0, w, h);
  }, [image.originalData]);

  const handleClick = () => {
    dispatch({ type: 'SET_ACTIVE_IMAGE', payload: image.id });
    dispatch({ type: 'TOGGLE_GALLERY', payload: false });
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm('Delete this image? Unsaved changes will be lost.')) {
      dispatch({ type: 'DELETE_IMAGE', payload: { imageId: image.id } });
    }
  };

  return (
    <div 
      onClick={handleClick}
      className={`
        group relative flex flex-col bg-[#242424] border rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl
        ${isActive ? 'border-blue-500 ring-2 ring-blue-500 ring-offset-2 ring-offset-[#111]' : 'border-gray-800 hover:border-gray-600'}
      `}
    >
      <button
        onClick={handleDelete}
        className="absolute top-2 right-2 z-10 p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
        title="Delete Image"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
      </button>
      
      <div className="aspect-square bg-[#1a1a1a] flex items-center justify-center p-4 relative checkerboard">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full object-contain drop-shadow-md relative z-10"
        />
      </div>
      <div className="p-3 border-t border-gray-800 bg-[#242424] z-20">
        <p className="text-sm font-medium text-gray-200 truncate" title={image.name}>{image.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">{image.width} × {image.height}</p>
      </div>
    </div>
  );
}