import React, { useEffect, useState } from 'react';
import { OrderRecord, WaiterRequest } from '../../types/index.js';
import { api } from '../../services/api.js';
import { getSocket } from '../../services/socket.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { OrderCard } from '../../components/admin/OrderCard.js';
import { Volume2, VolumeX, RefreshCw, Search, Loader2, Bell, Check, CheckCircle2, Clock, MessageSquare } from 'lucide-react';

export const AdminOrdersPage: React.FC = () => {
  const { restaurant } = useAuth();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [waiterRequests, setWaiterRequests] = useState<WaiterRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<string>('ALL_LIVE');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Synthesize kitchen chime using Web Audio API
  const playKitchenChime = (isUrgent = false) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      if (isUrgent) {
        // Higher chime for waiter call
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        osc.frequency.setValueAtTime(1174.66, audioCtx.currentTime + 0.12); // D6
      } else {
        // Kitchen order chime
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
      }

      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch {
      // Audio context requires user gesture
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [liveOrders, liveWaiters] = await Promise.all([
        api.getLiveOrders(),
        api.getAdminWaiterRequests().catch(() => []),
      ]);
      setOrders(liveOrders);
      setWaiterRequests(liveWaiters);
    } catch (err) {
      console.error('Failed to load live orders or waiter requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    if (!restaurant?.id) return;

    const socket = getSocket();
    socket.emit('join:restaurant', restaurant.id);

    const handleNewOrder = (newOrder: OrderRecord) => {
      setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
      playKitchenChime(false);
    };

    const handleStatusUpdate = (updatedOrder: OrderRecord) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? { ...o, status: updatedOrder.status } : o))
      );
    };

    const handleNewWaiter = (newReq: WaiterRequest) => {
      setWaiterRequests((prev) => [newReq, ...prev.filter((r) => r.id !== newReq.id)]);
      playKitchenChime(true);
    };

    const handleWaiterUpdate = (updatedReq: WaiterRequest) => {
      setWaiterRequests((prev) => {
        if (updatedReq.status === 'COMPLETED' || updatedReq.status === 'CANCELLED') {
          return prev.filter((r) => r.id !== updatedReq.id);
        }
        const exists = prev.some((r) => r.id === updatedReq.id);
        if (exists) {
          return prev.map((r) => (r.id === updatedReq.id ? { ...r, ...updatedReq } : r));
        }
        return [updatedReq, ...prev];
      });
    };

    socket.on('order:new', handleNewOrder);
    socket.on('order:status_updated', handleStatusUpdate);
    socket.on('waiter:new', handleNewWaiter);
    socket.on('waiter:status_updated', handleWaiterUpdate);

    const interval = setInterval(loadData, 10000);

    return () => {
      socket.off('order:new', handleNewOrder);
      socket.off('order:status_updated', handleStatusUpdate);
      socket.off('waiter:new', handleNewWaiter);
      socket.off('waiter:status_updated', handleWaiterUpdate);
      clearInterval(interval);
    };
  }, [restaurant?.id, soundEnabled]);

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: string) => {
    try {
      const updated = await api.updateOrderStatus(orderId, nextStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: updated.status } : o))
      );
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handleUpdateWaiterStatus = async (requestId: string, status: 'ACKNOWLEDGED' | 'COMPLETED') => {
    try {
      setActionLoadingId(requestId);
      const res = await api.updateWaiterRequestStatus(requestId, status);
      setWaiterRequests((prev) => {
        if (status === 'COMPLETED') {
          return prev.filter((r) => r.id !== requestId);
        }
        return prev.map((r) => (r.id === requestId ? { ...r, status: res.request?.status || status } : r));
      });
    } catch (err: any) {
      alert(`Failed to update waiter status: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (activeFilter === 'ALL_LIVE') {
      if (order.status === 'SERVED' || order.status === 'CANCELLED') return false;
    } else if (activeFilter !== 'ALL') {
      if (order.status !== activeFilter) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const numMatch = order.orderNumber.toString().includes(q);
      const tableMatch = (order.table?.tableNumber || order.tableNumber || '').toLowerCase().includes(q);
      const customerMatch = (order.customerName || '').toLowerCase().includes(q);
      return numMatch || tableMatch || customerMatch;
    }

    return true;
  });

  const activeWaiterRequests = waiterRequests.filter(
    (r) => r.status === 'PENDING' || r.status === 'ACKNOWLEDGED'
  );

  const currencySymbol = restaurant?.currencySymbol || '₹';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cream-300 pb-4">
        <div>
          <h1 className="font-serif text-xl md:text-2xl font-bold text-charcoal-900 tracking-tight">
            Kitchen Orders & Live POS
          </h1>
          <p className="text-xs text-charcoal-600 font-medium mt-0.5">
            Real-time incoming orders, table waiter calls, and live kitchen dispatch
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSoundEnabled((s) => !s)}
            className={`touch-press flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              soundEnabled
                ? 'bg-amber-100 border-amber-300 text-amber-950 shadow-2xs'
                : 'bg-white border-cream-300 text-charcoal-700 hover:bg-cream-100'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-800" /> : <VolumeX className="w-4 h-4 text-charcoal-500" />}
            <span>{soundEnabled ? 'Chime active' : 'Chime muted'}</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            className="touch-press btn-outline flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ACTIVE WAITER CALLS SECTION */}
      {activeWaiterRequests.length > 0 && (
        <section className="bg-amber-50/80 border-2 border-amber-300/80 rounded-2xl p-5 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center animate-bounce">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-serif text-base font-bold text-charcoal-950 flex items-center gap-2">
                  <span>Waiter assistance calls</span>
                  <span className="bg-amber-200 text-amber-950 text-xs font-bold px-2 py-0.5 rounded-full">
                    {activeWaiterRequests.length} active
                  </span>
                </h2>
                <p className="text-xs text-charcoal-700 font-normal">
                  Guests waiting at their tables for assistance
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {activeWaiterRequests.map((req) => {
              const isAcknowledged = req.status === 'ACKNOWLEDGED';
              const isLoading = actionLoadingId === req.id;

              return (
                <div
                  key={req.id}
                  className={`rounded-2xl p-5 border transition-all flex flex-col justify-between shadow-xs ${
                    isAcknowledged
                      ? 'bg-amber-100/70 border-amber-300 ring-1 ring-amber-300/50'
                      : 'bg-white border-amber-400 ring-2 ring-amber-400/40 shadow-sm'
                  }`}
                >
                  <div>
                    {/* Header: Prominent TABLE NUMBER and Status Badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="bg-[#1c1917] text-[#ffffff] font-bold text-sm md:text-base px-3.5 py-1.5 rounded-xl tracking-wider shadow-xs flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-amber-400" />
                        <span>Table {req.tableNumber}</span>
                      </span>

                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg tracking-wide ${
                          isAcknowledged
                            ? 'bg-amber-200 text-amber-950 border border-amber-300'
                            : 'bg-rose-100 text-rose-950 border border-rose-300 animate-pulse font-bold'
                        }`}
                      >
                        {isAcknowledged ? 'Acknowledged' : 'Needs help'}
                      </span>
                    </div>

                    {/* Prominent REASON Display */}
                    <div className="my-2.5">
                      <span className="text-[11px] font-medium text-charcoal-500 block mb-0.5">
                        Reason
                      </span>
                      <p className="text-sm md:text-base font-semibold text-charcoal-950 leading-snug">
                        {req.reason || 'Assistance needed'}
                      </p>
                    </div>

                    {/* Optional Customer Note in Quote Box */}
                    {req.note && (
                      <div className="mt-2.5 p-3 bg-cream-100/90 border border-cream-300/90 rounded-xl text-xs text-charcoal-900 flex items-start gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-amber-800 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-medium text-charcoal-600 block">
                            Customer note
                          </span>
                          <p className="text-xs font-semibold text-charcoal-950 italic mt-0.5">
                            "{req.note}"
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Time Requested */}
                    <div className="flex items-center gap-1.5 text-xs text-charcoal-600 mt-3">
                      <Clock className="w-3.5 h-3.5 text-charcoal-500" />
                      <span className="font-medium">
                        Requested at {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 mt-3 flex items-center gap-2 border-t border-amber-200/80">
                    {!isAcknowledged ? (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleUpdateWaiterStatus(req.id, 'ACKNOWLEDGED')}
                        className="touch-press btn-glass-primary flex-1 min-h-[40px] py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        <span>Acknowledge</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleUpdateWaiterStatus(req.id, 'COMPLETED')}
                        className="touch-press btn-glass-primary flex-1 min-h-[40px] py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white shadow-sm"
                      >
                        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />}
                        <span>Mark completed</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleUpdateWaiterStatus(req.id, 'COMPLETED')}
                      className="touch-press btn-glass-secondary min-h-[40px] py-2 px-3.5 rounded-xl text-xs font-semibold"
                      title="Dismiss"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-cream-300 shadow-subtle">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
          {[
            { id: 'ALL_LIVE', label: 'All live', count: orders.filter((o) => o.status !== 'SERVED' && o.status !== 'CANCELLED').length },
            { id: 'CONFIRMED', label: 'New confirmed', count: orders.filter((o) => o.status === 'CONFIRMED' || o.status === 'PENDING').length },
            { id: 'PREPARING', label: 'In kitchen', count: orders.filter((o) => o.status === 'PREPARING').length },
            { id: 'READY', label: 'Ready for service', count: orders.filter((o) => o.status === 'READY').length },
            { id: 'ALL', label: 'All history' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`touch-press px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeFilter === tab.id
                  ? 'bg-[#6492b3] text-white shadow-2xs'
                  : 'text-[#5b554f] hover:bg-[#f4f3f0]'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeFilter === tab.id ? 'bg-[#4f7897] text-white' : 'bg-[#e8eff4] text-[#4f7897]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-56">
          <Search className="w-3.5 h-3.5 text-charcoal-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search order #, table..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-cream-100/60 border border-cream-300 rounded-lg text-xs outline-none focus:border-charcoal-800 text-charcoal-900 placeholder-charcoal-500 font-medium"
          />
        </div>
      </div>

      {/* Orders Grid */}
      {loading && orders.length === 0 ? (
        <div className="p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-charcoal-700 mx-auto mb-2" />
          <p className="text-xs text-charcoal-600 font-medium">Connecting to kitchen POS feed...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-xl border border-cream-300 shadow-subtle">
          <p className="font-serif text-sm font-bold text-charcoal-900">No active orders in this section</p>
          <p className="text-xs text-charcoal-600 mt-1 font-normal max-w-sm mx-auto">
            When customers order from their tables and payments are verified, tickets appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              currencySymbol={currencySymbol}
              onUpdateStatus={handleUpdateOrderStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
};
