import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CustomerProfile, CustomerOrderRecord, SendOtpResponse } from '../types/index.js';
import { api } from '../services/api.js';
import { getSocket } from '../services/socket.js';

interface CustomerAuthContextType {
  customer: CustomerProfile | null;
  token: string | null;
  loading: boolean;
  activeOrdersCount: number;
  activeOrders: CustomerOrderRecord[];
  sendOtp: (phone: string, name?: string, restaurantSlug?: string) => Promise<SendOtpResponse>;
  verifyOtp: (phone: string, otp: string, name?: string, restaurantSlug?: string) => Promise<void>;
  logout: () => void;
  refreshActiveOrders: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export const CustomerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sentosa_customer_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [activeOrders, setActiveOrders] = useState<CustomerOrderRecord[]>([]);
  const [activeOrdersCount, setActiveOrdersCount] = useState<number>(0);

  const refreshActiveOrders = useCallback(async () => {
    const currentToken = localStorage.getItem('sentosa_customer_token');
    if (!currentToken) {
      setActiveOrders([]);
      setActiveOrdersCount(0);
      return;
    }

    try {
      const res = await api.getCustomerActiveOrders();
      setActiveOrders(res.orders || []);
      setActiveOrdersCount(res.count || 0);
    } catch {
      // If error fetching active orders, silently keep previous state
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sentosa_customer_token');
    setToken(null);
    setCustomer(null);
    setActiveOrders([]);
    setActiveOrdersCount(0);
    api.customerLogout().catch(() => {});
  }, []);

  // Load customer profile on mount if token exists
  useEffect(() => {
    async function loadCustomer() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.getCustomerProfile();
        setCustomer(res.customer);
        await refreshActiveOrders();
      } catch (err) {
        console.warn('Customer session expired or invalid:', err);
        logout();
      } finally {
        setLoading(false);
      }
    }

    loadCustomer();
  }, [token, logout, refreshActiveOrders]);

  // Realtime updates: Refresh active orders on socket events
  useEffect(() => {
    if (!customer) return;

    const socket = getSocket();
    const handleStatusUpdate = () => {
      refreshActiveOrders();
    };

    socket.on('order:status_updated', handleStatusUpdate);
    const interval = setInterval(refreshActiveOrders, 10000);

    return () => {
      socket.off('order:status_updated', handleStatusUpdate);
      clearInterval(interval);
    };
  }, [customer, refreshActiveOrders]);

  const sendOtp = async (phone: string, name?: string, restaurantSlug?: string): Promise<SendOtpResponse> => {
    return await api.customerSendOtp({
      phone,
      name,
      restaurantSlug: restaurantSlug || 'demo-cafe',
    });
  };

  const verifyOtp = async (phone: string, otp: string, name?: string, restaurantSlug?: string): Promise<void> => {
    const res = await api.customerVerifyOtp({
      phone,
      otp,
      name,
      restaurantSlug: restaurantSlug || 'demo-cafe',
    });
    localStorage.setItem('sentosa_customer_token', res.token);
    setToken(res.token);
    setCustomer(res.customer);
    await refreshActiveOrders();
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        token,
        loading,
        activeOrdersCount,
        activeOrders,
        sendOtp,
        verifyOtp,
        logout,
        refreshActiveOrders,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
};

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
}
