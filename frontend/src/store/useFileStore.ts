import { create } from 'zustand';
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

interface FileRecord {
  id: number;
  name: string;
  path: string;
  file_metadata?: { [key: string]: any };
}

interface FileState {
  files: FileRecord[];
  selectedFile: FileRecord | null;
  isLoading: boolean;
  fetchFiles: () => Promise<void>;
  searchFiles: (params: object) => Promise<void>;
  fetchRandomFile: () => Promise<void>;
  uploadFiles: (files: FileList) => Promise<void>;
  selectFile: (file: FileRecord | null) => void;
}

export const useFileStore = create<FileState>((set, get) => ({
  files: [],
  selectedFile: null,
  isLoading: false,

  fetchFiles: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/files`);
      set({ files: response.data });
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  },

  searchFiles: async (params) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/files/search/`, { params });
      set({ files: response.data });
    } catch (error) {
      console.error("Error searching files:", error);
    }
  },

  fetchRandomFile: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/files/random/`);
      set({ selectedFile: response.data });
    } catch (error) {
      console.error("Error fetching random file:", error);
    }
  },

  uploadFiles: async (files: FileList) => {
    set({ isLoading: true });
    const formData = new FormData();
    
    // Append all files to the same form data object
    for (let i = 0; i < files.length; i++) {
      formData.append("file", files[i]);
      // The backend needs to be able to handle multiple files under the same key
      // A more robust way is to send one by one.
    }

    try {
      // Let's upload one by one to be safe and give better feedback
      const uploadPromises = Array.from(files).map(file => {
        const singleFormData = new FormData();
        singleFormData.append('file', file);
        return axios.post(`${API_BASE_URL}/files/upload`, singleFormData);
      });

      await Promise.all(uploadPromises);

      // After all uploads are successful, refresh the file list
      await get().fetchFiles();

    } catch (error) {
      console.error("Error uploading files:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  selectFile: (file) => {
    set({ selectedFile: file });
  },
}));
