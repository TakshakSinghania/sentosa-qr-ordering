import React, { useEffect, useState } from 'react';
import { OrderRecord } from '../../types/index.js';
import { api } from '../../services/api.js';
import { getSocket } from '../../services/socket.js';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext.js';
import { CustomerOrderHistoryModal } from '../../components/customer/CustomerOrderHistoryModal.js';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  ChefHat,
  BellRing,
  Utensils,
  PlusCircle,
  Loader2,
  Receipt,
  XCircle,
  ArrowLeft,
} from 'lucide-react';

interface OrderTrackingPageProps {
  orderToken: string;
  onOrderMore: (restaurantSlug: string, tableToken?: string) => void;
  onNavigateToOrder?: (orderToken: string) => void;
}

const STATUS_STEPS = [
  { key: 'CONFIRMED', label: 'Order Confirmed', icon: CheckCircle2, desc: 'Payment received by kitchen' },
  { key: 'PREPARING', label: 'Preparing', icon: ChefHat, desc: 'Chefs are cooking your food' },
  { key: 'READY', label: 'Ready for Service', icon: BellRing, desc: 'Plated & ready at the counter' },
  { key: 'SERVED', label: 'Served', icon: Utensils, desc: 'Delivered to your table' },
];

export const OrderTrackingPage: React.FC<OrderTrackingPageProps> = ({
  orderToken,
  onOrderMore,
  onNavigateToOrder,
}) => {
  const { activeOrdersCount } = useCustomerAuth();
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  const fetchOrder = async () => {
    try {
      const data = await api.getOrderStatus(orderToken);
      setOrder(data);
    } catch (err: any) {
      setError('Unable to load order status. Please ask staff for assistance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#6492b3', '#5b554f', '#bdb8ad', '#8d7d6d'],
      });
    } catch {
      // Ignore confetti errors
    }

    const socket = getSocket();
    socket.emit('join:order', orderToken);

    const handleStatusUpdate = (updatedData: any) => {
      if (updatedData.orderToken === orderToken) {
        setOrder((prev) => (prev ? { ...prev, status: updatedData.status } : null));
      }
    };

    socket.on('order:status_updated', handleStatusUpdate);
    const interval = setInterval(fetchOrder, 6000);

    return () => {
      socket.off('order:status_updated', handleStatusUpdate);
      clearInterval(interval);
    };
  }, [orderToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ebeae7] paper-canvas flex flex-col items-center justify-center p-4">
        <Loader2 className="w-6 h-6 text-[#6492b3] animate-spin mb-2" />
        <p className="text-xs font-medium text-[#5b554f]">Connecting to order tracker...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#ebeae7] paper-canvas flex flex-col items-center justify-center p-6 text-center">
        <XCircle className="w-10 h-10 text-[#8d7d6d] mb-2" />
        <h2 className="font-sans text-base font-bold text-[#3a3530] mb-1">Order Not Found</h2>
        <p className="text-xs text-[#5b554f] max-w-xs">{error}</p>
      </div>
    );
  }

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === 'CANCELLED';
  const currencySymbol = order.restaurant?.currencySymbol || '₹';

  return (
    <div className="min-h-screen bg-[#ebeae7] paper-canvas pb-24">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-[#bdb8ad]/60 px-4 sm:px-5 py-3 sticky top-0 z-30">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => onOrderMore(order.restaurant?.slug || 'demo-cafe', order.tableToken || (order.table as any)?.token)}
              className="w-8 h-8 rounded-full bg-[#f4f3f0] hover:bg-[#e8eff4] text-[#5b554f] hover:text-[#4f7897] border border-[#bdb8ad]/60 flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
              title="Back to menu"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="font-sans text-sm sm:text-base font-bold text-[#3a3530] leading-tight truncate">
                Order #{order.orderNumber}
              </h1>
              <p className="text-[11px] text-[#8d7d6d] font-normal truncate">
                {order.restaurant?.name && order.restaurant.name !== 'Demo Café' ? order.restaurant.name : 'Sentosa — The Coffee Unit'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="touch-press btn-glass-secondary border-[#bdb8ad] hover:border-[#6492b3] text-[#3a3530] text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
            >
              <Receipt className="w-3.5 h-3.5 text-[#6492b3]" />
              <span>Orders</span>
              {activeOrdersCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>

            <div className="bg-[#f4f3f0] text-[#3a3530] text-xs font-semibold px-2.5 py-1 rounded-full border border-[#bdb8ad]/60">
              Table {order.tableNumber}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 sm:px-5 pt-4 pb-12 space-y-4">
        {/* Live Status Stepper Card */}
        <div className="bg-white rounded-2xl p-6 border border-[#bdb8ad]/60 shadow-2xs">
          <div className="text-center mb-6">
            <span className="text-[11px] font-semibold text-emerald-950 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/80">
              Payment verified ✓
            </span>

            <h2 className="font-sans text-xl sm:text-2xl font-bold text-[#3a3530] mt-3 tracking-tight leading-tight">
              {isCancelled
                ? 'Order cancelled'
                : order.status === 'SERVED'
                ? 'Order served'
                : order.status === 'READY'
                ? 'Your order is ready'
                : order.status === 'PREPARING'
                ? 'Kitchen is preparing'
                : 'Order confirmed'}
            </h2>

            <p className="text-xs text-[#8d7d6d] mt-1 font-normal">
              Table {order.tableNumber} • Placed at{' '}
              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Stepper Timeline */}
          {isCancelled ? (
            <div className="p-4 bg-semantic-danger-bg border border-semantic-danger-border rounded-xl text-center text-xs text-semantic-danger font-medium">
              This order was cancelled by staff. Please speak to your server.
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[1.5px] before:bg-[#bdb8ad]/60">
              {STATUS_STEPS.map((step, idx) => {
                const IconComponent = step.icon;
                const isCompleted = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <div key={step.key} className="relative flex items-start gap-4">
                    {/* Step Dot */}
                    <div
                      className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-[#6492b3] text-white ring-4 ring-[#e8eff4]'
                          : 'bg-white border border-[#bdb8ad] text-[#8d7d6d]'
                      }`}
                    >
                      <IconComponent className="w-3 h-3" />
                    </div>

                    {/* Step Description */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-xs font-semibold ${
                            isCurrent ? 'text-[#3a3530] font-bold' : isCompleted ? 'text-[#5b554f]' : 'text-[#8d7d6d]'
                          }`}
                        >
                          {step.label}
                        </h4>
                        {isCurrent && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#6492b3] animate-ping" />
                        )}
                      </div>
                      <p className="text-[11px] text-[#8d7d6d] mt-0.5 font-light">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Brand Celebration Moment */}
        <div className="bg-white rounded-2xl p-4 border border-[#bdb8ad]/60 shadow-2xs flex items-center gap-3.5">
          <div className="w-16 h-20 flex-shrink-0 flex items-center justify-center">
            <img
              src="/brand/illustration-run.png"
              alt="Sentosa hand-drawn illustration of a person carrying coffee and croissants"
              className="w-full h-full object-contain mix-blend-multiply"
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#3a3530] leading-snug">
              Freshly crafted for Table {order.tableNumber}.
            </p>
            <p className="text-[11px] text-[#8d7d6d] font-normal mt-0.5">
              A place to slow down &amp; enjoy your coffee.
            </p>
          </div>
        </div>

        {/* Action: Order More Food on Same Table */}
        <div className="bg-white border border-[#bdb8ad]/60 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
          <div>
            <h4 className="text-xs font-bold text-[#3a3530]">Ordering again?</h4>
            <p className="text-[11px] text-[#8d7d6d] font-light">Add more dishes to Table {order.tableNumber}</p>
          </div>
          <button
            type="button"
            onClick={() => onOrderMore(order.restaurant?.slug || 'demo-cafe', order.tableToken || (order.table as any)?.token)}
            className="btn-primary text-xs font-semibold py-2.5 px-4 min-h-[42px] rounded-xl flex items-center gap-2 shadow-2xs transition-all active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>Add items</span>
          </button>
        </div>

        {/* Itemized Order Receipt */}
        <div className="bg-white rounded-2xl p-5 border border-[#bdb8ad]/60 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-[#5b554f] text-xs font-semibold">
            <Receipt className="w-4 h-4 text-[#6492b3]" />
            <span>Itemized receipt</span>
          </div>

          <div className="divide-y divide-[#bdb8ad]/40 text-xs">
            {order.items.map((item) => (
              <div key={item.id} className="py-2.5 flex justify-between items-start">
                <div>
                  <span className="font-semibold text-[#3a3530]">{item.name}</span>
                  <span className="text-[#8d7d6d] font-medium ml-1.5">× {item.quantity}</span>

                  {item.customizations && item.customizations.length > 0 && (
                    <div className="mt-1 space-y-0.5 pl-2">
                      {item.customizations.map((c, idx) => (
                        <div key={idx} className="text-[10px] text-[#5b554f] font-light flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#6492b3]" />
                          <span>
                            {c.groupName}: <strong className="font-semibold text-[#3a3530]">{c.optionName}</strong>
                            {c.priceAddition > 0 ? ` (+${currencySymbol}${c.priceAddition.toFixed(0)})` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {item.specialInstructions && (
                    <p className="text-[10px] text-amber-900 italic mt-0.5 font-light pl-2">
                      ↳ {item.specialInstructions}
                    </p>
                  )}
                </div>
                <span className="font-bold text-[#3a3530] font-mono">{currencySymbol}{item.itemTotal.toFixed(0)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="pt-3 border-t border-[#bdb8ad]/50 space-y-1 text-xs text-[#5b554f] font-light">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-mono">{currencySymbol}{order.subtotal.toFixed(2)}</span>
            </div>
            {order.taxAmount > 0 && (
              <div className="flex justify-between text-[#8d7d6d]">
                <span>Taxes</span>
                <span className="font-mono">{currencySymbol}{order.taxAmount.toFixed(2)}</span>
              </div>
            )}
            {order.serviceCharge > 0 && (
              <div className="flex justify-between text-[#8d7d6d]">
                <span>Service Charge</span>
                <span className="font-mono">{currencySymbol}{order.serviceCharge.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-xs text-[#3a3530] pt-2 border-t border-[#bdb8ad]/50 font-sans">
              <span>Total Paid</span>
              <span className="font-mono text-sm font-bold">{currencySymbol}{order.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Customer Order History Modal */}
      <CustomerOrderHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectOrder={(tok) => {
          setIsHistoryOpen(false);
          if (onNavigateToOrder) {
            onNavigateToOrder(tok);
          }
        }}
        onOrderMore={() => {
          setIsHistoryOpen(false);
          onOrderMore(order.restaurant?.slug || 'demo-cafe', order.tableToken || (order.table as any)?.token);
        }}
      />
    </div>
  );
};
