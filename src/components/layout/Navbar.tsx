import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_LABELS } from '../../utils/constants/roles';
import NotificationPanel from '../ui/NotificationPanel';

interface NavbarProps {
  toggleSidebar: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ toggleSidebar }) => {
  const { user, signOut } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };
  
  const handleSignOut = async () => {
    await signOut();
  };
  
  return (
    <div className="navbar bg-base-100 border-b">
      <div className="flex-1">
        <button 
          className="btn btn-ghost lg:hidden" 
          aria-label="Toggle sidebar"
          onClick={toggleSidebar}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
          </svg>
        </button>
        <span className="text-xl font-bold text-primary">Fincentiva CRM</span>
      </div>
      
      <div className="flex-none gap-2">
        <NotificationPanel />
        
        <div className="dropdown dropdown-end">
          <button 
            tabIndex={0} 
            className="btn btn-ghost btn-circle avatar"
            onClick={toggleDropdown}
            aria-label="User menu"
          >
            <div className="bg-primary text-primary-content rounded-full w-10 h-10 flex items-center justify-center">
              <span className="text-lg font-bold">
                {user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
          </button>
          
          {isDropdownOpen && (
            <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
              <li className="p-3 border-b">
                <span className="font-bold">{user?.name || user?.email}</span>
                <span className="text-xs opacity-70 block">
                  {user?.role ? (ROLE_LABELS as any)[user.role] || 'Usuario' : 'Usuario'}
                </span>
              </li>
              <li>
                <Link to="/profile" className="justify-between">
                  Mi Perfil
                </Link>
              </li>
              <li>
                <button onClick={handleSignOut}>Cerrar Sesión</button>
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar; 