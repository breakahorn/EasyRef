const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000';

const normalizeBaseUrl = (value?: string) => {
  if (!value) return DEFAULT_API_BASE_URL;
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_API_BASE_URL;
  return trimmed.replace(/\/+$/, '');
};

export const API_BASE_URL = normalizeBaseUrl(import.meta.env?.VITE_API_BASE_URL);

export const buildAssetUrl = (filePath: string) => {
  if (!filePath) return '';
  const normalized = filePath.replace(/\\/g, '/').replace(/^\.?\//, '');
  return `${API_BASE_URL}/${normalized}`;
};

export const resolveFileUrl = (file?: { file_url?: string; path?: string }) => {
  if (!file) return '';
  if (file.file_url) {
    if (/^https?:\/\//i.test(file.file_url)) return file.file_url;
    const normalized = file.file_url.replace(/^\/+/, '').replace(/\\/g, '/');
    return `${API_BASE_URL}/${normalized}`;
  }
  return buildAssetUrl(file.path ?? '');
};
