import React, { useState } from "react";
import Sidebar from "../userdashboard/sidebar";
import NavBar from "../userdashboard/NavBar";
import { useAuth } from "../contexts/AuthContext";

/**
 * Common Layout Component for all dashboard pages
 * Provides consistent sidebar + navbar structure with role-based access
 * Now with mobile-responsive sidebar toggle
 */
export default function Layout({ children, title, showBackButton = false, onBack }) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  return (
    <div className="h-screen bg-[#141a45] text-white font-poppins overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <div className="flex h-screen">
        {/* Sidebar - Hidden on mobile, shown on lg+ */}
        <div className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}>
          <Sidebar user={user} />
          {/* Close button for mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-lg bg-gray-800/80 text-gray-400 hover:text-white lg:hidden"
          >
            <i className="ri-close-line text-xl" />
          </button>
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden w-full">
          {/* Mobile Header with Hamburger */}
          <div className="sticky top-0 z-30 bg-[#141a45]/95 backdrop-blur-sm lg:hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg bg-gray-800/60 text-white hover:bg-gray-700 transition-colors"
              >
                <i className="ri-menu-line text-xl" />
              </button>
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="CampVerse" className="h-7 w-7" />
                <span className="text-lg font-['Pacifico'] text-white">CampVerse</span>
              </div>
              <div className="w-10" /> {/* Spacer for balance */}
            </div>
          </div>
          
          {/* Desktop NavBar - Hidden on mobile */}
          <div className="hidden lg:block">
            <NavBar user={user} onOpenSidebar={() => setSidebarOpen(true)} />
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {/* Optional Header with Title and Back Button */}
            {(title || showBackButton) && (
              <div className="sticky top-0 z-10 bg-[#141a45]/95 backdrop-blur-sm border-b border-gray-700/50 px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  {showBackButton && (
                    <button 
                      onClick={onBack || (() => window.history.back())}
                      className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                    >
                      <i className="ri-arrow-left-line text-xl" />
                    </button>
                  )}
                  {title && (
                    <h1 className="text-xl sm:text-2xl font-bold text-white" style={{textShadow: "0 0 8px rgba(155, 93, 229, 0.35)"}}>
                      {title}
                    </h1>
                  )}
                </div>
              </div>
            )}
            {/* Main Content */}
            <div className="p-3 sm:p-4 md:p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Verifier Layout - Deprecated, use Layout instead
 */
export function VerifierLayout({ children, user, roles }) {
  return (
    <Layout>
      {children}
    </Layout>
  );
}

/**
 * Admin Layout - For platform admin pages
 */
export function AdminLayout({ children, title }) {
  return (
    <Layout title={title}>
      {children}
    </Layout>
  );
}

/**
 * Host Layout - For host dashboard pages
 */
export function HostLayout({ children, title }) {
  return (
    <Layout title={title}>
      {children}
    </Layout>
  );
}
