import React, { useEffect, useRef, useState } from 'react';
import { useDrag } from 'react-dnd';
import { useFileStore } from '../store/useFileStore';
// import { useBoardStore } from '../store/useBoardStore';
// import { Check, Plus } from 'lucide-react';
import type { FileRecord } from '../store/useFileStore';
import { buildAssetUrl } from '../lib/api';

export const ItemTypes = {
  IMAGE: 'image',
};

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi'];

interface DraggableGalleryItemProps {
  file: FileRecord;
  isSelected: boolean;
  onToggleSelect: (fileId: number) => void;
  onOpenDetails: (file: FileRecord) => void;
  onItemRef: (id: number, node: HTMLDivElement | null) => void;
  selectionEnabled: boolean;
}

const DraggableGalleryItem = ({
  file,
  isSelected,
  onToggleSelect,
  onOpenDetails,
  onItemRef,
  selectionEnabled
}: DraggableGalleryItemProps) => {
  // const { activeBoardId, addItemToBoard } = useBoardStore();

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.IMAGE,
    item: { id: file.id, path: file.path },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  // const handleAddToBoard = (e: React.MouseEvent) => {
  //   e.stopPropagation();
  //   if (!activeBoardId) return;

  //   const img = new window.Image();
  //   img.src = buildAssetUrl(file.path);

  //   img.onload = () => {
  //     const initialWidth = 250;
  //     const aspectRatio = img.naturalWidth / img.naturalHeight;
  //     // Center in the canvas area, accounting for sidebar and padding
  //     const padding = 32; // 2rem = 32px
  //     addItemToBoard(activeBoardId, file.id, {
  //       pos_x: (window.innerWidth - 324 - (padding * 2)) / 2,
  //       pos_y: (window.innerHeight - 57 - (padding * 2)) / 2,
  //       width: initialWidth,
  //       height: initialWidth / aspectRatio,
  //       rotation: 0,
  //     });
  //   };
  //   img.onerror = () => {
  //     const padding = 32;
  //     addItemToBoard(activeBoardId, file.id, {
  //       pos_x: (window.innerWidth - 324 - (padding * 2)) / 2,
  //       pos_y: (window.innerHeight - 57 - (padding * 2)) / 2,
  //       width: 200,
  //       height: 200,
  //       rotation: 0,
  //     });
  //   }
  // };

  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  const isImage = IMAGE_EXTENSIONS.includes(fileExtension);
  const isVideo = VIDEO_EXTENSIONS.includes(fileExtension);

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const min = Math.floor(seconds / 60).toString().padStart(2, '0');
    const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  };

  const renderThumbnail = () => {
    const url = buildAssetUrl(file.path);
    if (isImage) {
      return <img src={url} alt={file.name} loading="lazy" />;
    } else if (isVideo) {
      return <video src={`${url}#t=0.1`} muted preload="metadata" />;
    } else {
      return <div className="unsupported-file">{file.name}</div>;
    }
  };

  return (
    <div
      ref={(node) => {
        drag(node);
        onItemRef(file.id, node);
      }}
      className={`gallery-item${isSelected ? ' selected' : ''}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      onClick={() => {
        if (selectionEnabled) {
          onToggleSelect(file.id);
        } else {
          onOpenDetails(file);
        }
      }}
    >
      <>
        {/* {activeBoardId && isImage && (
          <button className="add-to-board-btn" onClick={handleAddToBoard}>
            <Plus size={20} />
          </button>
        )} */}
        {selectionEnabled && (
          <>
            <div className="gallery-selection-overlay" />
            {isSelected ? (
              <div className="gallery-checkmark">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <mask id={`check-cutout-${file.id}`}>
                    <rect width="24" height="24" fill="#fff" />
                    <path
                      d="M6 12.5l3.5 3.5L18 8.5"
                      stroke="#000"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </mask>
                  <circle cx="12" cy="12" r="10" fill="#fff" mask={`url(#check-cutout-${file.id})`} />
                </svg>
              </div>
            ) : (
              <div className="gallery-checkmark-empty" />
            )}
          </>
        )}
        {renderThumbnail()}
      </>
      {isVideo && file.file_metadata && (
        <div className="video-info-overlay">
          <span>{formatDuration(file.file_metadata?.duration ?? 0)}</span>
          <span>{file.file_metadata.height ? `${file.file_metadata.height}p` : ''}</span>
        </div>
      )}
    </div>
  );
};

