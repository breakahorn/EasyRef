import React from 'react';
import { useFileStore } from '../store/useFileStore';
import { X, Star, Heart, Tag as TagIcon, MessageSquare } from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000';

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi'];

const RatingDisplay: React.FC<{ rating: number }> = ({ rating }) => {
  return (
    <div className="flex gap-1">
      {[...Array(10)].map((_, i) => {
        const ratingValue = i + 1;
        return <Star key={ratingValue} size={22} className={`${ratingValue <= rating ? 'text-yellow-400' : 'text-gray-500'}`} />;
      })}
    </div>
  );
};

const FileDetailModal: React.FC = () => {
  const { selectedFile, selectFile } = useFileStore();

  if (!selectedFile) {
    return null;
  }

  const handleClose = () => {
    selectFile(null);
  };

  const getFileUrl = (filePath: string) => {
    const relativePath = filePath.replace(/\\/g, '/').replace(/^\.?\//, '');
    return `${API_BASE_URL}/${relativePath}`;
  };

  const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase() || '';
  const isImage = IMAGE_EXTENSIONS.includes(fileExtension);
  const isVideo = VIDEO_EXTENSIONS.includes(fileExtension);

  const renderMedia = () => {
    const url = getFileUrl(selectedFile.path);
    if (isImage) {
      return <img src={url} alt={selectedFile.name} className="max-w-full max-h-full object-contain" />;
    } else if (isVideo) {
      return <video src={url} controls autoPlay loop className="max-w-full max-h-full object-contain" />;
    } else {
      return <p>Unsupported file type</p>;
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <button className="modal-close-button" onClick={handleClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body flex flex-row h-full gap-6">
          {/* Viewer Area */}
          <div className="flex-1 h-full bg-black rounded-lg flex items-center justify-center overflow-hidden">
            {renderMedia()}
          </div>

          {/* Details & Actions Area */}
          <div className="w-96 flex-shrink-0 h-full flex flex-col gap-4 overflow-y-auto pr-2">
            <div className="flex items-start justify-between text-xl font-semibold">
              <h3 title={selectedFile.name} className="pr-4">{selectedFile.name}</h3>
            </div>
            <p className="text-sm text-gray-400 -mt-3 mb-4">Uploaded: {new Date(selectedFile.created_at).toLocaleString()}</p>

            {/* Favorite Button */}
            <div className="flex justify-center">
              <button className="bg-transparent border-none p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-gray-700 transition-colors disabled:opacity-50" disabled>
                <Heart size={22} className={selectedFile.file_metadata?.is_favorite ? 'text-red-500' : ''} />
              </button>
            </div>

            <div className="p-4 bg-black/20 rounded-lg">
              <h4 className="text-base font-semibold text-gray-300 mb-3 flex items-center gap-2">Rating</h4>
              <RatingDisplay rating={selectedFile.file_metadata?.rating || 0} />
            </div>

            <div className="p-4 bg-black/20 rounded-lg">
              <h4 className="text-base font-semibold text-gray-300 mb-3 flex items-center gap-2"><TagIcon size={18} /> Tags</h4>
              <div className="flex flex-wrap gap-2">
                {selectedFile.tags && selectedFile.tags.length > 0 ? (
                  selectedFile.tags.map(tag => (
                    <span key={tag.id} className="bg-indigo-500/20 text-indigo-300 text-xs font-medium px-2.5 py-1 rounded-full">
                      {tag.name}
                    </span>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No tags yet.</p>
                )}
              </div>
            </div>

            <div className="p-4 bg-black/20 rounded-lg">
              <h4 className="text-base font-semibold text-gray-300 mb-3 flex items-center gap-2"><MessageSquare size={18} /> Notes</h4>
              <p className="bg-gray-900 p-3 rounded-md text-sm text-gray-300 min-h-[6rem]">
                {selectedFile.file_metadata?.notes || 'No notes yet.'}
              </p>
            </div>

            <div className="mt-auto pt-4 border-t border-gray-700">
              <h4 className="font-semibold text-red-500/80">Danger Zone</h4>
              <button disabled className="w-full bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 py-2 rounded-md flex items-center justify-center gap-2 transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
                Delete this file
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileDetailModal;
