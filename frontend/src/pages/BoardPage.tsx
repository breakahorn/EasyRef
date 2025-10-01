import React, { useEffect } from 'react';
import ReferenceBoard from '../components/ReferenceBoard';
import { useBoardStore } from '../store/useBoardStore';

const BoardPage: React.FC = () => {
  const { activeBoard, activeBoardId, setActiveBoard } = useBoardStore();

  useEffect(() => {
    if (activeBoardId && !activeBoard) {
      setActiveBoard(activeBoardId);
    }
  }, [activeBoardId, activeBoard, setActiveBoard]);

  if (activeBoardId === null) {
    return <div className="centered-message">Select a project from the sidebar to get started.</div>;
  }

  if (!activeBoard) {
    return <div className="centered-message">Loading board...</div>;
  }

  return (
    <ReferenceBoard items={activeBoard.items} />
  );
};

export default BoardPage;
