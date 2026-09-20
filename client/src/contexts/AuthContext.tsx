import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, RestaurantInfo } from '../types/index.js';
import { api } from '../services/api.js';

const MANAGER_ROLES = ['ADMIN', 'MANAGER'];

interface AuthContextType {
  user: AuthUser | null;
  restaurant: RestaurantInfo | null;
  token: string | null;
  loading: boolean;
  isManager: boolean;
  isStaff: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('cafe_admin_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadProfile() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.getCurrentUser();
        setUser(res.user);
        setRestaurant(res.restaurant);
      } catch (err) {
        console.warn('Session expired or invalid:', err);
        logout();
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [token]);

  const login = async (email: string, pass: string) => {
    const res = await api.login({ email, password: pass });
    localStorage.setItem('cafe_admin_token', res.token);
    setToken(res.token);
    setUser(res.user);
    setRestaurant(res.restaurant);
  };

  const logout = () => {
    localStorage.removeItem('cafe_admin_token');
    setToken(null);
    setUser(null);
    setRestaurant(null);
  };

  const isManager = user ? MANAGER_ROLES.includes(user.role) : false;
  const isStaff = user ? user.role === 'STAFF' : false;

  return (
    <AuthContext.Provider value={{ user, restaurant, token, loading, isManager, isStaff, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

