import { useLocation } from 'react-router-dom';
import GallerySidebar from './GallerySidebar';
import BoardSidebar from './BoardSidebar';

const Sidebar: React.FC = () => {
  const location = useLocation();

  if (location.pathname.startsWith('/board')) {
    return <BoardSidebar />;
  }

  return <GallerySidebar />;
};

export default Sidebar;