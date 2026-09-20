import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../contexts/AuthContext.js';
import {
  IndianRupee,
  ShoppingBag,
  TrendingUp,
  Award,
  Calendar,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

export const AdminAnalyticsPage: React.FC = () => {
  const { restaurant } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        const data = await api.getAnalytics();
        setAnalytics(data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-charcoal-700 mx-auto mb-2" />
        <p className="text-xs text-charcoal-500">Querying real-time database sales records...</p>
      </div>
    );
  }

  const currencySymbol = restaurant?.currencySymbol || '₹';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-cream-300 pb-4">
        <h1 className="font-serif text-xl md:text-2xl font-bold text-charcoal-900 tracking-tight">
          Sales & Dining Analytics
        </h1>
        <p className="text-xs text-charcoal-500 font-light mt-0.5">
          Calculated strictly from verified, paid orders recorded in the PostgreSQL database
        </p>
      </div>

      {/* 4 Restrained Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Revenue */}
        <div className="bg-white rounded-xl p-5 border border-cream-300 shadow-subtle flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-500">Today's Revenue</p>
            <h3 className="text-2xl font-black text-charcoal-900 mt-1 font-sans">
              {currencySymbol}{analytics?.todayRevenue?.toFixed(0) || 0}
            </h3>
            <p className="text-[10px] text-semantic-success font-medium mt-0.5">From verified payments</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-cream-200 text-charcoal-800 flex items-center justify-center">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>

        {/* Orders Count */}
        <div className="bg-white rounded-xl p-5 border border-cream-300 shadow-subtle flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-500">Today's Checks</p>
            <h3 className="text-2xl font-black text-charcoal-900 mt-1 font-sans">
              {analytics?.todayOrdersCount || 0}
            </h3>
            <p className="text-[10px] text-charcoal-500 mt-0.5 font-light">Completed tables</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-cream-200 text-charcoal-800 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="bg-white rounded-xl p-5 border border-cream-300 shadow-subtle flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-500">Avg. Check Size</p>
            <h3 className="text-2xl font-black text-charcoal-900 mt-1 font-sans">
              {currencySymbol}{analytics?.averageOrderValue?.toFixed(0) || 0}
            </h3>
            <p className="text-[10px] text-charcoal-500 mt-0.5 font-light">Average ticket size</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-cream-200 text-charcoal-800 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Served Orders */}
        <div className="bg-white rounded-xl p-5 border border-cream-300 shadow-subtle flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-500">Served Orders</p>
            <h3 className="text-2xl font-black text-charcoal-900 mt-1 font-sans">
              {analytics?.completedOrdersCount || 0}
            </h3>
            <p className="text-[10px] text-charcoal-500 mt-0.5 font-light">Fulfilled by kitchen</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-cream-200 text-charcoal-800 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Dishes */}
        <div className="bg-white rounded-xl p-5 border border-cream-300 shadow-subtle">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-bronze-600" />
            <h3 className="font-serif font-bold text-sm text-charcoal-900">
              Most Ordered Dishes
            </h3>
          </div>

          {!analytics?.topItems || analytics.topItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-charcoal-500 font-light">
              No orders recorded yet today.
            </div>
          ) : (
            <div className="divide-y divide-cream-300/80 text-xs">
              {analytics.topItems.map((item: any, idx: number) => (
                <div key={item.name} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-md bg-cream-200 text-charcoal-800 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-medium text-charcoal-900">{item.name}</p>
                      <p className="text-[11px] text-charcoal-500 font-light">{item.quantitySold} portions</p>
                    </div>
                  </div>
                  <span className="font-bold text-charcoal-900 font-sans">{currencySymbol}{item.totalRevenue.toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 7-Day Revenue Trend */}
        <div className="bg-white rounded-xl p-5 border border-cream-300 shadow-subtle">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-charcoal-700" />
            <h3 className="font-serif font-bold text-sm text-charcoal-900">
              Past 7 Days Revenue
            </h3>
          </div>

          {!analytics?.revenueByDay || analytics.revenueByDay.length === 0 ? (
            <div className="p-8 text-center text-xs text-charcoal-500 font-light">
              No historical revenue available.
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {analytics.revenueByDay.map((day: any) => {
                const maxRevenue = Math.max(...analytics.revenueByDay.map((d: any) => d.revenue), 1);
                const percent = Math.min(100, Math.round((day.revenue / maxRevenue) * 100));

                return (
                  <div key={day.date} className="space-y-1">
                    <div className="flex justify-between text-xs text-charcoal-700 font-medium">
                      <span>{day.date}</span>
                      <span className="font-sans font-bold">{currencySymbol}{day.revenue.toFixed(0)}</span>
                    </div>
                    <div className="w-full h-2 bg-cream-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-charcoal-900 rounded-full transition-all"
                        style={{ width: `${Math.max(percent, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
