import React, { useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { useFileStore } from '../store/useFileStore';
import { useBoardStore } from '../store/useBoardStore';
import { Plus } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000';

export const ItemTypes = {
  IMAGE: 'image',
};

const getFileUrl = (filePath: string) => {
  if (!filePath) return '';
  const relativePath = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
  return `${API_BASE_URL}/${relativePath}`;
};

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi'];

const DraggableGalleryItem = ({ file }) => {
  console.log("Rendering item with file:", file); // DEBUG LINE
  const { selectFile } = useFileStore();
  const { activeBoardId, addItemToBoard } = useBoardStore();

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.IMAGE,
    item: { id: file.id, path: file.path },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const handleAddToBoard = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeBoardId) return;

    const img = new window.Image();
    img.src = getFileUrl(file.path);

    img.onload = () => {
      const initialWidth = 250;
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      addItemToBoard(activeBoardId, file.id, {
        width: initialWidth,
        height: initialWidth / aspectRatio,
      });
    };
    img.onerror = () => {
      addItemToBoard(activeBoardId, file.id, {
        width: 200,
        height: 200,
      });
    }
  };

  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  const isImage = IMAGE_EXTENSIONS.includes(fileExtension);
  const isVideo = file.name.toLowerCase().endsWith('.mp4') || file.name.toLowerCase().endsWith('.webm') || file.name.toLowerCase().endsWith('.mov') || file.name.toLowerCase().endsWith('.avi');

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const min = Math.floor(seconds / 60).toString().padStart(2, '0');
    const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  };

  const renderThumbnail = () => {
    const url = getFileUrl(file.path);
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
      ref={drag}
      className="gallery-item"
      style={{ opacity: isDragging ? 0.5 : 1 }}
      onClick={() => selectFile(file)}
    >
      {renderThumbnail()}
      {isVideo && file.file_metadata && (
        <div className="video-info-overlay">
          <span>{formatDuration(file.file_metadata.duration)}</span>
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
