import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FileJson } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Entities', href: '/entities', icon: FileJson },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-md h-screen fixed">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-800">JsonMapper</h1>
          </div>
          <nav className="mt-6">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href ||
                (item.href !== '/' && location.pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    flex items-center px-6 py-3 text-sm font-medium
                    ${isActive
                      ? 'text-blue-600 bg-blue-50 border-r-2 border-blue-600'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Main content */}
        <div className="ml-64 flex-1">
          <main className="p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
