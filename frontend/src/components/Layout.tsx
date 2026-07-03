import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/index.js';
import { toggleTheme, toggleSidebar } from '../store/uiSlice.js';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Layers,
  Users,
  Truck,
  ClipboardList,
  Receipt,
  UsersRound,
  FileBarChart2,
  Sparkles,
  Settings as SettingsIcon,
  LogOut,
  Sun,
  Moon,
  Menu,
  Clock,
} from 'lucide-react';
import api from '../services/api.js';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  const theme = useSelector((state: RootState) => state.ui.theme);
  const sidebarOpen = useSelector((state: RootState) => state.ui.sidebarOpen);

  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : { name: 'Employee', role: 'CASHIER' };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { name: 'POS Terminal', path: '/pos', icon: ShoppingCart, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { name: 'Products', path: '/products', icon: Package, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { name: 'Inventory & Stock', path: '/inventory', icon: Layers, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Customers', path: '/customers', icon: Users, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { name: 'Suppliers', path: '/suppliers', icon: Truck, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Purchase Orders', path: '/purchases', icon: ClipboardList, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Expense Log', path: '/expenses', icon: Receipt, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Employees & HR', path: '/employees', icon: UsersRound, roles: ['ADMIN', 'MANAGER'] },
    { name: 'Reports Panel', path: '/reports', icon: FileBarChart2, roles: ['ADMIN', 'MANAGER'] },
    { name: 'AI & Insights', path: '/ai', icon: Sparkles, roles: ['ADMIN', 'MANAGER'] },
    { name: 'System Settings', path: '/settings', icon: SettingsIcon, roles: ['ADMIN'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-dark-950">
      {/* Sidebar navigation panel */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } transition-all duration-300 ease-in-out bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 flex flex-col z-20`}
      >
        {/* Sidebar Header Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="p-2 rounded-lg bg-brand-500 text-white flex-shrink-0 animate-pulse">
              <ShoppingCart size={20} />
            </div>
            {sidebarOpen && (
              <span className="font-bold text-lg text-gray-800 dark:text-gray-100 tracking-tight whitespace-nowrap">
                PalMart <span className="text-brand-500">Pro</span>
              </span>
            )}
          </div>
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto scrollbar-thin">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <Icon size={20} className="flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer User detail */}
        <div className="p-4 border-t border-gray-200 dark:border-zinc-800 flex flex-col gap-2">
          {sidebarOpen && (
            <div className="px-2 py-1.5 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800">
              <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold tracking-wider uppercase">Logged In As</p>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{user.name}</p>
              <p className="text-xs text-brand-600 dark:text-brand-400 font-bold">{user.role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200"
          >
            <LogOut size={20} className="flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Log out</span>}
          </button>
        </div>
      </aside>

      {/* Main Panel Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header navbar */}
        <header className="h-16 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              System Live Mode
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick clock display */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-xs font-semibold text-gray-500 dark:text-gray-400">
              <Clock size={14} />
              {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
            </div>

            {/* Light/Dark Toggle */}
            <button
              onClick={() => dispatch(toggleTheme())}
              className="p-2 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700 hover-scale"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* Pages Container */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-dark-950">
          {children}
        </main>
      </div>
    </div>
  );
}
