import React from "react";
import Sidebar from "../userdashboard/sidebar";
import NavBar from "../userdashboard/NavBar";
import { useAuth } from "../contexts/AuthContext";

/**
 * Common Layout Component for all dashboard pages
 * Provides consistent sidebar + navbar structure with role-based access
 */
export default function Layout({ children, title, showBackButton = false, onBack }) {
  const { user } = useAuth();
  
  return (
    <div className="h-screen bg-[#141a45] text-white font-poppins">
      <div className="flex h-screen">
        <Sidebar user={user} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <NavBar user={user} />
          <div className="flex-1 overflow-y-auto">
            {/* Optional Header with Title and Back Button */}
            {(title || showBackButton) && (
              <div className="sticky top-0 z-10 bg-[#141a45]/95 backdrop-blur-sm border-b border-gray-700/50 px-6 py-4">
                <div className="flex items-center gap-4">
                  {showBackButton && (
                    <button 
                      onClick={onBack || (() => window.history.back())}
                      className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                    >
                      <i className="ri-arrow-left-line text-xl" />
                    </button>
                  )}
                  {title && (
                    <h1 className="text-2xl font-bold text-white" style={{textShadow: "0 0 8px rgba(155, 93, 229, 0.35)"}}>
                      {title}
                    </h1>
                  )}
                </div>
              </div>
            )}
            {/* Main Content */}
            <div className="p-4 sm:p-6">
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
