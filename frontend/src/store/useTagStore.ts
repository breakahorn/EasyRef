import { create } from 'zustand';
import axios from 'axios';
import { API_BASE_URL } from '../lib/api';

interface Tag {
  id: number;
  name: string;
}

interface TagState {
  allTags: Tag[];
  fetchTags: () => Promise<void>;
}

export const useTagStore = create<TagState>((set) => ({
  allTags: [],

  fetchTags: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/tags`);
      set({ allTags: response.data });
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  },
}));
