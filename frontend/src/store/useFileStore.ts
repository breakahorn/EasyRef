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
  updateMetadata: (fileId: number, metadata: Partial<FileRecord['file_metadata']>) => Promise<void>;
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
    try {
      const uploadPromises = Array.from(files).map(file => {
        const singleFormData = new FormData();
        singleFormData.append('file', file);
        return axios.post(`${API_BASE_URL}/files/upload`, singleFormData);
      });
      await Promise.all(uploadPromises);
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

  updateMetadata: async (fileId, metadata) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/files/${fileId}/metadata`, metadata);
      const updatedMetadata = response.data;

      set(state => ({
        selectedFile: state.selectedFile && state.selectedFile.id === fileId 
          ? { 
              ...state.selectedFile, 
              file_metadata: { ...state.selectedFile.file_metadata, ...updatedMetadata } 
            }
          : state.selectedFile,
        files: state.files.map(f => 
          f.id === fileId 
            ? { ...f, file_metadata: { ...f.file_metadata, ...updatedMetadata } } 
            : f
        )
      }));

    } catch (error) {
      console.error(`Error updating metadata for file ${fileId}:`, error);
    }
  },

  deleteFile: async (fileId: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/files/${fileId}`);
      set(state => ({
        files: state.files.filter(f => f.id !== fileId),
        selectedFile: state.selectedFile && state.selectedFile.id === fileId ? null : state.selectedFile,
      }));
    } catch (error) {
      console.error(`Error deleting file ${fileId}:`, error);
    }
  },

  addTag: async (fileId: number, tagName: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/files/${fileId}/tags`, { name: tagName });
      const updatedFile = response.data;
      set(state => ({
        selectedFile: state.selectedFile && state.selectedFile.id === fileId ? updatedFile : state.selectedFile,
        files: state.files.map(f => f.id === fileId ? updatedFile : f),
      }));
    } catch (error) {
      console.error(`Error adding tag to file ${fileId}:`, error);
    }
  },

  removeTag: async (fileId: number, tagId: number) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/files/${fileId}/tags/${tagId}`);
      const updatedFile = response.data;
      set(state => ({
        selectedFile: state.selectedFile && state.selectedFile.id === fileId ? updatedFile : state.selectedFile,
        files: state.files.map(f => f.id === fileId ? updatedFile : f),
      }));
    } catch (error) {
      console.error(`Error removing tag from file ${fileId}:`, error);
    }
  },
}));
