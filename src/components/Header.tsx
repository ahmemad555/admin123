import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2, LogOut, User, Shield } from 'lucide-react';

const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">FOTA System</h1>
              <p className="text-sm text-gray-500">Concrete 3D Printing Management</p>
            </div>
          </div>

          {/* User Info and Actions */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <div className="flex items-center space-x-1">
                {user?.role === 'admin' ? (
                  <Shield className="w-4 h-4 text-orange-500" />
                ) : (
                  <User className="w-4 h-4 text-gray-500" />
                )}
                <span className="font-medium">{user?.username}</span>
              </div>
              <span className="text-gray-400">•</span>
              <span className="capitalize text-gray-600">{user?.role}</span>
            </div>
            
            <button
              onClick={logout}
              className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;