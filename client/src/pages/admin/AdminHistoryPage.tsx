import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { OrderRecord } from '../../types/index.js';
import {
  Search,
  Eye,
  X,
  Loader2,
} from 'lucide-react';


export const AdminHistoryPage: React.FC = () => {
  const { restaurant } = useAuth();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [dateFilter, setDateFilter] = useState<string>('today');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [inspectOrder, setInspectOrder] = useState<OrderRecord | null>(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await api.getOrderHistory(dateFilter, searchQuery, statusFilter);
      setOrders(data);
    } catch (err) {
      console.error('Failed to load order history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [dateFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadHistory();
  };

  const currencySymbol = restaurant?.currencySymbol || '₹';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl md:text-3xl text-stone-900 tracking-tight">
          Historical Orders & Receipts
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Audit customer orders, verified payment timestamps, and itemized dining receipts
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Date Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'week', label: 'Past 7 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'all', label: 'All Records' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDateFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  dateFilter === tab.id
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                {tab.label}
              </button>

            ))}
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-stone-500 whitespace-nowrap">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-1.5 px-2.5 bg-stone-50 border border-stone-200 rounded-lg text-stone-800 focus:bg-white focus:border-stone-400 outline-none transition-colors"
            >
              <option value="ALL">All Statuses</option>
              <option value="SERVED">Served (Completed)</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PREPARING">Preparing</option>
              <option value="READY">Ready</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by order # (e.g. 104), table (e.g. 05), or customer name/phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 placeholder-stone-400 outline-none focus:bg-white focus:border-stone-400 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-cream-50 text-xs font-medium rounded-lg transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-stone-700 mx-auto mb-2" />
          <p className="text-xs text-stone-500">Querying order records...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-stone-200/80">
          <p className="text-sm font-medium text-stone-700">No past orders found for this filter</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/80 border-b border-stone-200 text-stone-500 font-medium uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3 pl-4">Order #</th>
                  <th className="p-3">Table</th>
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">Items Ordered</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Order Status</th>
                  <th className="p-3 pr-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="p-3 pl-4 font-mono font-medium text-stone-900">
                      #{ord.orderNumber}
                    </td>
                    <td className="p-3 font-medium text-stone-800">
                      Table {ord.table?.tableNumber || ord.tableNumber || '??'}
                    </td>
                    <td className="p-3 text-stone-500 whitespace-nowrap">
                      {new Date(ord.createdAt).toLocaleDateString()}{' '}
                      {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3 text-stone-700 max-w-xs truncate font-medium">
                      {ord.items.map((i) => {
                        const name = i.name || (i as any).nameSnapshot || 'Item';
                        return `${i.quantity}× ${name}`;
                      }).join(', ')}
                    </td>
                    <td className="p-3 font-medium text-stone-900 whitespace-nowrap font-mono">
                      {currencySymbol}{ord.totalAmount.toFixed(2)}
                    </td>
                    <td className="p-3">
                      {ord.paymentStatus === 'COMPLETED' ? (
                        <span className="text-[10px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded">
                          PAID ✓
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-rose-700 bg-rose-50 border border-rose-200/70 px-2 py-0.5 rounded">
                          {ord.paymentStatus}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="text-[11px] font-medium text-stone-700">
                        {ord.status}
                      </span>
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <button
                        onClick={() => setInspectOrder(ord)}
                        className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-md transition-colors"
                        title="View Receipt Breakdown"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspect Receipt Modal */}
      {inspectOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setInspectOrder(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-stone-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setInspectOrder(null)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-serif text-xl text-stone-900">
              Order #{inspectOrder.orderNumber}
            </h3>
            <p className="text-xs text-stone-500 mt-0.5 mb-4">
              Table {inspectOrder.table?.tableNumber || inspectOrder.tableNumber} •{' '}
              {new Date(inspectOrder.createdAt).toLocaleString()}
            </p>

            {inspectOrder.customerName && (
              <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-100 text-xs mb-3 text-stone-700">
                <span className="font-medium text-stone-900">Customer: </span>
                <span>{inspectOrder.customerName} {inspectOrder.customerPhone ? `(${inspectOrder.customerPhone})` : ''}</span>
              </div>
            )}

            <div className="divide-y divide-stone-100 border-t border-b border-stone-100 my-3 py-1 text-xs">
              {inspectOrder.items.map((i) => {
                const itemName = i.name || (i as any).nameSnapshot || 'Item';
                const lineTotal = i.itemTotal ?? ((i.price || (i as any).priceSnapshot || 0) * i.quantity);

                return (
                  <div key={i.id} className="py-2.5 flex justify-between items-start">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-bold text-stone-900 font-mono text-sm">{i.quantity}×</span>
                        <span className="text-stone-900 font-semibold text-xs md:text-sm">{itemName}</span>
                      </div>

                      {i.customizations && i.customizations.length > 0 && (
                        <div className="mt-1 space-y-0.5 pl-3">
                          {i.customizations.map((c, idx) => (
                            <div key={idx} className="text-[11px] text-stone-600 font-medium flex items-center gap-1.5">
                              <span className="text-amber-800 font-bold">↳</span>
                              <span>
                                {c.groupName}: <strong className="font-semibold text-stone-900">{c.optionName}</strong>
                                {c.priceAddition > 0 ? ` (+${currencySymbol}${c.priceAddition.toFixed(0)})` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {i.specialInstructions && (
                        <p className="text-[11px] text-amber-800 italic pl-3 mt-0.5 font-medium">↳ Note: {i.specialInstructions}</p>
                      )}
                    </div>
                    <span className="font-mono text-stone-900 font-bold pt-0.5">{currencySymbol}{lineTotal.toFixed(0)}</span>
                  </div>
                );
              })}
            </div>

            <div className="space-y-1.5 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono">{currencySymbol}{inspectOrder.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>GST Taxes</span>
                <span className="font-mono">{currencySymbol}{inspectOrder.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium text-sm text-stone-900 pt-2 border-t border-stone-100">
                <span>Total Paid</span>
                <span className="font-serif text-base font-semibold">{currencySymbol}{inspectOrder.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

