import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFileStore } from '../store/useFileStore';
import { X, Star, Heart, Tag as TagIcon, MessageSquare, ZoomIn, ZoomOut, RotateCcw, FlipHorizontal, Pipette, Copy, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { resolveFileUrl } from '../lib/api';

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi'];

const RatingEditor: React.FC<{ rating: number; onRatingChange: (newRating: number) => void; }> = ({ rating, onRatingChange }) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
      {[...Array(10)].map((_, i) => {
        const ratingValue = i + 1;
        return (
          <Star
            key={ratingValue}
            size={22}
            className={`cursor-pointer transition-colors ${ratingValue <= (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-500'}`}
            onMouseEnter={() => setHoverRating(ratingValue)}
            onClick={() => onRatingChange(ratingValue)}
            style={{ fill: ratingValue <= (hoverRating || rating) ? 'currentColor' : 'none' }}
          />
        );
      })}
    </div>
  );
};

const FileDetailModal: React.FC = () => {
  const { selectedFile, selectFile, deleteFile, updateMetadata, addTag, removeTag } = useFileStore();

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });

  const [isPickerEnabled, setIsPickerEnabled] = useState(false);
  const [pickedColor, setPickedColor] = useState<string | null>(null);
  const [isColorLocked, setIsColorLocked] = useState(false);

  // Notes editing state
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState("");

  // Tag editing state
  const [newTagName, setNewTagName] = useState("");

  useEffect(() => {
    if (selectedFile) {
      setNotesText(selectedFile.file_metadata?.notes || "");
    }
  }, [selectedFile?.id]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const resetViewerState = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsFlipped(false);
    setIsPickerEnabled(false);
    setPickedColor(null);
  }, []);

  useEffect(() => {
    if (selectedFile) {
      resetViewerState();
    }
  }, [selectedFile?.id, resetViewerState]);

  const fileExtension = selectedFile?.name.split('.').pop()?.toLowerCase() || '';
  const isImage = IMAGE_EXTENSIONS.includes(fileExtension);
  const isVideo = VIDEO_EXTENSIONS.includes(fileExtension);
  const isFavorite = Boolean(selectedFile?.file_metadata?.is_favorite);

  // Load image into memory
  useEffect(() => {
    if (isImage && selectedFile) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = resolveFileUrl(selectedFile);
      img.onload = () => {
        imageRef.current = img;
        resetViewerState(); // Reset state when new image is loaded
      };
      img.onerror = () => {
        imageRef.current = null;
      }
      return () => { imageRef.current = null; };
    } else {
      imageRef.current = null;
    }
  }, [selectedFile, isImage, resetViewerState]);

  // Main drawing logic
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const image = imageRef.current;

    if (!canvas || !container || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const containerRatio = canvas.width / canvas.height;
    const imageRatio = image.naturalWidth / image.naturalHeight;
    let drawWidth, drawHeight, drawX, drawY;

    if (containerRatio > imageRatio) { // Reverted back to > to simulate 'contain'
      drawHeight = canvas.height;
      drawWidth = drawHeight * imageRatio;
    } else {
      drawWidth = canvas.width;
      drawHeight = drawWidth / imageRatio;
    }
    drawX = (canvas.width - drawWidth) / 2;
    drawY = (canvas.height - drawHeight) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(position.x + canvas.width / 2, position.y + canvas.height / 2);
    ctx.scale(scale * (isFlipped ? -1 : 1), scale);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();

  }, [scale, position, isFlipped, selectedFile, isImage]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isImage) return;
    setIsPanning(true);
    startPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPosition({ x: e.clientX - startPos.current.x, y: e.clientY - startPos.current.y });
  };

  const handleMouseUpOrLeave = () => setIsPanning(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isImage) return;

    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = 1.1;
      const newScale = e.deltaY < 0 ? scale * zoomFactor : scale / zoomFactor;
      setScale(Math.max(0.1, Math.min(newScale, 20)));
    };

    container.addEventListener('wheel', wheelHandler, { passive: false });

    return () => {
      container.removeEventListener('wheel', wheelHandler);
    };
  }, [isImage, scale]);

  const handleColorPick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPickerEnabled || isColorLocked) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    setPickedColor(`#${("000000" + ((pixel[0] << 16) | (pixel[1] << 8) | pixel[2]).toString(16)).slice(-6)}`);
  };

  const handleColorLockToggle = () => {
    if (isPickerEnabled) {
      setIsColorLocked(!isColorLocked);
    }
  };

  const handleDelete = () => {
    if (isFavorite) return;
    if (selectedFile && window.confirm(`Are you sure you want to delete "${selectedFile.name}"? This action cannot be undone.`)) {
      deleteFile(selectedFile.id);
    }
  };

  if (!selectedFile) return null;

  return (
    <div className="modal-backdrop" onClick={() => selectFile(null)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><button className="modal-close-button" onClick={() => selectFile(null)}><X size={24} /></button></div>
        <div className="modal-body flex flex-row h-full gap-8">
          <div
            ref={containerRef}
            className="flex-1 h-full bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden relative"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
          >
            {isImage ? (
              <canvas ref={canvasRef} onMouseMove={handleColorPick} onClick={handleColorLockToggle} style={{ cursor: isPickerEnabled ? 'crosshair' : (isPanning ? 'grabbing' : 'grab') }} />
            ) : isVideo ? (
              <video src={resolveFileUrl(selectedFile)} controls autoPlay loop className="w-full h-full object-contain" />
            ) : (
              <p>Unsupported file type</p>
            )}
          </div>
          <div className="flex-shrink-0 h-full flex flex-col gap-4 overflow-y-auto pr-2 sidebar no-scrollbar" style={{ borderRight: 'none', borderLeft: '1px solid var(--color-border)' }}>
            <div className="flex justify-between items-center text-xl font-semibold gap-4">
              <h3 title={selectedFile.name} className="truncate">{selectedFile.name}</h3>
              <button
                className="bg-transparent border-none p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                onClick={() => updateMetadata(selectedFile.id, { is_favorite: !selectedFile.file_metadata?.is_favorite })}
              >
                <Heart size={22}
                  className={selectedFile.file_metadata?.is_favorite ? 'text-red-500' : ''}
                  style={{
                    fill: selectedFile.file_metadata?.is_favorite ? '#ef4444' : 'none',
                    stroke: selectedFile.file_metadata?.is_favorite ? '#ef4444' : 'currentColor'
                  }}
                />
              </button>
            </div>
            <p className="text-sm text-gray-400 uploaded-date">Uploaded: {new Date(selectedFile.created_at).toLocaleString()}</p>

            {isImage && (
              <div className="sidebar-section viewer-controls">
                <h4><SlidersHorizontal size={16} /> Viewer Controls</h4>
                <div className="grid-2-col">
                  <div className="form-group">
                    <button className="button secondary flex items-center justify-center gap-2" onClick={() => setScale(s => s * 1.2
                    )}><ZoomIn size={18} /> Zoom In</button>
                  </div>
                  <div className="form-group">
                    <button className="button secondary flex items-center justify-center gap-2" onClick={() => setScale(s => s / 1.2
                    )}><ZoomOut size={18} /> Zoom Out</button>
                  </div>
                  <div className="form-group">
                    <button className="button secondary flex items-center justify-center gap-2" onClick={() => setIsFlipped(f =>
                      !f)}><FlipHorizontal size={18} /> Flip</button>
                  </div>
                  <div className="form-group">
                    <button className="button secondary flex items-center justify-center gap-2" onClick={resetViewerState}><RotateCcw
                      size={18} /> Reset</button>
                  </div>
                </div>
                <div className="form-group">
                  <button className="button secondary flex items-center justify-center gap-2" onClick={() => setIsPickerEnabled(p => !p
                  )}><Pipette size={18} /> {isPickerEnabled ? 'Disable' : 'Enable'} Color Picker</button>
                </div>


                {isPickerEnabled && (
                  <div className="flex items-center gap-2 text-sm text-gray-300 mt-3 p-2 bg-black/20 rounded-md">
                    <div style={{ backgroundColor: pickedColor || 'transparent', width: '24px', height: '24px', border: '1px solid var(--color-border)', borderRadius: '4px' }}></div>
                    <span className="font-mono flex-grow">{pickedColor || 'Hover to pick'} {isColorLocked && '(Locked)'}</span>
                    {pickedColor && <button className="bg-gray-600 hover:bg-gray-500 p-1.5 rounded-md" onClick={() => navigator.clipboard.writeText(pickedColor)}><Copy size={16} /></button>}
                  </div>
                )}
              </div>
            )
            }

            <div className="sidebar-section">
              <h4><Star size={16} /> Rating</h4>
              <RatingEditor
                rating={selectedFile.file_metadata?.rating || 0}
                onRatingChange={(newRating) => updateMetadata(selectedFile.id, { rating: newRating })}
              />
            </div>
            <div className="sidebar-section">
              <h4><TagIcon size={16} /> Tags</h4>

              {selectedFile.tags?.length > 0 ?
                <div className="flex flex-wrap items-center tag-list-container">
                  <div className="tags-wrapper">

                    {selectedFile.tags.map(tag => (
                      <span key={tag.id} className="tag-item">
                        {tag.name}
                        <button onClick={() => removeTag(selectedFile.id, tag.id)} className="tag-remove-btn">
                          <X size={12} />
                        </button>
                      </span>))}
                  </div>


                </div>
                : <p className="text-gray-500 text-sm">No tags yet.</p>}

              <form onSubmit={(e) => {
                e.preventDefault();
                if (newTagName.trim()) {
                  addTag(selectedFile.id, newTagName.trim());
                  setNewTagName("");
                }
              }} className="tag-add-form">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Add a tag..."
                  className="tag-input-form"
                />
              </form>
            </div>

            <div className="sidebar-section">
              <div>
                <h4 className="text-base font-semibold text-gray-300 mb-3 flex items-center gap-2"><MessageSquare size={16} /> Notes</h4>
                {isEditingNotes ? (
                  <textarea
                    className="notes-textarea"
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    onBlur={() => {
                      setIsEditingNotes(false);
                      updateMetadata(selectedFile.id, { notes: notesText });
                    }}
                    autoFocus
                  />
                ) : (
                  <p
                    className="w-full h-32 text-sm text-gray-300 bg-gray-900 p-3 rounded-md cursor-pointer hover:bg-gray-800 overflow-y-auto"
                    onClick={() => setIsEditingNotes(true)}
                  >
                    {selectedFile.file_metadata?.notes || <span className="text-gray-500">Click to add notes...</span>}
                  </p>
                )}
              </div>
            </div>


            <div className="sidebar-section">
              <h4 className="font-semibold text-red-500/80"><AlertTriangle size={16} /> Danger Zone</h4>
              <div className="form-group">
                <button
                  onClick={handleDelete}
                  className="button danger flex items-center justify-center gap-2"
                  disabled={isFavorite}
                  title={isFavorite ? 'お気に入りは削除できません。' : undefined}
                >
                  Delete this file
                </button>
              </div>
            </div>
          </div >
        </div >
      </div >
    </div >
  );
};

export default FileDetailModal;
