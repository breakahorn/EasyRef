import React, { useState, useEffect } from 'react';
import { useFileStore } from '../store/useFileStore';
import { Search, Shuffle, Star, XCircle } from 'lucide-react';
import TagInput from './TagInput'; // Import the new component

const GallerySidebar: React.FC = () => {
  const { searchFiles, fetchRandomFile, fetchFiles } = useFileStore();

  const [selectedTags, setSelectedTags] = useState<{ id: number, name: string }[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [fileType, setFileType] = useState('all');
  const [tagSearchMode, setTagSearchMode] = useState('or'); // 'or' or 'and'

  // Debounced search effect
  useEffect(() => {
    const handler = setTimeout(() => {
      const params = {
        tags: selectedTags.map(t => t.name).join(',') || undefined,
        tag_search_mode: selectedTags.length > 1 ? tagSearchMode : undefined,
        min_rating: minRating > 0 ? minRating : undefined,
        is_favorite: isFavorite || undefined,
        file_type: fileType === 'all' ? undefined : fileType,
      };
      if (Object.values(params).some(v => v !== undefined)) {
        searchFiles(params);
      } else {
        fetchFiles(); // Fetch all if no filters
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [selectedTags, minRating, isFavorite, fileType, tagSearchMode]);

  const handleClear = () => {
    setSelectedTags([]);
    setMinRating(0);
    setIsFavorite(false);
    setFileType('all');
    setTagSearchMode('or');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h4><Search size={18} /> Search & Filter</h4>
        <form onSubmit={(e) => e.preventDefault()}>

          <div className="form-group">
            <label className="m-0">Tags</label>
            <TagInput selectedTags={selectedTags} onTagsChange={setSelectedTags} />
          </div>

          <div className="form-group">
            <label>Tag Search Mode</label>
            <div className="radio-group">
              <input type="radio" id="tag-mode-or" value="or" checked={tagSearchMode === 'or'} onChange={(e) => setTagSearchMode(e.target.value)} />
              <label htmlFor="tag-mode-or">OR</label>
              <input type="radio" id="tag-mode-and" value="and" checked={tagSearchMode === 'and'} onChange={(e) => setTagSearchMode(e.target.value)} />
              <label htmlFor="tag-mode-and">AND</label>
            </div>
          </div>

          <div className="form-group">
            <label>File Type</label>
            <div className="radio-group">
              <input type="radio" id="type-all" value="all" checked={fileType === 'all'} onChange={(e) => setFileType(e.target.value)} />
              <label htmlFor="type-all">All</label>
              <input type="radio" id="type-image" value="image" checked={fileType === 'image'} onChange={(e) => setFileType(e.target.value)} />
              <label htmlFor="type-image">Images</label>
              <input type="radio" id="type-video" value="video" checked={fileType === 'video'} onChange={(e) => setFileType(e.target.value)} />
              <label htmlFor="type-video">Videos</label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="rating">Minimum Rating</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Star size={16} color={minRating > 0 ? '#facc15' : '#6b7280'} />
              <input
                type="range"
                id="rating"
                min="0"
                max="10"
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                style={{ flexGrow: 1 }}
              />
              <span style={{ width: '2rem', textAlign: 'right' }}>{minRating > 0 ? minRating : 'Any'}</span>
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
                style={{ width: 'auto', marginRight: '0.5rem' }}
              />
              Favorites Only
            </label>
          </div>

          <div className="form-group">
            <button type="button" onClick={handleClear} className="secondary flex items-center justify-center gap-2"><XCircle size={16} />Clear Filters</button>
          </div>
        </form>
      </div>

      <div className="sidebar-section">
        <h4><Shuffle size={18} /> Discover</h4>
        <div className="form-group">
          <button onClick={() => fetchRandomFile()} className="flex items-center justify-center gap-2">Show Random File</button>
        </div>
      </div>
    </aside>
  );
};

export default GallerySidebar;
