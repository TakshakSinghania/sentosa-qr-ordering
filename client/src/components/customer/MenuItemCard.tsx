import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { MenuItem } from '../../types/index.js';
import { VegBadge } from '../common/VegBadge.js';

interface MenuItemCardProps {
  item: MenuItem;
  currencySymbol: string;
  cartQuantity: number;
  onOpenDetail: (item: MenuItem) => void;
  onQuickAdd: (item: MenuItem) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  isRestaurantOpen: boolean;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  currencySymbol,
  cartQuantity,
  onOpenDetail,
  onQuickAdd,
  onUpdateQuantity,
  isRestaurantOpen,
}) => {
  const canOrder = isRestaurantOpen && item.isAvailable;
  const hasCustomizations = Boolean(item.customizationGroups && item.customizationGroups.length > 0);

  return (
    <article
      onClick={() => onOpenDetail(item)}
      className={`group relative bg-white rounded-2xl p-4 border border-[#bdb8ad]/60 shadow-card transition-all hover:border-[#6492b3]/60 cursor-pointer flex gap-3.5 items-start active:scale-[0.99] touch-press ${
        !item.isAvailable ? 'opacity-65 bg-[#ebeae7]/60' : ''
      }`}
    >
      {/* Left Details: Editorial Layout */}
      <div className="flex-1 flex flex-col justify-between min-h-[100px]">
        <div>
          {/* Top Line: Dietary + Dish Title */}
          <div className="flex items-baseline gap-2">
            <VegBadge isVeg={item.isVeg} size="sm" className="mt-0.5 flex-shrink-0" />
            <h3 className="font-sans font-semibold text-[#3a3530] text-sm md:text-base leading-snug tracking-heading group-hover:text-[#4f7897] transition-colors">
              {item.name}
            </h3>
          </div>

          {/* Description */}
          <p className="text-xs text-[#5b554f] mt-1.5 line-clamp-2 leading-relaxed font-light">
            {item.description}
          </p>
        </div>

        {/* Bottom Line: Price & Status */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm md:text-base font-bold text-[#3a3530] tracking-tight">
              {currencySymbol}{item.price.toFixed(0)}
            </span>
            {hasCustomizations && item.isAvailable && (
              <span className="text-[11px] text-[#4f7897] bg-[#e8eff4] border border-[#6492b3]/30 px-2 py-0.5 rounded-md font-medium">
                Customisable
              </span>
            )}
          </div>

          {!item.isAvailable && (
            <span className="text-[10px] font-semibold text-[#8d7d6d] bg-[#f4f3f0] px-2 py-0.5 rounded">
              Sold out
            </span>
          )}
        </div>
      </div>

      {/* Right Thumbnail & Action Control */}
      <div className="relative w-20 h-20 md:w-24 md:h-24 flex-shrink-0 self-center sm:self-start">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className={`w-full h-full object-cover rounded-xl border border-[#bdb8ad]/60 ${
              !item.isAvailable ? 'grayscale contrast-75' : ''
            }`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full rounded-xl bg-[#f4f3f0] border border-[#bdb8ad]/60 flex items-center justify-center text-[#8d7d6d] text-[10px]">
            No photo
          </div>
        )}

        {/* Micro-Control with Tactile Touch Targets (>=40px hit area) */}
        <div
          className="absolute -bottom-3 right-1/2 translate-x-1/2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {!canOrder ? (
            <div className="px-3 py-1.5 text-[10px] font-semibold text-[#8d7d6d] bg-[#f4f3f0] border border-[#bdb8ad]/80 rounded-lg shadow-2xs select-none whitespace-nowrap">
              Unavailable
            </div>
          ) : cartQuantity > 0 ? (
            <div className="flex items-center bg-white/95 backdrop-blur-md border border-[#6492b3] text-[#3a3530] rounded-xl p-0.5 shadow-md">
              <button
                type="button"
                onClick={() => onUpdateQuantity(item.id, cartQuantity - 1)}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-[#3a3530] hover:bg-[#e8eff4] active:scale-90 transition-transform font-black"
                title="Decrease quantity"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5 text-[#3a3530] stroke-[3]" />
              </button>
              <span className="w-6 text-center font-bold text-xs text-[#3a3530] select-none">
                {cartQuantity}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (hasCustomizations) {
                    onOpenDetail(item);
                  } else {
                    onUpdateQuantity(item.id, cartQuantity + 1);
                  }
                }}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-[#3a3530] hover:bg-[#e8eff4] active:scale-90 transition-transform font-black"
                title={hasCustomizations ? 'Customize another variant' : 'Increase quantity'}
                aria-label={hasCustomizations ? 'Customize another variant' : 'Increase quantity'}
              >
                <Plus className="w-3.5 h-3.5 text-[#3a3530] stroke-[3]" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (hasCustomizations) {
                  onOpenDetail(item);
                } else {
                  onQuickAdd(item);
                }
              }}
              className="btn-glass-secondary border-[#bdb8ad] px-4 py-2 min-h-[38px] min-w-[76px] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs hover:border-[#6492b3] active:scale-[0.96] transition-all text-[#3a3530] select-none"
            >
              <Plus className="w-3.5 h-3.5 text-[#6492b3] stroke-[3]" />
              <span className="text-[#3a3530] font-bold">
                {hasCustomizations ? 'Customise' : 'Add'}
              </span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
};


