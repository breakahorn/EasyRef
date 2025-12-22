import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Plus, Tag } from 'lucide-react';
import { useFileStore } from '../store/useFileStore';
import { useBoardStore } from '../store/useBoardStore';
import { buildAssetUrl } from '../lib/api';
import type { FileRecord } from '../store/useFileStore';

type BoardOption = { id: number; name: string };

const parseTags = (value: string) =>
  value
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);

const getBoardCenter = () => {
  const sidebar = document.querySelector('.sidebar-shell');
  const nav = document.querySelector('.main-nav');
  const sidebarWidth = sidebar ? sidebar.getBoundingClientRect().width : 324;
  const navHeight = nav ? nav.getBoundingClientRect().height : 57;
  const padding = 32;
  const centerX = (window.innerWidth - sidebarWidth - (padding * 2)) / 2;
  const centerY = (window.innerHeight - navHeight - (padding * 2)) / 2;
  return { x: centerX, y: centerY };
};

const loadImageSize = (file: FileRecord) =>
  new Promise<{ width: number; height: number }>((resolve) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const isVideo = ['mp4', 'webm', 'mov', 'avi'].includes(fileExtension);
    if (isVideo && file.file_metadata?.width && file.file_metadata?.height) {
      resolve({ width: file.file_metadata.width, height: file.file_metadata.height });
      return;
    }

    const img = new Image();
    img.src = buildAssetUrl(file.path);
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 200, height: 200 });
  });

