import React, { useEffect, useRef } from 'react';
import { useDrag } from 'react-dnd';
import { useFileStore } from '../store/useFileStore';
import { useBoardStore } from '../store/useBoardStore';
import { Plus } from 'lucide-react';
import type { FileRecord } from '../store/useFileStore';
import { buildAssetUrl } from '../lib/api';

export const ItemTypes = {
  IMAGE: 'image',
};

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi'];

interface DraggableGalleryItemProps {
  file: FileRecord;
}

const DraggableGalleryItem = ({ file }: DraggableGalleryItemProps) => {
  console.log("Rendering item with file:", file); // DEBUG LINE
  const { selectFile } = useFileStore();
  const { activeBoardId, addItemToBoard } = useBoardStore();

  const dragRef = useRef<HTMLDivElement | null>(null);
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.IMAGE,
    item: { id: file.id, path: file.path },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));
  drag(dragRef);

  const handleAddToBoard = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeBoardId) return;

    const img = new window.Image();
    img.src = buildAssetUrl(file.path);

    img.onload = () => {
      const initialWidth = 250;
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      // Center in the canvas area, accounting for sidebar and padding
      const padding = 32; // 2rem = 32px
      addItemToBoard(activeBoardId, file.id, {
        pos_x: (window.innerWidth - 324 - (padding * 2)) / 2,
        pos_y: (window.innerHeight - 57 - (padding * 2)) / 2,
        width: initialWidth,
        height: initialWidth / aspectRatio,
        rotation: 0,
      });
    };
    img.onerror = () => {
      const padding = 32;
      addItemToBoard(activeBoardId, file.id, {
        pos_x: (window.innerWidth - 324 - (padding * 2)) / 2,
        pos_y: (window.innerHeight - 57 - (padding * 2)) / 2,
        width: 200,
        height: 200,
        rotation: 0,
      });
    }
  };

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
      ref={dragRef}
      className="gallery-item"
      style={{ opacity: isDragging ? 0.5 : 1 }}
      onClick={() => selectFile(file)}
    >
      <>
        {activeBoardId && isImage && (
          <button className="add-to-board-btn" onClick={handleAddToBoard}>
            <Plus size={20} />
          </button>
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

const Gallery: React.FC = () => {
  const { files, fetchFiles } = useFileStore();

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return (
    <div className="gallery-grid">
      {files.map((file) => (
        <DraggableGalleryItem key={file.id} file={file} />
      ))}
    </div>
  );
};

export default Gallery;
