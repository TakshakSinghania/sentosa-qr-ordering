import React, { useState, useEffect, useRef } from 'react';
import {
  ChefHat,
  History,
  BookOpen,
  QrCode,
  BarChart3,
  Settings,
  LogOut,
  Coffee,
  Users,
  Shield,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';

interface AdminSidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  activeOrdersCount?: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
  activeOrdersCount = 0,
}) => {
  const { user, restaurant, logout, isManager } = useAuth();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  // Keyboard accessibility: Escape closes sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 220); // 220ms graceful delay to prevent accidental flickering
  };

  const handleItemClick = (id: string) => {
    onSelectTab(id);
    // On mobile screens, auto-close the drawer after selection
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  // Staff-accessible operational tabs
  const staffNavItems = [
    { id: 'live-orders', label: 'Live Orders', icon: ChefHat, badge: activeOrdersCount },
    { id: 'order-history', label: 'Order History', icon: History },
    { id: 'menu', label: 'Dish Availability', icon: BookOpen },
  ];

  // Full manager navigation
  const managerNavItems = [
    { id: 'live-orders', label: 'Live Orders', icon: ChefHat, badge: activeOrdersCount },
    { id: 'order-history', label: 'Order History', icon: History },
    { id: 'menu', label: 'Menu & Items', icon: BookOpen },
    { id: 'tables', label: 'Tables & QR Codes', icon: QrCode },
    { id: 'analytics', label: 'Sales Analytics', icon: BarChart3 },
    { id: 'staff', label: 'Staff Management', icon: Users },
    { id: 'settings', label: 'Café Settings', icon: Settings },
  ];

  const navItems = isManager ? managerNavItems : staffNavItems;

  return (
    <>
      {/* 1. Left Edge Sensitive Hover Zone (Desktop) */}
      <div
        className="fixed top-0 left-0 bottom-0 w-5 z-40 hidden sm:block pointer-events-auto"
        onMouseEnter={handleMouseEnter}
        aria-hidden="true"
      />

      {/* 2. Persistent Sentosa Brand Trigger (Visible even when sidebar is collapsed) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        onMouseEnter={handleMouseEnter}
        aria-label={isOpen ? 'Close Sentosa navigation' : 'Open Sentosa navigation'}
        aria-expanded={isOpen}
        title={isOpen ? 'Close menu' : 'Sentosa Menu'}
        className="fixed top-3 left-3 z-50 w-10 h-10 rounded-xl bg-[#3a3530] text-[#6492b3] hover:text-white border border-[#5b554f]/60 shadow-md flex items-center justify-center transition-all active:scale-95 touch-press focus-visible:ring-2 focus-visible:ring-[#6492b3]"
      >
        <Coffee className="w-5 h-5 stroke-[2.2]" />
      </button>

      {/* 3. Subtle Backdrop for touch / click outside (Light on desktop, touch-friendly on mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/25 md:bg-black/5 transition-opacity duration-200"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 4. Sliding Overlay Sidebar */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 max-w-[85vw] bg-[#3a3530] text-[#ebeae7] flex flex-col justify-between p-4 shadow-2xl border-r border-[#5b554f]/50 transition-transform duration-250 ease-out will-change-transform overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Admin Navigation Sidebar"
      >
        <div>
          {/* Café Header & Explicit Close Button */}
          <div className="flex items-center justify-between px-2 py-3.5 mb-3 border-b border-[#5b554f]/40">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-[#e8eff4] flex items-center justify-center text-[#4f7897] shadow-xs flex-shrink-0">
                <Coffee className="w-4 h-4 text-[#6492b3]" />
              </div>
              <div className="overflow-hidden">
                <h2 className="font-sans font-bold text-sm text-white truncate leading-tight">
                  {restaurant?.name && restaurant.name !== 'Demo Café' ? restaurant.name : 'Sentosa'}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${restaurant?.isOpen ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  <span className="text-[11px] text-[#bdb8ad] font-medium">
                    {restaurant?.isOpen ? 'Kitchen active' : 'Store closed'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-lg text-[#bdb8ad] hover:text-white hover:bg-[#5b554f]/50 flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-[#6492b3]"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#6492b3] text-white font-bold shadow-2xs'
                      : 'text-[#bdb8ad] hover:bg-[#5b554f]/60 hover:text-white'
                  } touch-press`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && item.badge > 0 ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#4f7897] text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Info & Logout */}
        <div className="pt-3 border-t border-[#5b554f]/40">
          {/* Role badge */}
          <div className="px-2 py-1.5 mb-2">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
              isManager
                ? 'bg-[#e8eff4]/15 text-[#e8eff4] border border-[#6492b3]/30'
                : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
            }`}>
              {isManager ? <Shield className="w-3.5 h-3.5 text-[#6492b3]" /> : <ChefHat className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isManager ? 'Manager role' : 'Staff operations'}</span>
            </div>
          </div>

          <div className="px-3 py-2 mb-2 bg-[#5b554f]/40 rounded-xl border border-[#5b554f]/30">
            <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
            <p className="text-[11px] text-[#bdb8ad] truncate">{user?.email}</p>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-[#bdb8ad] hover:text-rose-400 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