const BulkEditToolbar: React.FC = () => {
  const {
    files,
    selectedFileIds,
    applyBatch,
    clearSelection,
  } = useFileStore();
  const { boards, fetchBoards, activeBoardId, setActiveBoard } = useBoardStore();

  const [addTags, setAddTags] = useState('');
  const [removeTags, setRemoveTags] = useState('');
  const [toggleFavorite, setToggleFavorite] = useState(false);
  const [rating, setRating] = useState<string>('');
  const [deleteSelected, setDeleteSelected] = useState(false);
  const [boardId, setBoardId] = useState<string>('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  useEffect(() => {
    if (activeBoardId && !boardId) {
      setBoardId(String(activeBoardId));
    }
  }, [activeBoardId, boardId]);

  useEffect(() => {
    if (deleteSelected && boardId) {
      setBoardId('');
    }
  }, [deleteSelected, boardId]);

  const selectedFiles = useMemo(() => {
    const selectedSet = new Set(selectedFileIds);
    return files.filter(file => selectedSet.has(file.id));
  }, [files, selectedFileIds]);

  const hasSelection = selectedFileIds.length > 0;
  const addTagList = parseTags(addTags);
  const removeTagList = parseTags(removeTags);
  const ratingValue = rating === '' ? null : Number(rating);
  const boardIdValue = boardId ? Number(boardId) : null;
  const hasActions = Boolean(
    addTagList.length ||
    removeTagList.length ||
    toggleFavorite ||
    ratingValue !== null ||
    deleteSelected ||
    boardIdValue
  );

  const resetInputs = () => {
    setAddTags('');
    setRemoveTags('');
    setToggleFavorite(false);
    setRating('');
    setDeleteSelected(false);
  };

  const handleApply = async () => {
    if (!hasSelection || !hasActions) return;
    setIsApplying(true);
    setErrorMessage(null);

    try {
      let boardItems = null;
      if (boardIdValue) {
        const { x, y } = getBoardCenter();
        boardItems = await Promise.all(selectedFiles.map(async (file) => {
          const { width, height } = await loadImageSize(file);
          return {
            file_id: file.id,
            pos_x: x,
            pos_y: y,
            width,
            height,
            rotation: 0,
            z_index: 0,
          };
        }));
      }

      await applyBatch({
        file_ids: selectedFileIds,
        add_tags: addTagList,
        remove_tags: removeTagList,
        toggle_favorite: toggleFavorite,
        rating: ratingValue,
        delete_files: deleteSelected,
        board_id: boardIdValue,
        board_items: boardItems,
      });

      if (boardIdValue && activeBoardId === boardIdValue) {
        await setActiveBoard(boardIdValue);
      }

      resetInputs();
      setIsConfirmOpen(false);
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      setErrorMessage(detail || 'Batch operation failed.');
    } finally {
      setIsApplying(false);
    }
  };

  const boardOptions: BoardOption[] = boards.map(board => ({ id: board.id, name: board.name }));

  return (
    <div className="bulk-toolbar">
      <div className="bulk-toolbar-group">
        <span className="bulk-count">
          {hasSelection ? `${selectedFileIds.length} selected` : 'No selection'}
        </span>
        {hasSelection && (
          <button type="button" className="secondary" onClick={clearSelection}>
            Clear
          </button>
        )}
      </div>

      <div className="bulk-toolbar-group bulk-fields">
        <div className="bulk-field">
          <Tag size={16} />
          <input
            type="text"
            placeholder="Add tags (comma)"
            value={addTags}
            onChange={(e) => setAddTags(e.target.value)}
          />
        </div>
        <div className="bulk-field">
          <Tag size={16} />
          <input
            type="text"
            placeholder="Remove tags (comma)"
            value={removeTags}
            onChange={(e) => setRemoveTags(e.target.value)}
          />
        </div>
        <label className="bulk-toggle">
          <input
            type="checkbox"
            checked={toggleFavorite}
            onChange={(e) => setToggleFavorite(e.target.checked)}
          />
          Toggle favorite
        </label>
        <div className="bulk-field bulk-rating">
          <span>Rating</span>
          <select value={rating} onChange={(e) => setRating(e.target.value)}>
            <option value="">--</option>
            {Array.from({ length: 11 }).map((_, idx) => (
              <option key={idx} value={idx}>{idx}</option>
            ))}
          </select>
        </div>
        <div className="bulk-field bulk-board">
          <Plus size={16} />
          <select
            value={boardId}
            onChange={(e) => setBoardId(e.target.value)}
            disabled={deleteSelected}
          >
            <option value="">Add to board...</option>
            {boardOptions.map(board => (
              <option key={board.id} value={board.id}>{board.name}</option>
            ))}
          </select>
        </div>
        <label className="bulk-toggle danger">
          <input
            type="checkbox"
            checked={deleteSelected}
            onChange={(e) => setDeleteSelected(e.target.checked)}
          />
          Delete selected
        </label>
      </div>

      <div className="bulk-toolbar-group bulk-actions">
        <button
          type="button"
          className="primary"
          disabled={!hasSelection || !hasActions}
          onClick={() => setIsConfirmOpen(true)}
        >
          Apply
        </button>
      </div>

      {errorMessage && (
        <div className="bulk-error">
          <AlertTriangle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {isConfirmOpen && (
        <div className="bulk-confirm-backdrop" onClick={() => !isApplying && setIsConfirmOpen(false)}>
          <div className="bulk-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Apply changes?</h3>
            <ul>
              <li>{selectedFileIds.length} items</li>
              {addTagList.length > 0 && <li>Add tags: {addTagList.join(', ')}</li>}
              {removeTagList.length > 0 && <li>Remove tags: {removeTagList.join(', ')}</li>}
              {toggleFavorite && <li>Toggle favorite</li>}
              {ratingValue !== null && <li>Set rating: {ratingValue}</li>}
              {boardIdValue && <li>Add to board: {boardOptions.find(b => b.id === boardIdValue)?.name}</li>}
              {deleteSelected && <li className="danger-text">Delete selected</li>}
            </ul>
            <div className="bulk-confirm-actions">
              <button type="button" className="secondary" onClick={() => setIsConfirmOpen(false)} disabled={isApplying}>
                Cancel
              </button>
              <button type="button" className="danger" onClick={handleApply} disabled={isApplying}>
                {isApplying ? 'Applying...' : (
                  <>
                    <Check size={16} />
                    Confirm
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkEditToolbar;
