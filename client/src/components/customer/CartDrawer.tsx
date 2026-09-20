import React, { useState } from 'react';
import { ShoppingBag, X, Plus, Minus, ArrowRight, Trash2, Edit3 } from 'lucide-react';
import { useCart } from '../../contexts/CartContext.js';
import { VegBadge } from '../common/VegBadge.js';
import { CartItem } from '../../types/index.js';

interface CartDrawerProps {
  currencySymbol: string;
  taxRate: number;
  serviceChargeRate: number;
  onProceedToCheckout: () => void;
  onEditItem?: (item: CartItem) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  currencySymbol,
  taxRate,
  serviceChargeRate,
  onProceedToCheckout,
  onEditItem,
}) => {
  const {
    items,
    totalItemsCount,
    subtotal,
    updateQuantity,
    removeItem,
    clearCart,
    specialNote,
    setSpecialNote,
  } = useCart();

  const [isOpen, setIsOpen] = useState<boolean>(false);

  if (totalItemsCount === 0 && !isOpen) return null;

  const estimatedTax = Number(((subtotal * taxRate) / 100).toFixed(2));
  const estimatedService = Number(((subtotal * serviceChargeRate) / 100).toFixed(2));
  const estimatedTotal = Number((subtotal + estimatedTax + estimatedService).toFixed(2));

  return (
    <>
      {/* 1. Tactile Floating Bottom Bar (visible when items in cart) */}
      {totalItemsCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pb-safe pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="w-full glass-cart-bar rounded-2xl px-5 py-3.5 min-h-[56px] flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer touch-press"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-xl bg-white text-charcoal-950 flex items-center justify-center font-black text-xs shadow-xs">
                  {totalItemsCount}
                </span>
                <div className="text-left">
                  <span className="text-xs font-bold tracking-wide text-white block leading-none">
                    {totalItemsCount === 1 ? '1 dish in order' : `${totalItemsCount} dishes in order`}
                  </span>
                  <span className="text-[11px] text-cream-300/90 font-normal mt-1 block">
                    Tap to review selection
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 font-bold text-sm text-white">
                <span className="font-mono text-base font-bold text-white">
                  {currencySymbol}{subtotal.toFixed(0)}
                </span>
                <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 2. Slide-up Cart Sheet */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-all animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative bg-[#ebeae7] w-full max-w-lg rounded-t-[28px] sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200 border-t sm:border border-[#bdb8ad]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle */}
            <div className="sm:hidden w-10 h-1.5 rounded-full bg-[#bdb8ad]/60 mx-auto mt-2.5 mb-1" />

            {/* Header */}
            <div className="p-4 px-6 border-b border-[#bdb8ad]/60 bg-white/80 backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4 text-[#3a3530]" />
                <h2 className="font-sans text-base font-bold text-[#3a3530] tracking-tight">Your order</h2>
                {totalItemsCount > 0 && (
                  <span className="text-[11px] bg-[#e8eff4] text-[#4f7897] font-bold px-2 py-0.5 rounded-md">
                    {totalItemsCount}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {totalItemsCount > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs text-[#8d7d6d] hover:text-rose-600 font-medium transition-colors px-2.5 py-1.5 rounded-lg hover:bg-[#f4f3f0]"
                  >
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#f4f3f0] text-[#5b554f] hover:bg-[#bdb8ad]/30 flex items-center justify-center transition-all active:scale-95"
                  aria-label="Close cart"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {totalItemsCount === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-center my-4">
                <div className="w-36 h-44 mb-3 flex items-center justify-center">
                  <img
                    src="/brand/illustration-run.png"
                    alt="Sentosa hand-drawn illustration of a person carrying coffee and croissants"
                    className="w-full h-full object-contain mix-blend-multiply opacity-90"
                  />
                </div>
                <h3 className="font-sans text-base font-bold text-[#3a3530]">Your tray is empty</h3>
                <p className="text-xs text-[#8d7d6d] mt-1 max-w-xs leading-relaxed font-light">
                  Find something you’d like to enjoy from our roastery and kitchen.
                </p>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="btn-primary mt-6 px-6 py-2.5 rounded-xl text-xs font-semibold shadow-sm active:scale-95 transition-transform"
                >
                  Browse menu
                </button>
              </div>
            ) : (
              <>
                {/* Cart Items List */}
                <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-4 divide-y divide-[#bdb8ad]/50 no-scrollbar">
              {items.map((cartItem) => (
                <div key={cartItem.cartLineId} className="pt-3.5 first:pt-0 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <VegBadge isVeg={cartItem.isVeg} size="sm" className="flex-shrink-0" />
                      <h4 className="font-semibold text-xs text-[#3a3530] truncate">
                        {cartItem.name}
                      </h4>
                      {onEditItem && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            onEditItem(cartItem);
                          }}
                          className="text-[11px] text-[#4f7897] hover:text-[#3a3530] font-medium flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#e8eff4] border border-[#6492b3]/30 active:scale-95 transition-transform"
                        >
                          <Edit3 className="w-2.5 h-2.5" />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>

                    <div className="text-[11px] text-[#8d7d6d] font-medium mt-0.5">
                      {currencySymbol}{cartItem.price.toFixed(0)} each
                    </div>

                    {/* Customizations summary */}
                    {cartItem.customizations && cartItem.customizations.length > 0 && (
                      <div className="mt-1 space-y-0.5 pl-4">
                        {cartItem.customizations.map((c, idx) => (
                          <div key={idx} className="text-[11px] text-[#5b554f] font-light flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#6492b3]" />
                            <span>
                              {c.groupName}: <strong className="font-semibold text-[#3a3530]">{c.optionName}</strong>
                              {c.priceAddition > 0 ? ` (+${currencySymbol}${c.priceAddition.toFixed(0)})` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {cartItem.specialInstructions && (
                      <p className="text-[11px] text-amber-900 mt-0.5 font-light italic pl-4">
                        ↳ {cartItem.specialInstructions}
                      </p>
                    )}
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center border border-[#bdb8ad] rounded-xl bg-white p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => {
                          if (cartItem.quantity <= 1) {
                            removeItem(cartItem.cartLineId);
                          } else {
                            updateQuantity(cartItem.cartLineId, cartItem.quantity - 1);
                          }
                        }}
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-[#5b554f] hover:text-rose-600 active:scale-90 font-bold transition-all"
                        title={cartItem.quantity === 1 ? 'Remove from order' : 'Decrease'}
                        aria-label={cartItem.quantity === 1 ? 'Remove item' : 'Decrease quantity'}
                      >
                        {cartItem.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-rose-600" /> : <Minus className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </button>

                      <span className="w-6 text-center text-xs font-bold text-[#3a3530] select-none">
                        {cartItem.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(cartItem.cartLineId, cartItem.quantity + 1)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-[#5b554f] hover:text-[#3a3530] active:scale-90 font-bold transition-all"
                        title="Increase"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>

                    <span className="text-xs font-bold text-[#3a3530] min-w-[50px] text-right font-mono">
                      {currencySymbol}{(cartItem.price * cartItem.quantity).toFixed(0)}
                    </span>
                  </div>
                </div>
              ))}

              {/* Order Level Kitchen Note */}
              <div className="pt-3">
                <label className="block text-xs font-semibold text-[#3a3530] mb-1.5">
                  Note for kitchen (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Please bring extra napkins, serve dessert later..."
                  value={specialNote}
                  onChange={(e) => setSpecialNote(e.target.value)}
                  maxLength={100}
                  className="w-full text-base sm:text-xs p-3 bg-white border border-[#bdb8ad]/80 rounded-xl focus:border-[#6492b3] outline-none transition-colors text-[#3a3530] placeholder-[#8d7d6d]"
                />
              </div>

              {/* Price Calculation Breakdown */}
              <div className="pt-3 space-y-1.5 text-xs text-[#5b554f] font-normal">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#3a3530] font-mono">{currencySymbol}{subtotal.toFixed(2)}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between">
                    <span>GST ({taxRate}%)</span>
                    <span className="font-mono">{currencySymbol}{estimatedTax.toFixed(2)}</span>
                  </div>
                )}
                {serviceChargeRate > 0 && (
                  <div className="flex justify-between">
                    <span>Service charge ({serviceChargeRate}%)</span>
                    <span className="font-mono">{currencySymbol}{estimatedService.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-[#3a3530] pt-2.5 border-t border-[#bdb8ad]/60">
                  <span>Estimated total</span>
                  <span className="font-mono text-base text-[#3a3530] font-bold">{currencySymbol}{estimatedTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Bottom Checkout CTA */}
            <div className="p-4 pb-safe bg-white/90 backdrop-blur-md border-t border-[#bdb8ad]/60">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onProceedToCheckout();
                }}
                className="btn-primary w-full py-3.5 px-5 min-h-[48px] rounded-xl flex items-center justify-between text-xs font-bold tracking-wide shadow-md transition-all active:scale-[0.98]"
              >
                <span>Proceed to checkout</span>
                <span className="font-mono text-sm font-bold text-white">{currencySymbol}{estimatedTotal.toFixed(2)}</span>
              </button>
            </div>
            </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
