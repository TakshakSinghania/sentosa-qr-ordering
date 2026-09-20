import React from 'react';
import { Plus } from 'lucide-react';
import { MenuItem } from '../../types/index.js';
import { VegBadge } from '../common/VegBadge.js';

interface TableFavoritesSectionProps {
  items: MenuItem[];
  currencySymbol: string;
  cartQuantityMap: Map<string, number>;
  onOpenDetail: (item: MenuItem) => void;
  onQuickAdd: (item: MenuItem) => void;
  isRestaurantOpen: boolean;
}

export const TableFavoritesSection: React.FC<TableFavoritesSectionProps> = ({
  items,
  currencySymbol,
  cartQuantityMap,
  onOpenDetail,
  onQuickAdd,
  isRestaurantOpen,
}) => {
  // If fewer than threshold, disabled, or no recommendations, naturally omit entirely
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Table favorites"
      className="mb-6 pb-5 border-b border-[#bdb8ad]/50"
    >
      {/* Editorial Header */}
      <div className="mb-3">
        <h2 className="font-sans text-sm md:text-base font-bold text-[#3a3530] tracking-tight">
          Guests here often order…
        </h2>
        <p className="text-[11px] md:text-xs text-[#8d7d6d] mt-0.5 font-normal tracking-wide">
          A few favorites from this table.
        </p>
      </div>

      {/* Responsive Grid: 1 col on mobile, 3 cols on sm/desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {items.map((item) => {
          const qty = cartQuantityMap.get(item.id) || 0;
          const hasCustomizations = Boolean(
            item.customizationGroups && item.customizationGroups.length > 0
          );
          const canOrder = isRestaurantOpen && item.isAvailable;

          const handleActionClick = () => {
            if (!canOrder) return;
            if (hasCustomizations) {
              onOpenDetail(item);
            } else {
              onQuickAdd(item);
            }
          };

          return (
            <article
              key={item.id}
              onClick={() => onOpenDetail(item)}
              className="group bg-white/90 hover:bg-white rounded-xl p-3 border border-[#bdb8ad]/60 hover:border-[#6492b3]/60 transition-all cursor-pointer flex sm:flex-col justify-between items-center sm:items-start gap-3 active:scale-[0.99] touch-press shadow-2xs"
            >
              {/* Item Info */}
              <div className="flex-1 min-w-0 pr-1 sm:pr-0 w-full">
                <div className="flex items-center gap-1.5 mb-1">
                  <VegBadge isVeg={item.isVeg} size="sm" className="flex-shrink-0" />
                  <span className="font-sans text-xs md:text-sm font-semibold text-[#3a3530] truncate group-hover:text-[#4f7897] transition-colors">
                    {item.name}
                  </span>
                </div>

                {item.description && (
                  <p className="text-[11px] text-[#8d7d6d] line-clamp-1 mb-1 font-light hidden sm:block">
                    {item.description}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-1">
                  <span className="font-sans text-xs md:text-sm font-bold text-[#3a3530]">
                    {currencySymbol}{item.price.toFixed(0)}
                  </span>
                  {hasCustomizations && (
                    <span className="text-[10px] text-[#4f7897] bg-[#e8eff4] px-1.5 py-0.5 rounded font-medium">
                      Customisable
                    </span>
                  )}
                </div>
              </div>

              {/* Action Button / Status (min 44x44px touch target) */}
              <div
                className="flex-shrink-0 flex items-center justify-end min-w-[44px] min-h-[44px] sm:w-full sm:justify-end sm:mt-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleActionClick();
                }}
              >
                {!canOrder ? (
                  <span className="text-[10px] font-medium text-[#8d7d6d] bg-[#f4f3f0] px-2 py-1 rounded">
                    Unavailable
                  </span>
                ) : qty > 0 ? (
                  <button
                    type="button"
                    aria-label={`Open customization for ${item.name} (${qty} added)`}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-[#6492b3] text-white text-[11px] font-bold rounded-lg shadow-xs hover:bg-[#4f7897] transition-colors min-h-[36px]"
                  >
                    <span>{qty} in cart</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label={`Add ${item.name} to order`}
                    className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#f4f3f0] border border-[#bdb8ad]/70 text-[#3a3530] hover:bg-[#6492b3] hover:text-white hover:border-[#6492b3] transition-colors shadow-2xs"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
