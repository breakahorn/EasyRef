import { Image } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';
import type { BoardItem } from '../store/useBoardStore';
import { resolveFileUrl } from '../lib/api';

interface BoardImageProps {
  item: BoardItem;
  onSelect: (evt: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  onDragEnd: (evt: Konva.KonvaEventObject<DragEvent>) => void;
  onContextMenu: (evt: Konva.KonvaEventObject<PointerEvent>) => void;
}

const BoardImage = ({ item, onSelect, onDragEnd, onContextMenu }: BoardImageProps) => {
  const imageUrl = resolveFileUrl(item.file);
  const [image] = useImage(imageUrl, 'anonymous');

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
