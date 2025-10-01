import React, { useRef, useState } from 'react';
import { Stage, Layer } from 'react-konva';
import Konva from 'konva';

const ReferenceBoard: React.FC<{ items: any[] }> = ({ items }) => {
  const stageRef = useRef<Konva.Stage>(null);
  const [isPanning, setIsPanning] = useState(false);
  const lastPointerPosition = useRef({ x: 0, y: 0 });

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const scaleBy = 1.05;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    
    stage.scale({ x: newScale, y: newScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Middle mouse button for panning
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

  return (
    <div className="reference-board" onContextMenu={(e) => e.preventDefault()}>
      <Stage
        ref={stageRef}
        width={window.innerWidth - 324} // Adjust for sidebar width
        height={window.innerHeight - 57} // Adjust for navbar height
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <Layer>
          {/* Board items will be rendered here in the next step */}
        </Layer>
      </Stage>
    </div>
  );
};

export default ReferenceBoard;
