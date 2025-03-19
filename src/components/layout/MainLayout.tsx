import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-base-200">
      <Sidebar isOpen={isSidebarOpen} />
      <div className="lg:ml-64 flex flex-col min-h-screen">
        <Navbar toggleSidebar={toggleSidebar} />
        <main className="flex-grow p-4">{children}</main>
      </div>
      
      {/* Backdrop for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden" 
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
};

export default MainLayout; 