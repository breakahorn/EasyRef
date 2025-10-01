import { NavLink } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react'; // Example icon

const Navbar = () => {
  return (
    <nav className="main-nav flex items-center justify-between">
      {/* App Logo/Name */}
      <NavLink to="/" className="app-brand">
        <LayoutGrid size={24} className="text-[var(--color-accent)]" />
        <span>EasyRef</span>
      </NavLink>

      {/* Navigation Links */}
      <div className="flex items-center gap-6">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `font-medium transition-colors ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`
          }
        >
          Gallery
        </NavLink>
        {/* <NavLink to="/board">Reference Board</NavLink> */}
      </div>
    </nav>
  );
};

export default Navbar;
