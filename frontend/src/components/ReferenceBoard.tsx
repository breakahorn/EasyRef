import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Transformer } from 'react-konva';
import Konva from 'konva';
import { useDrop } from 'react-dnd';
import { useBoardStore } from '../store/useBoardStore';
import BoardImage from './BoardImage';
import ContextMenu from './ContextMenu';
import { ItemTypes } from './Gallery';

const ReferenceBoard: React.FC<{ items: any[] }> = ({ items }) => {
  const {
    selectedItemId,
    setSelectedItemId,
    updateBoardItem,
    deleteBoardItem,
    resetItem,
    activeBoardId, // Assuming you might need this, adding it here
    addItemToBoard // Assuming you might need this, adding it here
  } = useBoardStore();
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const [menu, setMenu] = useState<{ x: number; y: number; itemId: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const lastPointerPosition = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (transformerRef.current && layerRef.current) {
      const selectedNode = layerRef.current.findOne(`#${selectedItemId}`);
      transformerRef.current.nodes(selectedNode ? [selectedNode] : []);
    }
  }, [selectedItemId]);

  const [, drop] = useDrop(() => ({
    accept: ItemTypes.IMAGE,
    drop: (item: { id: number, path: string }, monitor) => {
      if (!activeBoardId || !stageRef.current) return;
      const dropPosition = monitor.getClientOffset();
      const stage = stageRef.current;
      if (!dropPosition) return;
      const transform = stage.getAbsoluteTransform().copy().invert();
      const pos = transform.point(dropPosition);
      addItemToBoard(activeBoardId, item.id, { pos_x: pos.x, pos_y: pos.y });
    },
  }), [activeBoardId]);

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const nodeId = parseInt(node.id(), 10);
    if (isNaN(nodeId)) return;
    updateBoardItem(nodeId, {
      pos_x: node.x(),
      pos_y: node.y(),
    });
  };

  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
    const node = e.target;
    const nodeId = parseInt(node.id(), 10);
    if (isNaN(nodeId)) return;
    updateBoardItem(nodeId, {
      pos_x: node.x(),
      pos_y: node.y(),
      rotation: node.rotation(),
      width: node.width() * node.scaleX(),
      height: node.height() * node.scaleY(),
    });
    node.scaleX(1);
    node.scaleY(1);
  };

  const handleContextMenu = (e: Konva.KonvaEventObject<PointerEvent>) => {
    e.evt.preventDefault();
    const itemId = parseInt(e.target.id(), 10);
    if (isNaN(itemId)) return;
    setSelectedItemId(itemId);
    const stage = e.target.getStage();
    if (!stage) return;
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;
    setMenu({ x: pointerPos.x, y: pointerPos.y, itemId });
  };

  const getMinMaxZIndex = () => {
    const zIndexes = items.map(i => i.z_index);
    return { min: Math.min(0, ...zIndexes), max: Math.max(0, ...zIndexes) };
  };

  const handleResetRotation = () => {
    if (menu) updateBoardItem(menu.itemId, { rotation: 0 });
    setMenu(null);
  };

  const handleBringToFront = () => {
    if (menu) {
      const { max } = getMinMaxZIndex();
      updateBoardItem(menu.itemId, { z_index: max + 1 });
    }
    setMenu(null);
  };

  const handleSendToBack = () => {
    if (menu) {
      const { min } = getMinMaxZIndex();
      updateBoardItem(menu.itemId, { z_index: min - 1 });
    }
    setMenu(null);
  };

  const handleDelete = () => {
    if (menu) deleteBoardItem(menu.itemId);
    setMenu(null);
  };

  const handleResetItem = () => {
    if (menu) resetItem(menu.itemId);
    setMenu(null);
  };

  // --- Pan and Zoom Handlers ---
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const scaleBy = 1.05;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    stage.scale({ x: newScale, y: newScale });
    const newPos = { x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale };
    stage.position(newPos);
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 1 && e.target === e.target.getStage()) {
      setIsPanning(true);
      const stage = stageRef.current;
      if (stage) {
        lastPointerPosition.current = stage.getPointerPosition() || { x: 0, y: 0 };
        stage.container().style.cursor = 'grabbing';
      }
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanning) {
      const stage = stageRef.current;
      if (stage) {
        const newPointerPos = stage.getPointerPosition() || { x: 0, y: 0 };
        const dx = newPointerPos.x - lastPointerPosition.current.x;
        const dy = newPointerPos.y - lastPointerPosition.current.y;
        stage.move({ x: dx, y: dy });
        lastPointerPosition.current = newPointerPos;
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    const stage = stageRef.current;
    if (stage) {
      stage.container().style.cursor = 'default';
    }
  };

  const handleFitToScreen = () => {


    const stage = stageRef.current;
    const layer = layerRef.current;
    if (!stage || !layer || items.length === 0) return;

    // 1. Reset stage transform to get absolute client rect
    const oldScale = stage.scaleX();
    const oldPos = stage.position();
    stage.scale({ x: 1, y: 1 });
    stage.position({ x: 0, y: 0 });

    // 2. Get the absolute bounding box
    const bounds = layer.getClientRect();

    // 3. Restore stage transform before animation
    stage.scale({ x: oldScale, y: oldScale });
    stage.position(oldPos);

    if (bounds.width === 0 || bounds.height === 0) return;

    const stageWidth = stage.container().clientWidth;
    const stageHeight = stage.container().clientHeight;
    const padding = 0; // No padding

    const scaleX = stageWidth / bounds.width;
    const scaleY = stageHeight / bounds.height;
    const newScale = Math.min(scaleX, scaleY) * (1 - padding);

    const newX = (-bounds.x * newScale) + (stageWidth - bounds.width * newScale) / 2;
    const newY = (-bounds.y * newScale) + (stageHeight - bounds.height * newScale) / 2;

    // 4. Animate to the new position and scale
    stage.to({
      x: newX,
      y: newY,
      scaleX: newScale,
      scaleY: newScale,
      duration: 0.2, // Smooth transition
      easing: Konva.Easings.EaseInOut,
    });
  };

  return (
    <div ref={drop} className="reference-board" onContextMenu={(e) => e.preventDefault()}>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onResetRotation={handleResetRotation}
          onResetItem={handleResetItem}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
          onDelete={handleDelete}
        />
      )}
      <Stage
        ref={stageRef}
        width={window.innerWidth - 324}
        height={window.innerHeight - 57}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={(e) => {
          const clickedOnEmpty = e.target === e.target.getStage();
          if (clickedOnEmpty) {
            setSelectedItemId(null);
            setMenu(null);
          }
        }}
        onDblClick={(e) => {
          const clickedOnEmpty = e.target === e.target.getStage();
          if (clickedOnEmpty) {
            handleFitToScreen();
          }
        }}
      >
        <Layer ref={layerRef}>
          {items.map(item => (
            <BoardImage
              key={item.id}
              item={item}
              onSelect={() => setSelectedItemId(item.id)}
              onDragEnd={handleDragEnd}
              onContextMenu={handleContextMenu}
            />
          ))}
          <Transformer
            ref={transformerRef}
            onTransformEnd={handleTransformEnd}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 10 || newBox.height < 10) {
                return oldBox;
              }
              return newBox;
            }}
          />
        </Layer>
      </Stage>
    </div>
  );
};

export default ReferenceBoard;
