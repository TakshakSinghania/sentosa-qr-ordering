import React from 'react';
import { OrderRecord } from '../../types/index.js';
import { ChefHat, BellRing, Utensils, Clock, MessageSquare, XCircle } from 'lucide-react';

interface OrderCardProps {
  order: OrderRecord;
  currencySymbol: string;
  onUpdateStatus: (orderId: string, nextStatus: string) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  currencySymbol,
  onUpdateStatus,
}) => {
  const isPaid = order.paymentStatus === 'COMPLETED';
  const tableNum = order.table?.tableNumber || order.tableNumber || '??';

  const getStatusBadge = () => {
    switch (order.status) {
      case 'CONFIRMED':
        return <span className="bg-amber-100 text-amber-950 border border-amber-300 text-[11px] px-2.5 py-0.5 rounded-md font-semibold">New order</span>;
      case 'PREPARING':
        return <span className="bg-blue-100 text-blue-950 border border-blue-300 text-[11px] px-2.5 py-0.5 rounded-md font-semibold">In kitchen</span>;
      case 'READY':
        return <span className="bg-emerald-100 text-emerald-950 border border-emerald-300 text-[11px] px-2.5 py-0.5 rounded-md font-semibold">Ready for pickup</span>;
      case 'SERVED':
        return <span className="bg-cream-200 text-charcoal-800 text-[11px] px-2.5 py-0.5 rounded-md font-semibold">Served</span>;
      case 'CANCELLED':
        return <span className="bg-rose-100 text-rose-900 text-[11px] px-2.5 py-0.5 rounded-md font-semibold">Cancelled</span>;
      default:
        return <span className="bg-cream-200 text-charcoal-800 text-[11px] px-2.5 py-0.5 rounded-md font-semibold">{order.status}</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#bdb8ad]/60 shadow-subtle p-4 sm:p-5 flex flex-col justify-between hover:border-[#6492b3]/60 transition-colors">
      <div>
        {/* Ticket Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-[#3a3530] font-sans tracking-tight">
                #{order.orderNumber}
              </span>
              <span className="bg-[#3a3530] text-white font-semibold text-xs px-2.5 py-0.5 rounded-lg tracking-wide shadow-2xs">
                Table {tableNum}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#8d7d6d] mt-1 font-medium">
              <Clock className="w-3 h-3 text-[#8d7d6d]" />
              <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {order.customerName && <span className="text-[#5b554f] font-medium">, {order.customerName}</span>}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            {getStatusBadge()}
            {isPaid ? (
              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Paid online ✓
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                Payment pending
              </span>
            )}
          </div>
        </div>

        {/* Customer Kitchen Instructions */}
        {order.customerNote && (
          <div className="bg-[#f4f3f0] border border-[#bdb8ad]/60 text-[#3a3530] text-xs p-2.5 rounded-xl mb-3 flex items-start gap-2">
            <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[#6492b3]" />
            <div className="font-medium text-[11px] leading-relaxed">
              <span className="font-semibold text-[#3a3530]">Customer note: </span>
              {order.customerNote}
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="divide-y divide-[#bdb8ad]/40 border-t border-b border-[#bdb8ad]/60 my-3 py-1">
          {order.items.map((item) => {
            const displayName = item.name || (item as any).nameSnapshot || 'Special Item';
            const lineTotal = item.itemTotal ?? ((item.price || (item as any).priceSnapshot || 0) * item.quantity);

            return (
              <div key={item.id} className="py-2.5 flex items-start justify-between gap-2 text-xs">
                <div className="flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-bold text-[#3a3530] font-mono text-sm">{item.quantity}×</span>
                    <span className="font-semibold text-[#3a3530] text-xs sm:text-sm">{displayName}</span>
                  </div>

                  {/* Customizations */}
                  {item.customizations && item.customizations.length > 0 && (
                    <div className="mt-1 space-y-0.5 pl-4">
                      {item.customizations.map((c, idx) => (
                        <div key={idx} className="text-[11px] text-[#5b554f] font-medium flex items-center gap-1.5">
                          <span className="text-[#6492b3] font-bold">↳</span>
                          <span>
                            {c.groupName}: <strong className="font-semibold text-[#3a3530]">{c.optionName}</strong>
                            {c.priceAddition > 0 ? ` (+${currencySymbol}${c.priceAddition.toFixed(0)})` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {item.specialInstructions && (
                    <p className="text-[11px] text-amber-900 font-medium italic mt-0.5 pl-4">
                      ↳ Note: {item.specialInstructions}
                    </p>
                  )}
                </div>
                <span className="text-xs font-semibold text-[#3a3530] whitespace-nowrap font-mono pt-0.5">
                  {currencySymbol}{lineTotal.toFixed(0)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Total */}
        <div className="flex justify-between items-center text-xs font-semibold text-[#3a3530] mb-3">
          <span className="text-[#8d7d6d] font-medium">Bill total</span>
          <span className="text-sm font-sans font-bold">{currencySymbol}{order.totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Action Transition Buttons */}
      <div className="pt-2 border-t border-[#bdb8ad]/60 flex items-center gap-2">
        {order.status === 'CONFIRMED' || order.status === 'PENDING' ? (
          <>
            <button
              type="button"
              onClick={() => onUpdateStatus(order.id, 'PREPARING')}
              className="touch-press btn-primary flex-1 min-h-[40px] py-2 px-3.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold shadow-2xs"
            >
              <ChefHat className="w-3.5 h-3.5 text-white" />
              <span>Start preparing</span>
            </button>
            <button
              type="button"
              onClick={() => onUpdateStatus(order.id, 'CANCELLED')}
              className="touch-press w-10 h-10 flex items-center justify-center text-[#8d7d6d] hover:text-rose-600 rounded-xl transition-colors border border-transparent hover:border-[#bdb8ad]/60"
              title="Cancel order"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </>
        ) : order.status === 'PREPARING' ? (
          <button
            type="button"
            onClick={() => onUpdateStatus(order.id, 'READY')}
            className="touch-press btn-primary w-full min-h-[40px] py-2 px-3.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold shadow-2xs"
          >
            <BellRing className="w-3.5 h-3.5 text-white" />
            <span>Mark ready for pickup</span>
          </button>
        ) : order.status === 'READY' ? (
          <button
            type="button"
            onClick={() => onUpdateStatus(order.id, 'SERVED')}
            className="touch-press btn-outline border-[#bdb8ad] hover:border-[#6492b3] w-full min-h-[40px] py-2 px-3.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors text-[#3a3530]"
          >
            <Utensils className="w-3.5 h-3.5 text-[#3a3530]" />
            <span>Mark as served</span>
          </button>
        ) : (
          <div className="w-full py-2 text-center text-xs text-[#8d7d6d] font-medium">
            Order fulfilled
          </div>
        )}
      </div>
    </div>
  );
};
