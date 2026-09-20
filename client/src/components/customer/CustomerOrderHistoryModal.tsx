import React, { useState, useEffect } from 'react';
import { X, Coffee, Receipt, Clock, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { CustomerOrderRecord } from '../../types/index.js';
import { api } from '../../services/api.js';

interface CustomerOrderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrder: (orderToken: string) => void;
  onOrderMore?: () => void;
}

export const CustomerOrderHistoryModal: React.FC<CustomerOrderHistoryModalProps> = ({
  isOpen,
  onClose,
  onSelectOrder,
  onOrderMore,
}) => {
  const [orders, setOrders] = useState<CustomerOrderRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const data = await api.getCustomerOrders();
      setOrders(data);
    } catch (err: any) {
      setError('Unable to load your order history. Please verify your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOrders();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            Confirmed
          </span>
        );
      case 'PREPARING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Preparing
          </span>
        );
      case 'READY':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            Ready
          </span>
        );
      case 'SERVED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#f4f3f0] text-[#5b554f] border border-[#bdb8ad]">
            Served
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-50 text-gray-700 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative w-full max-w-lg max-h-[90vh] bg-[#ebeae7] paper-canvas rounded-2xl sm:rounded-3xl border border-[#bdb8ad]/80 shadow-2xl flex flex-col z-10 animate-scaleUp overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Masthead Header */}
        <div className="px-5 py-4 border-b border-[#bdb8ad]/60 bg-white/80 backdrop-blur-md flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#e8eff4] border border-[#6492b3]/30 text-[#4f7897] flex items-center justify-center shadow-2xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-sans text-base sm:text-lg font-bold text-[#3a3530] leading-tight">
                Order History
              </h3>
              <p className="text-[11px] text-[#8d7d6d]">Sentosa — The Coffee Unit</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fetchOrders(true)}
              disabled={loading || refreshing}
              className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-[#5b554f] border border-[#bdb8ad]/60 flex items-center justify-center transition-all active:scale-95"
              title="Refresh orders"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#6492b3]' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-[#5b554f] border border-[#bdb8ad]/60 flex items-center justify-center transition-all active:scale-95"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Order List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 min-h-0">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-6 h-6 text-[#6492b3] animate-spin mb-2" />
              <p className="text-xs text-[#5b554f]">Retrieving your orders...</p>
            </div>
          ) : error ? (
            <div className="py-8 px-4 text-center">
              <p className="text-xs text-rose-700 mb-3">{error}</p>
              <button
                type="button"
                onClick={() => fetchOrders(false)}
                className="btn-glass-secondary border-[#bdb8ad] text-xs py-2 px-4 rounded-xl"
              >
                Try Again
              </button>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-white border border-[#bdb8ad]/60 flex items-center justify-center text-[#8d7d6d] mb-3 shadow-2xs">
                <Coffee className="w-7 h-7 stroke-[1.5]" />
              </div>
              <h4 className="font-sans text-base font-bold text-[#3a3530] mb-1">No orders yet</h4>
              <p className="text-xs text-[#8d7d6d] max-w-xs mb-5 font-light">
                Orders placed from your table will be stored here so you can track live barista preparations and view itemized receipts.
              </p>
              {onOrderMore && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOrderMore();
                  }}
                  className="touch-press btn-primary text-xs font-semibold py-2.5 px-5 rounded-xl text-white shadow-2xs"
                >
                  Browse Menu
                </button>
              )}
            </div>
          ) : (
            orders.map((order) => {
              const isActive = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(order.status);
              const currencySymbol = order.restaurant?.currencySymbol || '₹';
              const formattedDate = new Date(order.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              });
              const formattedTime = new Date(order.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all ${
                    isActive
                      ? 'border-[#6492b3]/60 shadow-lift'
                      : 'border-[#bdb8ad]/60 shadow-2xs hover:border-[#bdb8ad]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-sans text-sm font-bold text-[#3a3530]">
                          Order #{order.orderNumber}
                        </span>
                        <span className="text-xs font-semibold text-[#8d7d6d] bg-[#f4f3f0] px-2 py-0.5 rounded border border-[#bdb8ad]/50">
                          Table {order.tableNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-[#8d7d6d] mt-1 font-light">
                        <Clock className="w-3 h-3 text-[#8d7d6d]" />
                        <span>{formattedDate} at {formattedTime}</span>
                      </div>
                    </div>

                    <div>{getStatusBadge(order.status)}</div>
                  </div>

                  {/* Items summary */}
                  <div className="py-2 border-t border-b border-[#bdb8ad]/30 space-y-1 my-2.5 text-xs text-[#5b554f]">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-start">
                        <div className="flex-1 pr-2">
                          <span className="font-medium text-[#3a3530]">{item.name}</span>
                          <span className="text-[#8d7d6d] ml-1">× {item.quantity}</span>
                          {item.customizations && item.customizations.length > 0 && (
                            <div className="text-[10px] text-[#8d7d6d] pl-2">
                              {item.customizations.map((c) => c.optionName).join(', ')}
                            </div>
                          )}
                        </div>
                        <span className="font-mono text-xs text-[#3a3530]">
                          {currencySymbol}{item.itemTotal.toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Total & Action Button */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-[11px] text-[#8d7d6d]">Total Paid: </span>
                      <span className="font-mono text-sm font-bold text-[#3a3530]">
                        {currencySymbol}{order.totalAmount.toFixed(2)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectOrder(order.orderToken);
                      }}
                      className={`touch-press text-xs font-semibold py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition-all ${
                        isActive
                          ? 'btn-primary text-white shadow-2xs'
                          : 'btn-glass-secondary border-[#bdb8ad] text-[#5b554f] hover:text-[#3a3530]'
                      }`}
                    >
                      <span>{isActive ? 'Track Live' : 'View Status'}</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
