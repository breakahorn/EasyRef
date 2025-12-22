import React from 'react';
import Gallery from '../components/Gallery';
import Uploader from '../components/Uploader';
import BulkEditToolbar from '../components/BulkEditToolbar';

const GalleryPage: React.FC = () => {
  return (
    <div>
      <Uploader />
      <BulkEditToolbar />
      <Gallery />
    </div>
  );
};

export default GalleryPage;
