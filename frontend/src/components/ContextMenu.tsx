import React from 'react';
import { RotateCcw, ArrowUpToLine, ArrowDownToLine, Trash2 } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  onResetRotation: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onDelete: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onResetRotation, onBringToFront, onSendToBack, onDelete }) => {
  const menuStyle = {
    top: `${y}px`,
    left: `${x}px`,
  };

  return (
    <div className="context-menu" style={menuStyle}>
      <button onClick={onResetRotation}>
        <RotateCcw size={16} />
        <span>Reset Rotation</span>
      </button>
      <div className="context-menu-divider" />
      <button onClick={onBringToFront}>
        <ArrowUpToLine size={16} />
        <span>Bring to Front</span>
      </button>
      <button onClick={onSendToBack}>
        <ArrowDownToLine size={16} />
        <span>Send to Back</span>
      </button>
      <div className="context-menu-divider" />
      <button onClick={onDelete} className="delete">
        <Trash2 size={16} />
        <span>Delete</span>
      </button>
    </div>
  );
};

export default ContextMenu;
