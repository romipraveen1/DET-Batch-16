import React from 'react';
import { Bell, User, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { useApp } from '../../context/AppContext';
import QuickAddDefect from '../../pages/QuickAddDefect';
import QuickAddTestCase from '../../pages/QuickAddTestCase';
import { useLocation } from 'react-router-dom';
import UserDetailsDrawer from '../../pages/UserDetailsDrawer';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { selectedProjectId, modulesByProject } = useApp();
  const location = useLocation();

  // Drawer state
  const [showUserDrawer, setShowUserDrawer] = React.useState(false);

  // Only show quick add on these subpages
  const showQuickAdd = React.useMemo(() => {
    // Matches /projects/:id/project-management, /projects/:id/test-cases, /projects/:id/releases, /projects/:id/defects
    return /^\/projects\/[^/]+\/(project-management|test-cases|releases|defects)/.test(location.pathname);
  }, [location.pathname]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-6 py-4 shadow-sm z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">DT</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  DefectTracker Pro
                </h1>
                <p className="text-xs text-gray-500">Project Management Suite</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Quick Add Components (only on subpages) */}
            {showQuickAdd && (
              <>
                <div className="flex items-center">
                  <QuickAddDefect
                    projectModules={selectedProjectId ? (modulesByProject[selectedProjectId] || []) : []}
                    renderButton={({ onClick, disabled }) => (
                      <Button
                        onClick={onClick}
                        disabled={disabled}
                        variant="primary"
                        size="sm"
                        className="rounded-xl flex items-center mr-2"
                      >
                        {/* Icon from QuickAddDefect */}
                        <span className="mr-2 flex items-center">{/* icon will be rendered by QuickAddDefect */}</span>
                        Add Defect
                      </Button>
                    )}
                  />
                </div>
                <div className="flex items-center">
                  <QuickAddTestCase
                    selectedProjectId={selectedProjectId || ''}
                    renderButton={({ onClick, disabled }) => (
                      <Button
                        onClick={onClick}
                        disabled={disabled}
                        variant="primary"
                        size="sm"
                        className="rounded-xl flex items-center mr-2"
                      >
                        {/* Icon from QuickAddTestCase */}
                        <span className="mr-2 flex items-center">{/* icon will be rendered by QuickAddTestCase */}</span>
                        Add Test Case
                      </Button>
                    )}
                  />
                </div>
              </>
            )}
            {/* Notification Bell */}
            <Button variant="ghost" size="sm" className="p-2.5 rounded-xl relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </Button>

            <Button variant="ghost" size="sm" className="p-2.5 rounded-xl">
              <Settings className="w-5 h-5" />
            </Button>

            <div className="flex items-center space-x-3">
              <div
                className="flex items-center space-x-3 px-4 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 cursor-pointer"
                onClick={() => setShowUserDrawer(true)}
                title="View user details"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">{user?.username}</p>
                  {/* <p className="text-xs text-gray-500 capitalize">{user?.role}</p> */}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="p-2.5 rounded-xl text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* User Details Drawer (right to left) */}
      {showUserDrawer && (
        <UserDetailsDrawer user={user} onClose={() => setShowUserDrawer(false)} />
      )}
    </>
  );
};