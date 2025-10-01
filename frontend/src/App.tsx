import { Outlet } from "react-router-dom";
import Navbar from './components/Navbar';
import Sidebar from "./components/Sidebar";
import FileDetailModal from "./components/FileDetailModal";
import './index.css';

function App() {
  return (
    <div className="app-container">
      <Navbar />
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
