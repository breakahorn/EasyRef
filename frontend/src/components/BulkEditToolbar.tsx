import React, { useEffect, useMemo, useState } from 'react';
import * as Select from '@radix-ui/react-select';
import { AlertTriangle, Check, ChevronDown, Pencil, Plus, Tag, X } from 'lucide-react';
import { useFileStore } from '../store/useFileStore';
import { useBoardStore } from '../store/useBoardStore';
import { buildAssetUrl } from '../lib/api';
import type { FileRecord } from '../store/useFileStore';

type BoardOption = { id: number; name: string };
type BulkMode = 'normal' | 'edit' | 'board';
type SelectOption = { value: string; label: string };

const BulkSelect = ({
  value,
  placeholder,
  options,
  onChange,
  disabled,
  className,
  children,
}: {
  value?: string;
  placeholder: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}) => (
  <Select.Root value={value} onValueChange={onChange} disabled={disabled}>
    <Select.Trigger asChild>
      <div className={`bulk-select-trigger ${className || ''}`}>
        {children}
        <Select.Value placeholder={placeholder} className="bulk-select-value" />
        <Select.Icon className="bulk-select-icon">
          <ChevronDown size={16} />
        </Select.Icon>
      </div>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content className="bulk-select-content" position="popper" sideOffset={6}>
        <Select.Viewport className="bulk-select-viewport">
          {options.map(option => (
            <Select.Item key={option.value} value={option.value} className="bulk-select-item">
              <Select.ItemText>{option.label}</Select.ItemText>
              <Select.ItemIndicator className="bulk-select-indicator">
                <Check size={14} />
              </Select.ItemIndicator>
            </Select.Item>
          ))}
        </Select.Viewport>
      </Select.Content>
    </Select.Portal>
  </Select.Root>
);

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

interface BulkEditToolbarProps {
  mode: BulkMode;
  setMode: (mode: BulkMode) => void;
}

