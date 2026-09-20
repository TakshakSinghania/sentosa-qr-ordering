import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Coffee, AlertCircle, Bell, User, Receipt, LogOut } from 'lucide-react';
import { RestaurantInfo, MenuCategory } from '../../types/index.js';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext.js';

interface MenuHeaderProps {
  restaurant: RestaurantInfo;
  tableNumber: string;
  categories: MenuCategory[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  vegOnly: boolean;
  onToggleVegOnly: () => void;
  onCallWaiterClick?: () => void;
  waiterStatus?: 'PENDING' | 'ACKNOWLEDGED' | null;
  onOpenAuthModal?: () => void;
  onOpenOrderHistory?: () => void;
}

export const MenuHeader: React.FC<MenuHeaderProps> = ({
  restaurant,
  tableNumber,
  categories,
  activeCategoryId,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  vegOnly,
  onToggleVegOnly,
  onCallWaiterClick,
  waiterStatus,
  onOpenAuthModal,
  onOpenOrderHistory,
}) => {
  const { customer, activeOrdersCount, logout } = useCustomerAuth();
  const [accountMenuOpen, setAccountMenuOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    if (accountMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [accountMenuOpen]);

  return (
    <header className="sticky top-0 z-30 bg-[#ebeae7]/95 backdrop-blur-xl border-b border-[#bdb8ad]/60 transition-all">
      {/* Closed Café Notification */}
      {!restaurant.isOpen && (
        <div className="bg-[#3a3530] text-[#ebeae7] px-4 py-2 text-xs font-medium flex items-center justify-center gap-2 border-b border-[#5b554f]">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>Kitchen is currently closed. Browsing menu only.</span>
        </div>
      )}

      {/* Masthead & Table Indicator */}
      <div className="max-w-3xl mx-auto px-4 sm:px-5 pt-3.5 pb-2.5 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {restaurant.logoUrl ? (
            <img
              src={restaurant.logoUrl}
              alt={restaurant.name}
              className="w-10 h-10 rounded-full object-cover border border-[#bdb8ad] flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#e8eff4] border border-[#6492b3]/40 flex items-center justify-center text-[#4f7897] flex-shrink-0 shadow-2xs">
              <Coffee className="w-5 h-5 stroke-[2]" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5 truncate">
              <h1 className="font-sans text-base sm:text-lg font-bold text-[#3a3530] tracking-tight leading-tight">
                {restaurant.name && restaurant.name !== 'Demo Café' ? restaurant.name : 'Sentosa'}
              </h1>
              <span className="text-[10px] tracking-wider text-[#8d7d6d] font-semibold uppercase">
                The Coffee Unit
              </span>
            </div>
            <p className="text-[11px] text-[#8d7d6d] font-normal truncate">
              Warm, soft & a little unexpected
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {onCallWaiterClick && (
            <button
              type="button"
              onClick={onCallWaiterClick}
              disabled={waiterStatus === 'PENDING' || waiterStatus === 'ACKNOWLEDGED'}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[36px] rounded-full text-xs transition-all active:scale-[0.97] ${
                waiterStatus === 'PENDING'
                  ? 'bg-amber-100/90 text-amber-950 border border-amber-300 font-semibold cursor-default shadow-2xs'
                  : waiterStatus === 'ACKNOWLEDGED'
                  ? 'bg-emerald-100/90 text-emerald-950 border border-emerald-300 font-semibold cursor-default shadow-2xs'
                  : 'btn-glass-secondary border-[#bdb8ad] hover:border-[#6492b3] text-[#5b554f] font-semibold shadow-2xs'
              }`}
            >
              <Bell className={`w-3.5 h-3.5 ${
                waiterStatus === 'PENDING'
                  ? 'text-amber-800 animate-pulse'
                  : waiterStatus === 'ACKNOWLEDGED'
                  ? 'text-emerald-800'
                  : 'text-[#6492b3]'
              }`} />
              <span className="font-semibold hidden xs:inline sm:inline">
                {waiterStatus === 'PENDING'
                  ? 'Called'
                  : waiterStatus === 'ACKNOWLEDGED'
                  ? 'On way'
                  : 'Call'}
              </span>
            </button>
          )}

          {/* Customer Account Pill */}
          {customer ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                className="glass-pill border-[#bdb8ad] hover:border-[#6492b3] text-[#3a3530] flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[36px] rounded-full text-xs font-semibold shadow-2xs transition-all active:scale-95"
              >
                <User className="w-3.5 h-3.5 text-[#6492b3]" />
                <span className="max-w-[65px] sm:max-w-[90px] truncate">{customer.name.split(' ')[0]}</span>
                {activeOrdersCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white/95 backdrop-blur-xl rounded-2xl border border-[#bdb8ad]/80 shadow-xl p-2 z-50 animate-scaleUp">
                  <div className="px-3 py-2 border-b border-[#bdb8ad]/40 mb-1">
                    <p className="text-xs font-bold text-[#3a3530] truncate">{customer.name}</p>
                    <p className="text-[11px] text-[#8d7d6d] truncate">{customer.phone || customer.email || ''}</p>
                  </div>

                  {activeOrdersCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onOpenOrderHistory?.();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-blue-900 bg-blue-50/80 hover:bg-blue-100 flex items-center justify-between transition-colors mb-1"
                    >
                      <span>Active Orders</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#6492b3] text-white font-bold">
                        {activeOrdersCount}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      onOpenOrderHistory?.();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[#3a3530] hover:bg-[#f4f3f0] flex items-center gap-2 transition-colors"
                  >
                    <Receipt className="w-3.5 h-3.5 text-[#6492b3]" />
                    <span>Order History</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-rose-700 hover:bg-rose-50 flex items-center gap-2 transition-colors mt-1"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="btn-glass-secondary border-[#bdb8ad] hover:border-[#6492b3] text-[#5b554f] hover:text-[#3a3530] flex items-center gap-1 px-2.5 sm:px-3 py-1.5 min-h-[36px] rounded-full text-xs font-semibold shadow-2xs transition-all active:scale-95"
            >
              <User className="w-3.5 h-3.5 text-[#6492b3]" />
              <span>Sign in</span>
            </button>
          )}

          {/* Table Badge */}
          <div className="glass-pill flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[36px] rounded-full text-xs font-bold text-[#3a3530] border-[#bdb8ad]">
            <span className="w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-emerald-600/20" />
            <span>Table {tableNumber}</span>
          </div>
        </div>
      </div>

      {/* Search & Dietary Filter */}
      <div className="max-w-3xl mx-auto px-4 sm:px-5 pb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8d7d6d] pointer-events-none" />
          <input
            type="text"
            placeholder="Search coffee, drinks, dishes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-10 py-2.5 min-h-[44px] bg-white/80 hover:bg-white focus:bg-white text-base sm:text-xs text-[#3a3530] placeholder-[#8d7d6d] rounded-xl border border-[#bdb8ad]/80 focus:border-[#6492b3] outline-none transition-colors shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-[#8d7d6d] hover:text-[#3a3530] min-w-[40px] min-h-[40px] flex items-center justify-center touch-target"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Veg Only Filter Button */}
        <button
          onClick={onToggleVegOnly}
          className={`flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] text-xs font-medium rounded-xl border transition-all active:scale-[0.97] select-none ${
            vegOnly
              ? 'bg-emerald-50 border-emerald-700/60 text-emerald-950 font-semibold shadow-2xs'
              : 'bg-white border-[#bdb8ad] text-[#5b554f] hover:bg-[#f4f3f0] shadow-2xs'
          }`}
        >
          <span className="w-3 h-3 rounded-sm border border-emerald-700 flex items-center justify-center p-[1px] bg-white">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
          </span>
          <span>Veg only</span>
        </button>
      </div>

      {/* Category Tab Bar with Smooth Scrolling */}
      <div className="max-w-3xl mx-auto px-4 sm:px-5 overflow-x-auto no-scrollbar touch-pan-x flex items-center gap-5 border-t border-[#bdb8ad]/50">
        <button
          onClick={() => onSelectCategory('all')}
          className={`py-2.5 text-xs whitespace-nowrap transition-all border-b-2 font-medium active:scale-[0.98] ${
            activeCategoryId === 'all'
              ? 'border-[#6492b3] text-[#3a3530] font-bold'
              : 'border-transparent text-[#5b554f] hover:text-[#3a3530]'
          }`}
        >
          All dishes
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`py-2.5 text-xs whitespace-nowrap transition-all border-b-2 flex items-center gap-1.5 font-medium active:scale-[0.98] ${
              activeCategoryId === cat.id
                ? 'border-[#6492b3] text-[#3a3530] font-bold'
                : 'border-transparent text-[#5b554f] hover:text-[#3a3530]'
            }`}
          >
            <span>{cat.name}</span>
            <span className={`text-[11px] font-normal ${activeCategoryId === cat.id ? 'text-[#6492b3] font-semibold' : 'text-[#8d7d6d]'}`}>
              {cat.items.length}
            </span>
          </button>
        ))}
      </div>
    </header>
  );
};

