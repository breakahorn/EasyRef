import React, { useCallback, useState } from 'react';
import { useFileStore } from '../store/useFileStore';
import { UploadCloud, Loader } from 'lucide-react';

const Uploader: React.FC = () => {
  const { uploadFiles, isLoading } = useFileStore();
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  }, [uploadFiles]);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFiles(e.target.files);
    }
  };

  const handleClick = () => {
    if (!isLoading) {
      document.getElementById('fileInput')?.click();
    }
  };

  return (
    <div 
      className={`uploader-container ${isDragActive ? 'drag-active' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input type="file" id="fileInput" multiple style={{ display: 'none' }} onChange={handleChange} disabled={isLoading} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        {isLoading ? (
          <>
            <Loader className="animate-spin" />
            <p>Uploading...</p>
          </>
        ) : (
          <>
            <UploadCloud size={48} />
            <p>Drag & drop files here, or click to select files</p>
          </>
        )}
      </div>
    </div>
  );
};

export default Uploader;
