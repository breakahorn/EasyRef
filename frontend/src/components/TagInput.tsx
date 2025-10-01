import React, { useState, useEffect, useRef } from 'react';
import { useTagStore } from '../store/useTagStore';
import { X } from 'lucide-react';

interface Tag {
  id: number;
  name: string;
}

interface TagInputProps {
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
}

const TagInput: React.FC<TagInputProps> = ({ selectedTags, onTagsChange }) => {
  const { allTags, fetchTags } = useTagStore();
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    if (inputValue) {
      const filtered = allTags
        .filter(tag => tag.name.toLowerCase().includes(inputValue.toLowerCase()))
        .filter(tag => !selectedTags.some(selected => selected.id === tag.id))
        .slice(0, 10); // Limit suggestions
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [inputValue, allTags, selectedTags]);

  const addTag = (tag: Tag) => {
    if (!selectedTags.some(t => t.id === tag.id)) {
      onTagsChange([...selectedTags, tag]);
      setInputValue('');
      setSuggestions([]);
      inputRef.current?.focus();
    }
  };

  const removeTag = (tagToRemove: Tag) => {
    onTagsChange(selectedTags.filter(tag => tag.id !== tagToRemove.id));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue) {
        e.preventDefault();
        if (activeIndex >= 0 && suggestions[activeIndex]) {
            addTag(suggestions[activeIndex]);
        } else {
            // Find if the exact match exists in allTags
            const existingTag = allTags.find(t => t.name.toLowerCase() === inputValue.toLowerCase());
            if (existingTag) {
                addTag(existingTag);
            } else {
                // This part is tricky as we don't have a mechanism to create a new tag from here yet.
                // For now, we just clear the input.
                console.log("New tag creation not implemented from input.");
                setInputValue('');
            }
        }
        setActiveIndex(-1);
    } else if (e.key === 'Backspace' && !inputValue) {
      removeTag(selectedTags[selectedTags.length - 1]);
    } else if (e.key === 'ArrowDown') {
      setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      setActiveIndex(prev => (prev > 0 ? prev - 1 : -1));
    }
  };

  return (
    <div className="tag-input-container">
      <div className="tags-wrapper">
        {selectedTags.map(tag => (
          <div key={tag.id} className="tag-item">
            {tag.name}
            <button onClick={() => removeTag(tag)} className="tag-remove-btn">
              <X size={12} />
            </button>
          </div>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search tags..."
          className="tag-input"
        />
      </div>
      {suggestions.length > 0 && (
        <ul className="suggestions-list">
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              className={`suggestion-item ${index === activeIndex ? 'active' : ''}`}
              onClick={() => addTag(suggestion)}
            >
              {suggestion.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TagInput;