interface GalleryProps {
  mode: 'normal' | 'edit' | 'board';
}

const Gallery: React.FC<GalleryProps> = ({ mode }) => {
  const {
    files,
    fetchFiles,
    selectFile,
    selectedFileIds,
    toggleFileSelection,
    setSelectedFiles,
    clearSelection,
  } = useFileStore();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const selectionStart = useRef<{ x: number; y: number } | null>(null);
  const isSelecting = useRef(false);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const selectionEnabled = mode !== 'normal';

  const handleItemRef = (id: number, node: HTMLDivElement | null) => {
    if (!node) {
      itemRefs.current.delete(id);
      return;
    }
    itemRefs.current.set(id, node);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectionEnabled) return;
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('.gallery-item')) return;
    const container = gridRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    selectionStart.current = { x: startX, y: startY };
    isSelecting.current = true;
    setSelectionRect({ x: startX, y: startY, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectionEnabled) return;
    if (!isSelecting.current || !selectionStart.current) return;
    const container = gridRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    const x = Math.min(selectionStart.current.x, currentX);
    const y = Math.min(selectionStart.current.y, currentY);
    const width = Math.abs(selectionStart.current.x - currentX);
    const height = Math.abs(selectionStart.current.y - currentY);
    setSelectionRect({ x, y, width, height });
  };

  const finalizeSelection = () => {
    if (!selectionEnabled) return;
    if (!isSelecting.current || !selectionRect) return;
    const container = gridRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const isClick = selectionRect.width < 4 && selectionRect.height < 4;

    if (isClick) {
      clearSelection();
      setSelectionRect(null);
      selectionStart.current = null;
      isSelecting.current = false;
      return;
    }

    const selected: number[] = [];
    itemRefs.current.forEach((node, id) => {
      const nodeRect = node.getBoundingClientRect();
      const left = nodeRect.left - rect.left;
      const right = nodeRect.right - rect.left;
      const top = nodeRect.top - rect.top;
      const bottom = nodeRect.bottom - rect.top;

      const intersects = !(
        right < selectionRect.x ||
        left > selectionRect.x + selectionRect.width ||
        bottom < selectionRect.y ||
        top > selectionRect.y + selectionRect.height
      );

      if (intersects) {
        selected.push(id);
      }
    });

    setSelectedFiles(selected);
    setSelectionRect(null);
    selectionStart.current = null;
    isSelecting.current = false;
  };

  return (
    <div
      className="gallery-area"
      onMouseDown={(e) => {
        if (!selectionEnabled) return;
        const target = e.target as HTMLElement;
        if (target.closest('.gallery-grid')) return;
        if (target.closest('.gallery-item')) return;
        clearSelection();
      }}
    >
      <div
        ref={gridRef}
        className="gallery-grid"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={finalizeSelection}
        onMouseLeave={finalizeSelection}
      >
        {files.map((file) => (
          <DraggableGalleryItem
            key={file.id}
            file={file}
            isSelected={selectedFileIds.includes(file.id)}
            onToggleSelect={toggleFileSelection}
            onOpenDetails={selectFile}
            onItemRef={handleItemRef}
            selectionEnabled={selectionEnabled}
          />
        ))}
        {selectionEnabled && selectionRect && (
          <div
            className="gallery-selection-rect"
            style={{
              left: selectionRect.x,
              top: selectionRect.y,
              width: selectionRect.width,
              height: selectionRect.height
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Gallery;
