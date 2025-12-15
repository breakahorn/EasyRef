import { create } from 'zustand';
import axios from 'axios';
import { API_BASE_URL } from '../lib/api';

// Type definitions based on schemas
export interface BoardItem { id: number; board_id: number; file_id: number; pos_x: number; pos_y: number; width: number; height: number; rotation: number; z_index: number; file: any; }
interface Board { id: number; name: string; description: string | null; items: BoardItem[]; }

interface BoardState {
  boards: Omit<Board, 'items'>[];
  activeBoard: Board | null;
  activeBoardId: number | null;
  selectedItemId: number | null;
  fetchBoards: () => Promise<void>;
  setActiveBoard: (id: number | null) => Promise<void>;
  setSelectedItemId: (id: number | null) => void;
  createBoard: (name: string) => Promise<Board | null>;
  renameBoard: (id: number, newName: string) => Promise<void>;
  deleteBoard: (id: number) => Promise<void>;
  addItemToBoard: (boardId: number, fileId: number, itemData: Partial<BoardItem>) => Promise<void>;
  updateBoardItem: (itemId: number, itemData: Partial<BoardItem>) => Promise<void>;
  deleteBoardItem: (itemId: number) => Promise<void>;
  resetItem: (itemId: number) => Promise<void>;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  activeBoard: null,
  activeBoardId: null,
  selectedItemId: null,

  setSelectedItemId: (id) => set({ selectedItemId: id }),

  fetchBoards: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/boards`);
      set({ boards: response.data });
      if (get().activeBoardId === null && response.data.length > 0) {
        get().setActiveBoard(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching boards:', error);
    }
  },

  setActiveBoard: async (id) => {
    if (id === null) {
      set({ activeBoardId: null, activeBoard: null });
      return;
    }
    set({ activeBoardId: id, activeBoard: null }); // Set loading state
    try {
      const response = await axios.get(`${API_BASE_URL}/boards/${id}`);
      set({ activeBoard: response.data });
    } catch (error) {
      console.error(`Error fetching board ${id}:`, error);
      set({ activeBoardId: null });
    }
  },

  createBoard: async (name) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/boards`, { name });
      await get().fetchBoards();
      return response.data;
    } catch (error) {
      console.error('Error creating board:', error);
      return null;
    }
  },

  renameBoard: async (id, newName) => {
    try {
      await axios.put(`${API_BASE_URL}/boards/${id}`, { name: newName });
      await get().fetchBoards();
      if (get().activeBoardId === id) {
        await get().setActiveBoard(id);
      }
    } catch (error) {
      console.error('Error renaming board:', error);
    }
  },

  deleteBoard: async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/boards/${id}`);
      const { boards, activeBoardId } = get();
      if (activeBoardId === id) {
        const remainingBoards = boards.filter(b => b.id !== id);
        const newActiveId = remainingBoards.length > 0 ? remainingBoards[0].id : null;
        get().setActiveBoard(newActiveId);
      }
      // Refetch boards after deletion and potential active board change
      await get().fetchBoards();
    } catch (error) {
      console.error('Error deleting board:', error);
    }
  },

  addItemToBoard: async (boardId, fileId, itemData) => {
    try {
      await axios.post(`${API_BASE_URL}/boards/${boardId}/items`, { file_id: fileId, ...itemData });
      await get().setActiveBoard(boardId); // Refresh the active board to show the new item
    } catch (error) {
      console.error('Error adding item to board:', error);
    }
  },

  updateBoardItem: async (itemId, itemData) => {
    const { activeBoard } = get();
    if (!activeBoard) return;

    const originalItems = activeBoard.items;
    const updatedItems = originalItems.map(item =>
      item.id === itemId ? { ...item, ...itemData } : item
    );
    set({ activeBoard: { ...activeBoard, items: updatedItems } });

    try {
      await axios.put(`${API_BASE_URL}/items/${itemId}`, itemData);
    } catch (error) {
      console.error('Error updating item, reverting:', error);
      set({ activeBoard: { ...activeBoard, items: originalItems } });
    }
  },

  deleteBoardItem: async (itemId) => {
    const { activeBoard } = get();
    if (!activeBoard) return;

    const originalItems = activeBoard.items;
    const updatedItems = originalItems.filter(item => item.id !== itemId);

    set({ activeBoard: { ...activeBoard, items: updatedItems }, selectedItemId: null });

    try {
      await axios.delete(`${API_BASE_URL}/items/${itemId}`);
    } catch (error) {
      console.error('Error deleting item, reverting:', error);
      set({ activeBoard: { ...activeBoard, items: originalItems } });
    }
  },

  resetItem: async (itemId: number) => {
    const { activeBoard } = get();
    if (!activeBoard) return;

    try {
      const response = await axios.put(`${API_BASE_URL}/items/${itemId}/reset`);
      const updatedItem = response.data;

      // Instead of refetching the whole board, just update the specific item in the local state
      set(state => {
        if (!state.activeBoard) return {};
        const newItems = state.activeBoard.items.map(item =>
          item.id === itemId ? updatedItem : item
        );
        return {
          activeBoard: { ...state.activeBoard, items: newItems }
        };
      });

    } catch (error) {
      console.error(`Error resetting item ${itemId}:`, error);
    }
  },
}));