const BulkEditToolbar: React.FC<BulkEditToolbarProps> = ({ mode, setMode }) => {
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
    if (mode !== 'board') return;
    if (boardId) return;
    if (activeBoardId) {
      setBoardId(String(activeBoardId));
      return;
    }
    if (boards.length > 0) {
      setBoardId(String(boards[0].id));
    }
  }, [mode, boardId, activeBoardId, boards]);

  const selectedFiles = useMemo(() => {
    const selectedSet = new Set(selectedFileIds);
    return files.filter(file => selectedSet.has(file.id));
  }, [files, selectedFileIds]);

  const hasSelection = selectedFileIds.length > 0;
  const addTagList = parseTags(addTags);
  const removeTagList = parseTags(removeTags);
  const ratingValue = rating === '' ? null : Number(rating);
  const boardIdValue = boardId ? Number(boardId) : null;
  const hasEditActions = Boolean(
    addTagList.length ||
    removeTagList.length ||
    toggleFavorite ||
    ratingValue !== null ||
    deleteSelected
  );
  const hasBoardAction = Boolean(boardIdValue);

  const resetInputs = () => {
    setAddTags('');
    setRemoveTags('');
    setToggleFavorite(false);
    setRating('');
    setDeleteSelected(false);
    setBoardId('');
  };

  const handleApply = async () => {
    if (!hasSelection) return;
    if (mode === 'edit' && !hasEditActions) return;
    if (mode === 'board' && !hasBoardAction) return;
    setIsApplying(true);
    setErrorMessage(null);

    try {
      let boardItems = null;
      if (mode === 'board' && boardIdValue) {
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
        add_tags: mode === 'edit' ? addTagList : [],
        remove_tags: mode === 'edit' ? removeTagList : [],
        toggle_favorite: mode === 'edit' ? toggleFavorite : false,
        rating: mode === 'edit' ? ratingValue : null,
        delete_files: mode === 'edit' ? deleteSelected : false,
        board_id: mode === 'board' ? boardIdValue : null,
        board_items: mode === 'board' ? boardItems : null,
      });

      if (boardIdValue && activeBoardId === boardIdValue) {
        await setActiveBoard(boardIdValue);
      }

      resetInputs();
      setIsConfirmOpen(false);
      setMode('normal');
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      setErrorMessage(detail || 'Batch operation failed.');
    } finally {
      setIsApplying(false);
    }
  };

  const boardOptions: BoardOption[] = boards.map(board => ({ id: board.id, name: board.name }));
  const ratingOptions: SelectOption[] = [
    { value: 'unset', label: '--' },
    ...Array.from({ length: 11 }).map((_, idx) => ({
      value: String(idx),
      label: String(idx),
    }))
  ];
  const boardSelectOptions: SelectOption[] = boardOptions.map(board => ({
    value: String(board.id),
    label: board.name,
  }));

  const handleCancel = () => {
    resetInputs();
    clearSelection();
    setErrorMessage(null);
    setIsConfirmOpen(false);
    setMode('normal');
  };

  return (
    <div className="bulk-toolbar">
      {mode === 'normal' && (
        <div className="bulk-toolbar-group">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              clearSelection();
              resetInputs();
              setMode('edit');
            }}
          >
            <Pencil size={16} className="bulk-btn-icon" />
            Edit
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => {
              clearSelection();
              resetInputs();
              setMode('board');
            }}
          >
            <Plus size={16} className="bulk-btn-icon" />
            Add to board
          </button>
        </div>
      )}

      {mode === 'edit' && (
        <>
          <div className="bulk-toolbar-group">
            <span className="bulk-count">{hasSelection ? `${selectedFileIds.length} selected` : 'Select items'}</span>
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
            <BulkSelect
              className="bulk-field bulk-rating"
              value={rating}
              placeholder="--"
              options={ratingOptions}
              onChange={(value) => setRating(value === 'unset' ? '' : value)}
            >
              <span>Rating</span>
            </BulkSelect>
            <label className="bulk-toggle danger">
              <input
                type="checkbox"
                checked={deleteSelected}
                onChange={(e) => setDeleteSelected(e.target.checked)}
              />
              Delete
            </label>
          </div>
          <div className="bulk-toolbar-group bulk-actions">
            <button
              type="button"
              className="secondary"
              onClick={handleCancel}
              disabled={isApplying}
            >
              <X size={16} />
              Cancel
            </button>
            <button
              type="button"
              className="primary"
              disabled={!hasSelection || !hasEditActions}
              onClick={() => setIsConfirmOpen(true)}
            >
              Apply
            </button>
          </div>
        </>
      )}

      {mode === 'board' && (
        <>
          <div className="bulk-toolbar-group">
            <span className="bulk-count">{hasSelection ? `${selectedFileIds.length} selected` : 'Select items'}</span>
          </div>
          <div className="bulk-toolbar-group bulk-fields">
            <BulkSelect
              className="bulk-field bulk-board"
              value={boardId || undefined}
              placeholder="Select board"
              options={boardSelectOptions}
              onChange={setBoardId}
              disabled={boardSelectOptions.length === 0}
            >
              <Plus size={16} />
            </BulkSelect>
          </div>
          <div className="bulk-toolbar-group bulk-actions">
            <button
              type="button"
              className="secondary"
              onClick={handleCancel}
              disabled={isApplying}
            >
              <X size={16} />
              Cancel
            </button>
            <button
              type="button"
              className="primary"
              disabled={!hasSelection || !hasBoardAction}
              onClick={() => setIsConfirmOpen(true)}
            >
              Apply
            </button>
          </div>
        </>
      )}

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
              {mode === 'edit' && addTagList.length > 0 && <li>Add tags: {addTagList.join(', ')}</li>}
              {mode === 'edit' && removeTagList.length > 0 && <li>Remove tags: {removeTagList.join(', ')}</li>}
              {mode === 'edit' && toggleFavorite && <li>Toggle favorite</li>}
              {mode === 'edit' && ratingValue !== null && <li>Set rating: {ratingValue}</li>}
              {mode === 'board' && boardIdValue && (
                <li>Add to board: {boardOptions.find(b => b.id === boardIdValue)?.name}</li>
              )}
              {mode === 'edit' && deleteSelected && <li className="danger-text">Delete selected</li>}
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
