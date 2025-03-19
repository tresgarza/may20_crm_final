import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePermissions } from '../../contexts/PermissionsContext';
import { PERMISSIONS } from '../../utils/constants/permissions';

interface SidebarProps {
  isOpen: boolean;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  permission?: PERMISSIONS;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const location = useLocation();
  const { userCan } = usePermissions();

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
      permission: PERMISSIONS.VIEW_DASHBOARD,
    },
    {
      label: 'Solicitudes',
      path: '/applications',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      permission: PERMISSIONS.VIEW_APPLICATIONS,
    },
    {
      label: 'Empresas',
      path: '/companies',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
      permission: PERMISSIONS.VIEW_COMPANIES,
    },
    {
      label: 'Asesores',
      path: '/advisors',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      permission: PERMISSIONS.VIEW_ADVISORS,
    },
  ];

  const filteredNavItems = navItems.filter(
    (item) => !item.permission || userCan(item.permission)
  );

  return (
    <div
      className={`lg:block fixed top-0 bottom-0 lg:left-0 w-64 bg-base-200 pt-4 transition-all duration-300 ${
        isOpen ? 'left-0' : '-left-64'
      } z-20 lg:z-0 shadow-lg`}
    >
      <div className="px-6 pb-4 flex items-center border-b border-gray-200">
        <div className="text-primary text-2xl font-bold">Fincentiva</div>
      </div>
      <ul className="menu p-2 pt-4">
        {filteredNavItems.map((item) => (
          <li key={item.path}>
            <Link
              to={item.path}
              className={location.pathname === item.path ? 'active' : ''}
            >
              {item.icon}
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar; 