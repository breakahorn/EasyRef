import { Outlet, Link } from "react-router-dom";
import FileDetailModal from "./components/FileDetailModal";
import Sidebar from "./components/Sidebar";
import './index.css';

function App() {
  return (
    <div className="app-container">
      <nav className="main-nav">
        <Link to="/"><strong>EasyRef</strong></Link>
        <Link to="/">Gallery</Link>
        <Link to="/board">Reference Board</Link>
      </nav>
      <div className="main-content-wrapper">
        <Sidebar />
        <main className="content-area">
          <Outlet />
        </main>
      </div>
      <FileDetailModal />
    </div>
  );
}

export default App;
