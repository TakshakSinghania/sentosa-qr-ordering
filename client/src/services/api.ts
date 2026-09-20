import { CustomerProfile, CustomerAuthResponse, SendOtpResponse, CustomerOrderRecord, MenuItem } from '../types/index.js';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api';

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const isAdminEndpoint = endpoint.startsWith('/admin') || endpoint.startsWith('/auth');
  const token = isAdminEndpoint
    ? localStorage.getItem('cafe_admin_token')
    : localStorage.getItem('sentosa_customer_token');
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Public Menu & Ordering
  getPublicMenu: (slug: string, token: string) =>
    apiRequest<any>(`/menu/${slug}/t/${token}`),

  getTableFavorites: (slug: string, token: string, tableSessionToken?: string) => {
    const headers: Record<string, string> = {};
    if (tableSessionToken) {
      headers['x-table-session'] = tableSessionToken;
    }
    return apiRequest<{ enabled: boolean; items: MenuItem[] }>(
      `/menu/${slug}/t/${token}/favorites`,
      { headers }
    );
  },

  getPricingPreview: (restaurantId: string, items: any[]) =>
    apiRequest<any>('/menu/preview', {
      method: 'POST',
      body: JSON.stringify({ restaurantId, items }),
    }),

  createOrder: (payload: any) =>
    apiRequest<any>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getOrderStatus: (orderToken: string) =>
    apiRequest<any>(`/orders/${orderToken}`),

  verifyPayment: (payload: any) =>
    apiRequest<any>('/payments/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  simulateSandboxPayment: (orderToken: string) =>
    apiRequest<any>('/payments/sandbox-simulate', {
      method: 'POST',
      body: JSON.stringify({ orderToken }),
    }),

  // Customer Authentication (Phone + OTP)
  customerSendOtp: (data: {
    restaurantSlug?: string;
    restaurantId?: string;
    phone: string;
    name?: string;
  }) =>
    apiRequest<SendOtpResponse>('/customer/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  customerVerifyOtp: (data: {
    restaurantSlug?: string;
    restaurantId?: string;
    phone: string;
    otp: string;
    name?: string;
  }) =>
    apiRequest<CustomerAuthResponse>('/customer/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getCustomerProfile: () =>
    apiRequest<{ customer: CustomerProfile }>('/customer/auth/me'),

  customerLogout: () =>
    apiRequest<{ success: boolean }>('/customer/auth/logout', {
      method: 'POST',
    }),

  // Customer Orders
  getCustomerOrders: () =>
    apiRequest<CustomerOrderRecord[]>('/customer/orders'),

  getCustomerActiveOrders: () =>
    apiRequest<{ count: number; orders: CustomerOrderRecord[] }>('/customer/orders/active'),

  getCustomerOrderById: (orderId: string) =>
    apiRequest<CustomerOrderRecord>(`/customer/orders/${orderId}`),

  // Admin Auth
  login: (credentials: any) =>
    apiRequest<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  getCurrentUser: () =>
    apiRequest<any>('/auth/me'),

  // Admin Orders
  getLiveOrders: () =>
    apiRequest<any[]>('/admin/orders/live'),

  getOrderHistory: (filter = 'today', search = '', status = 'ALL') =>
    apiRequest<any[]>(`/admin/orders/history?filter=${filter}&search=${encodeURIComponent(search)}&status=${status}`),

  updateOrderStatus: (orderId: string, status: string) =>
    apiRequest<any>(`/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Admin Menu
  getAdminMenu: () =>
    apiRequest<any[]>('/admin/menu'),

  createMenuItem: (itemData: any) =>
    apiRequest<any>('/admin/menu/items', {
      method: 'POST',
      body: JSON.stringify(itemData),
    }),

  updateMenuItem: (itemId: string, itemData: any) =>
    apiRequest<any>(`/admin/menu/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(itemData),
    }),

  toggleItemAvailability: (itemId: string) =>
    apiRequest<any>(`/admin/menu/items/${itemId}/toggle-availability`, {
      method: 'PATCH',
    }),

  deleteMenuItem: (itemId: string) =>
    apiRequest<any>(`/admin/menu/items/${itemId}`, {
      method: 'DELETE',
    }),

  createCategory: (data: any) =>
    apiRequest<any>('/admin/menu/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Admin Tables & QR
  getTables: () =>
    apiRequest<any[]>('/admin/tables'),

  createTable: (data: any) =>
    apiRequest<any>('/admin/tables', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  toggleTableActive: (tableId: string) =>
    apiRequest<any>(`/admin/tables/${tableId}/toggle-active`, {
      method: 'PATCH',
    }),

  regenerateTableToken: (tableId: string) =>
    apiRequest<any>(`/admin/tables/${tableId}/regenerate-token`, {
      method: 'POST',
    }),

  getPrintableQrs: () =>
    apiRequest<any>('/admin/tables/printable'),

  // Waiter Calls
  callWaiter: (payload: {
    tableSessionToken: string;
    reason?: string;
    note?: string;
    customerNote?: string;
  }) =>
    apiRequest<any>('/waiter/call', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getWaiterStatus: (sessionToken: string) =>
    apiRequest<any>(`/waiter/status?tableSessionToken=${encodeURIComponent(sessionToken)}`),

  getAdminWaiterRequests: () =>
    apiRequest<any[]>('/admin/waiter-requests'),

  updateWaiterRequestStatus: (id: string, status: string) =>
    apiRequest<any>(`/admin/waiter-requests/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Admin Customizations
  createCustomizationGroup: (itemId: string, data: any) =>
    apiRequest<any>(`/admin/menu/items/${itemId}/customization-groups`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCustomizationGroup: (groupId: string, data: any) =>
    apiRequest<any>(`/admin/menu/customization-groups/${groupId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteCustomizationGroup: (groupId: string) =>
    apiRequest<any>(`/admin/menu/customization-groups/${groupId}`, {
      method: 'DELETE',
    }),

  addCustomizationOption: (groupId: string, data: any) =>
    apiRequest<any>(`/admin/menu/customization-groups/${groupId}/options`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  toggleCustomizationOptionAvailability: (optionId: string) =>
    apiRequest<any>(`/admin/menu/customization-options/${optionId}/toggle-availability`, {
      method: 'PATCH',
    }),

  deleteCustomizationOption: (optionId: string) =>
    apiRequest<any>(`/admin/menu/customization-options/${optionId}`, {
      method: 'DELETE',
    }),

  // Admin Analytics & Settings
  getAnalytics: () =>
    apiRequest<any>('/admin/analytics'),

  getSettings: () =>
    apiRequest<any>('/admin/settings'),

  updateSettings: (data: any) =>
    apiRequest<any>('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Staff Management (Manager only)
  getStaffList: () =>
    apiRequest<any[]>('/admin/staff'),

  createStaffAccount: (data: { name: string; email: string; password: string; role: string }) =>
    apiRequest<any>('/admin/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateStaffAccount: (userId: string, data: { name?: string; role?: string }) =>
    apiRequest<any>(`/admin/staff/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  resetStaffPassword: (userId: string, newPassword: string) =>
    apiRequest<any>(`/admin/staff/${userId}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ newPassword }),
    }),

  deactivateStaffAccount: (userId: string) =>
    apiRequest<any>(`/admin/staff/${userId}`, {
      method: 'DELETE',
    }),
};
