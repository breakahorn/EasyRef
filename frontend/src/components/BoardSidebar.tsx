import React, { useState, useEffect, useRef } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import { Plus, Trash2, LayoutDashboard, MoreHorizontal, Edit } from 'lucide-react';

const BoardSidebar: React.FC = () => {
  const {
    boards,
    activeBoardId,
    fetchBoards,
    createBoard,
    deleteBoard,
    renameBoard,
    setActiveBoard,
  } = useBoardStore();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  useEffect(() => {
    if (editingId !== null && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddNewBoard = async () => {
    const newBoard = await createBoard('Untitled Project');
    if (newBoard) {
      setActiveBoard(newBoard.id);
      setEditingId(newBoard.id);
      setEditingName(newBoard.name);
    }
  };

  const handleDeleteBoard = (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete the board "${name}"?`)) {
      deleteBoard(id);
    }
    setMenuOpenId(null);
  };

  const handleStartRename = (board: { id: number, name: string }) => {
    setEditingId(board.id);
    setEditingName(board.name);
    setMenuOpenId(null);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId && editingName.trim()) {
      renameBoard(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const renderProjectItem = (board: { id: number, name: string }) => {
    if (editingId === board.id) {
      return (
        <form onSubmit={handleRenameSubmit} className="rename-form">
          <input
            ref={inputRef}
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onBlur={handleRenameSubmit}
          />
        </form>
      );
    }
    return <span>{board.name}</span>;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <div className="projects-header">
          <h4 className="no-border"><LayoutDashboard size={18} /> Projects</h4>
          <button onClick={handleAddNewBoard} className="new-project-btn">
            <Plus size={16} />
          </button>
        </div>

        <div className="board-list">
          {boards.length > 0 ? (
            <ul>
              {boards.map((board) => (
                <li
                  key={board.id}
                  className={`
                  ${board.id === activeBoardId ? 'active' : ''}
                  ${menuOpenId === board.id ? 'menu-open' : ''}
                `}
                  onClick={() => editingId !== board.id && setActiveBoard(board.id)}
                >
                  {renderProjectItem(board)}
                  {editingId !== board.id && (
                    <div className="project-item-menu-container">
                      <button
                        className="menu-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === board.id ? null : board.id);
                        }}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {menuOpenId === board.id && (
                        <div className="context-menu" ref={menuRef} style={{ position: 'absolute', right: '2rem', top: '0' }}>
                          <button onClick={() => handleStartRename(board)}>
                            <Edit size={14} /> Rename
                          </button>
                          <button onClick={() => handleDeleteBoard(board.id, board.name)} className="delete">
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-board-list">
              <p>No projects yet.</p>
              <p>Create your first one to get started!</p>
            </div>
          )}
        </div>
      </div>

    </aside>
  );
};

export default BoardSidebar;
