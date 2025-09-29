import { NavLink } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="bg-[#2c3035] border-b border-[#424850] p-3 flex items-center gap-6 sticky top-0 z-10">
      <h1 className="text-xl font-bold text-white">EasyRef</h1>
      <NavLink 
        to="/"
        className={({ isActive }) => 
          `font-medium transition-colors ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`
        }
      >
        Gallery
      </NavLink>
      {/* Future links like /board can be added here */}
    </nav>
  );
};

export default Navbar;
