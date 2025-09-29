import React from 'react';
import Gallery from '../components/Gallery';
import Uploader from '../components/Uploader';

const GalleryPage: React.FC = () => {
  return (
    <div>
      <Uploader />
      <Gallery />
    </div>
  );
};

export default GalleryPage;