import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFileStore } from '../store/useFileStore';
import { X, Star, Heart, Tag as TagIcon, MessageSquare, ZoomIn, ZoomOut, RotateCcw, FlipHorizontal, Pipette, Copy } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000';

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi'];

const RatingDisplay: React.FC<{ rating: number }> = ({ rating }) => {
  return (
    <div className="flex gap-1">
      {[...Array(10)].map((_, i) => <Star key={i + 1} size={22} className={`${i + 1 <= rating ? 'text-yellow-400' : 'text-gray-500'}`} />)}
    </div>
  );
};

const FileDetailModal: React.FC = () => {
  const { selectedFile, selectFile, updateMetadata } = useFileStore();

  // Viewer state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Color picker state
  const [isPickerEnabled, setIsPickerEnabled] = useState(false);
  const [pickedColor, setPickedColor] = useState<string | null>(null);
  const [isColorLocked, setIsColorLocked] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const resetViewerState = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsFlipped(false);
    setIsPickerEnabled(false);
    setPickedColor(null);
    setIsColorLocked(false);
  }, []);

  useEffect(() => {
    if (selectedFile) {
      resetViewerState();
    }
  }, [selectedFile, resetViewerState]);

  const handleClose = () => selectFile(null);

  const getFileUrl = (filePath: string) => `${API_BASE_URL}/${filePath.replace(/\\/g, '/').replace(/^\.?\//, '')}`;

  const fileExtension = selectedFile?.name.split('.').pop()?.toLowerCase() || '';
  const isImage = IMAGE_EXTENSIONS.includes(fileExtension);
  const isVideo = VIDEO_EXTENSIONS.includes(fileExtension);

  // --- Viewer Handlers ---
  const handleWheel = (e: WheelEvent) => {
    if (!isImage || !imageContainerRef.current) return;
    e.preventDefault();
    const { deltaY, ctrlKey } = e;
    if (ctrlKey) { // Pan vertically with Ctrl+Wheel
      setPosition(p => ({ ...p, y: p.y - deltaY }));
    } else { // Zoom
      const zoomFactor = 1.1;
      const newScale = deltaY < 0 ? scale * zoomFactor : scale / zoomFactor;
      setScale(Math.max(0.1, Math.min(newScale, 20)));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPickerEnabled || !isImage) return;
    e.preventDefault();
    setIsPanning(true);
    startPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !isImage) return;
    e.preventDefault();
    setPosition({ x: e.clientX - startPos.current.x, y: e.clientY - startPos.current.y });
  };

  const handleMouseUpOrLeave = () => setIsPanning(false);

  useEffect(() => {
    const container = imageContainerRef.current;
    if (container && isImage) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [isImage, scale]); // Re-attach if scale changes to ensure it's not stale

  // --- Color Picker Logic ---
  useEffect(() => {
    if (isPickerEnabled && imageRef.current && canvasRef.current) {
      const image = imageRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const drawImageToCanvas = () => {
        if (!ctx) return;
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        ctx.drawImage(image, 0, 0);
      };
      if (image.complete) drawImageToCanvas();
      else image.onload = drawImageToCanvas;
    }
  }, [isPickerEnabled, selectedFile]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPickerEnabled || !canvasRef.current || isColorLocked) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    setPickedColor(`#${("000000" + ((pixel[0] << 16) | (pixel[1] << 8) | pixel[2]).toString(16)).slice(-6)}`);
  };

  if (!selectedFile) return null;

  const renderMedia = () => {
    const url = getFileUrl(selectedFile.path);
    const transform = `translate(${position.x}px, ${position.y}px) scale(${scale}) scaleX(${isFlipped ? -1 : 1})`;

    if (isImage) {
      return (
        <div style={{ transform, cursor: isPanning ? 'grabbing' : 'grab' }}>
          <img ref={imageRef} src={url} alt={selectedFile.name} crossOrigin="anonymous" style={{ visibility: isPickerEnabled ? 'hidden' : 'visible' }} />
          {isPickerEnabled && <canvas ref={canvasRef} onMouseMove={handleCanvasMouseMove} onClick={() => setIsColorLocked(!isColorLocked)} style={{ position: 'absolute', top: 0, left: 0, cursor: 'crosshair' }} />}
        </div>
      );
    } else if (isVideo) {
      return <video src={url} controls autoPlay loop className="max-w-full max-h-full object-contain" />;
    } else {
      return <p>Unsupported file type</p>;
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><button className="modal-close-button" onClick={handleClose}><X size={24} /></button></div>
        <div className="modal-body flex flex-row h-full gap-8">
          {/* Viewer Area */}
          <div ref={imageContainerRef} className="flex-1 h-full bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUpOrLeave} onMouseLeave={handleMouseUpOrLeave}>
            {renderMedia()}
          </div>

          {/* Details & Actions Area */}
          <div className="w-96 flex-shrink-0 h-full flex flex-col gap-4 overflow-y-auto pr-2 sidebar" style={{ borderRight: 'none', borderLeft: '1px solid var(--color-border)' }}>
            <div className="flex justify-between items-center text-xl font-semibold gap-4">
              <h3 title={selectedFile.name} className="truncate">{selectedFile.name}</h3>
              <button className="bg-transparent border-none p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 flex-shrink-0" disabled>
                <Heart size={22} className={selectedFile.file_metadata?.is_favorite ? 'text-red-500' : ''} />
              </button>
            </div>
            <p className="text-sm text-gray-400 -mt-3 mb-4">Uploaded: {new Date(selectedFile.created_at).toLocaleString()}</p>

            {isImage && (<div className="sidebar-section">
              <h4>Viewer Controls</h4>
                              <div className="grid grid-cols-2 gap-2">
                                <button className="form-group button secondary flex items-center justify-center gap-2" onClick={() => setScale(s => s * 1.2)}><ZoomIn size={18} /> Zoom In</button>
                                <button className="form-group button secondary flex items-center justify-center gap-2" onClick={() => setScale(s => s / 1.2)}><ZoomOut size={18} /> Zoom Out</button>
                                <button className="form-group button secondary flex items-center justify-center gap-2" onClick={() => setIsFlipped(f => !f)}><FlipHorizontal size={18} /> Flip</button>
                                <button className="form-group button secondary flex items-center justify-center gap-2" onClick={resetViewerState}><RotateCcw size={18} /> Reset</button>
                                <button className="form-group button secondary flex items-center justify-center gap-2 col-span-2" onClick={() => setIsPickerEnabled(p => !p)}><Pipette size={18} /> {isPickerEnabled ? 'Disable' : 'Enable'} Color Picker</button>
                              </div>              {isPickerEnabled && (
                <div className="flex items-center gap-2 text-sm text-gray-300 mt-3 p-2 bg-black/20 rounded-md">
                  <div style={{ backgroundColor: pickedColor || 'transparent', width: '24px', height: '24px', border: '1px solid var(--color-border)', borderRadius: '4px' }}></div>
                  <span className="font-mono flex-grow">{pickedColor || 'Hover to pick'} {isColorLocked && '(Locked)'}</span>
                  {pickedColor && <button className="bg-gray-600 hover:bg-gray-500 p-1.5 rounded-md" onClick={() => navigator.clipboard.writeText(pickedColor)}><Copy size={16} /></button>}
                </div>
              )}
            </div>
            )}

            <div className="sidebar-section">
              <h4>Rating</h4>
              <RatingDisplay rating={selectedFile.file_metadata?.rating || 0} />
            </div>
            <div className="sidebar-section">
              <h4><TagIcon size={16} /> Tags</h4>
              <div className="flex flex-wrap gap-2">
                {selectedFile.tags?.length > 0 ? selectedFile.tags.map(tag => <span key={tag.id} className="bg-indigo-500/20 text-indigo-300 text-xs font-medium px-2.5 py-1 rounded-full">{tag.name}</span>) : <p className="text-gray-500 text-sm">No tags yet.</p>}
              </div>
            </div>
            <div className="sidebar-section">
              <h4><MessageSquare size={16} /> Notes</h4>
              <p className="text-sm text-gray-300 min-h-[6rem]">{selectedFile.file_metadata?.notes || 'No notes yet.'}</p>
            </div>
            <div className="mt-auto pt-4 border-t border-gray-700">
              <h4 className="font-semibold text-red-500/80">Danger Zone</h4>
              <button disabled className="w-full bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 py-2 rounded-md flex items-center justify-center gap-2 transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed">Delete this file</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileDetailModal;
