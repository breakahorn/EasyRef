import { useCallback, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import GallerySidebar from './GallerySidebar';
import BoardSidebar from './BoardSidebar';

const DEFAULT_WIDTH = 324;
const MIN_WIDTH = 240;
const MAX_WIDTH = 480;
const COLLAPSED_WIDTH = 56;

const Sidebar: React.FC = () => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const previousWidthRef = useRef(DEFAULT_WIDTH);
  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_WIDTH);

  const handleToggle = () => {
    setIsCollapsed((prev) => {
      if (!prev) {
        previousWidthRef.current = sidebarWidth;
        setSidebarWidth(COLLAPSED_WIDTH);
      } else {
        setSidebarWidth(previousWidthRef.current);
      }
      return !prev;
    });
  };

  const handleResize = useCallback((event: MouseEvent) => {
    if (!resizingRef.current) return;
    const delta = event.clientX - startXRef.current;
    const nextWidth = Math.min(
      MAX_WIDTH,
      Math.max(MIN_WIDTH, startWidthRef.current + delta)
    );
    setSidebarWidth(nextWidth);
    previousWidthRef.current = nextWidth;
  }, []);

  const handleResizeEnd = useCallback(() => {
    resizingRef.current = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', handleResizeEnd);
  }, [handleResize]);

  const handleResizeStart = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isCollapsed) {
      setIsCollapsed(false);
      setSidebarWidth(previousWidthRef.current);
    }
    resizingRef.current = true;
    startXRef.current = event.clientX;
    startWidthRef.current = isCollapsed ? previousWidthRef.current : sidebarWidth;
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  if (location.pathname.startsWith('/board')) {
    return (
      <div
        className={`sidebar-shell${isCollapsed ? ' collapsed' : ''}`}
        style={{ width: sidebarWidth }}
      >
        <div className="sidebar-shell-header">
          <button
            type="button"
            className="sidebar-toggle"
            onClick={handleToggle}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        <div className="sidebar-content">
          <BoardSidebar />
        </div>
        <div className="sidebar-resizer" onMouseDown={handleResizeStart} />
      </div>
    );
  }

  return (
    <div
      className={`sidebar-shell${isCollapsed ? ' collapsed' : ''}`}
      style={{ width: sidebarWidth }}
    >
      <div className="sidebar-shell-header">
        <button
          type="button"
          className="sidebar-toggle"
          onClick={handleToggle}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>
      <div className="sidebar-content">
        <GallerySidebar />
      </div>
      <div className="sidebar-resizer" onMouseDown={handleResizeStart} />
    </div>
  );
};

export default Sidebar;
