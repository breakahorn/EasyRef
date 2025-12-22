import React, { useState } from 'react';
import Gallery from '../components/Gallery';
import Uploader from '../components/Uploader';
import BulkEditToolbar from '../components/BulkEditToolbar';

const GalleryPage: React.FC = () => {
  const [mode, setMode] = useState<'normal' | 'edit' | 'board'>('normal');

  return (
    <div>
      <Uploader />
      <BulkEditToolbar mode={mode} setMode={setMode} />
      <Gallery mode={mode} />
    </div>
  );
};

export default GalleryPage;
