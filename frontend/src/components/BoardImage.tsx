import React from 'react';
import { Image } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';

const API_BASE_URL = 'http://127.0.0.1:8000';

const getFileUrl = (filePath: string) => {
  if (!filePath) return '';
  const relativePath = filePath.replace(/\\/g, '/').replace(/^\.?\//, '');
  return `${API_BASE_URL}/${relativePath}`;
};

const BoardImage = ({ item, onSelect, onDragEnd, onContextMenu }) => {
  const imageUrl = getFileUrl(item.file.path);
  const [image] = useImage(imageUrl, 'Anonymous');

  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (e.evt.button !== 0) {
      e.target.stopDrag();
    }
  };

  if (!image) {
    return null;
  }

  return (
    <Image
      id={item.id.toString()}
      image={image}
      offsetX={item.width / 2}
      offsetY={item.height / 2}
      x={item.pos_x}
      y={item.pos_y}
      width={item.width}
      height={item.height}
      rotation={item.rotation}
      zIndex={item.z_index}
      draggable
      onDragStart={handleDragStart}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
      onContextMenu={onContextMenu}
    />
  );
};

export default BoardImage;
