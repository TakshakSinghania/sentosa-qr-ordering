import { Router } from 'express';
import { login, getCurrentUser } from '../controllers/auth.js';
import { getPublicMenu, calculatePreview, getTableFavoritesController } from '../controllers/menu.js';
import { createDraftOrder, getOrderStatus } from '../controllers/order.js';
import { verifyPayment, simulateSandboxPayment, handleRazorpayWebhook } from '../controllers/payment.js';
import {
  requestWaiter,
  getWaiterStatus,
  getAdminWaiterRequests,
  updateWaiterRequestStatus,
} from '../controllers/waiter.js';
import {
  getLiveOrders,
  getOrderHistory,
  updateOrderStatus,
  getAdminMenu,
  createMenuItem,
  updateMenuItem,
  toggleItemAvailability,
  deleteMenuItem,
  createCategory,
  createCustomizationGroup,
  updateCustomizationGroup,
  deleteCustomizationGroup,
  toggleCustomizationOptionAvailability,
  addCustomizationOption,
  deleteCustomizationOption,
  getTables,
  createTable,
  toggleTableActive,
  regenerateTableToken,
  getPrintableQrs,
  getAnalytics,
  getSettings,
  updateSettings,
  getStaffList,
  createStaffAccount,
  updateStaffAccount,
  resetStaffPassword,
  deactivateStaffAccount,
} from '../controllers/admin.js';
import {
  sendCustomerOtp,
  verifyCustomerOtp,
  getCurrentCustomer,
  logoutCustomer,
} from '../controllers/customerAuth.js';
import {
  getCustomerOrders,
  getCustomerActiveOrders,
  getCustomerOrderById,
} from '../controllers/customerOrder.js';
import { authenticateToken, requireManager, requireStaff, authenticateCustomer } from '../middleware/auth.js';
import { enforceRestaurantContext } from '../middleware/tenant.js';
import {
  loginRateLimiter,
  tableLookupRateLimiter,
  orderRateLimiter,
  paymentRateLimiter,
  otpSendRateLimiter,
  otpVerifyRateLimiter,
} from '../middleware/rateLimiter.js';

const router = Router();

// ==========================================
// 1. STAFF & ADMIN AUTHENTICATION (Rate Limited)
// ==========================================
router.post('/auth/login', loginRateLimiter, login);
router.get('/auth/me', authenticateToken, getCurrentUser);

// ==========================================
// 2. CUSTOMER AUTHENTICATION (Mobile Phone OTP)
// ==========================================
router.post('/customer/auth/send-otp', otpSendRateLimiter, sendCustomerOtp);
router.post('/customer/auth/verify-otp', otpVerifyRateLimiter, verifyCustomerOtp);
router.get('/customer/auth/me', authenticateCustomer, getCurrentCustomer);
router.post('/customer/auth/logout', logoutCustomer);

// ==========================================
// 3. CUSTOMER ORDER HISTORY & ACTIVE ORDERS
// ==========================================
router.get('/customer/orders', authenticateCustomer, getCustomerOrders);
router.get('/customer/orders/active', authenticateCustomer, getCustomerActiveOrders);
router.get('/customer/orders/:orderId', authenticateCustomer, getCustomerOrderById);

// ==========================================
// 4. PUBLIC CUSTOMER MENU & QR RESOLUTION (Rate Limited)
// ==========================================
router.get('/customer/table-favorites', tableLookupRateLimiter, getTableFavoritesController);
router.get('/menu/:restaurantSlug/t/:tableToken/favorites', tableLookupRateLimiter, getTableFavoritesController);
router.get('/menu/:restaurantSlug/t/:tableToken', tableLookupRateLimiter, getPublicMenu);
router.post('/menu/preview', calculatePreview);

// ==========================================
// 5. CUSTOMER ORDERS & STATUS TRACKING (Rate Limited)
// ==========================================
router.post('/orders', orderRateLimiter, createDraftOrder);
router.get('/orders/:orderToken', getOrderStatus);

// ==========================================
// 6. PAYMENTS & VERIFICATION (Rate Limited)
// ==========================================
router.post('/payments/verify', paymentRateLimiter, verifyPayment);
router.post('/payments/sandbox-simulate', paymentRateLimiter, simulateSandboxPayment);
router.post('/payments/webhook', handleRazorpayWebhook);

// ==========================================
// 7. CALL WAITER SERVICE (Rate Limited)
// ==========================================
router.post('/waiter/call', orderRateLimiter, requestWaiter);
router.get('/waiter/status', getWaiterStatus);

// ==========================================
// 8. RESTAURANT ADMIN & POS (AUTHENTICATED & ISOLATED)
// ==========================================
const adminRouter = Router();
adminRouter.use(authenticateToken);
adminRouter.use(requireStaff); // Strictly rejects CUSTOMER role (403 Forbidden)
adminRouter.use(enforceRestaurantContext);

// ── OPERATIONAL (STAFF + MANAGER) ────────────────────────────────────────────

// Live Orders (operational: both roles)
adminRouter.get('/orders/live', getLiveOrders);

// Order History (operational: both roles — confirmed by user)
adminRouter.get('/orders/history', getOrderHistory);

// Order status transitions (operational: both roles)
adminRouter.patch('/orders/:orderId/status', updateOrderStatus);

// Waiter Assistance (operational: both roles)
adminRouter.get('/waiter-requests', getAdminWaiterRequests);
adminRouter.patch('/waiter-requests/:id/status', updateWaiterRequestStatus);
adminRouter.get('/waiter/requests', getAdminWaiterRequests);
adminRouter.patch('/waiter/requests/:id/status', updateWaiterRequestStatus);

// Menu read (operational: both roles)
adminRouter.get('/menu', getAdminMenu);

// Mark items sold out during service (operational: confirmed by user)
adminRouter.patch('/menu/items/:itemId/toggle-availability', toggleItemAvailability);

// Toggle customization option availability during service (operational: both roles)
adminRouter.patch('/menu/customization-options/:id/toggle-availability', toggleCustomizationOptionAvailability);

// Tables read-only view (operational: both roles)
adminRouter.get('/tables', getTables);

// ── MANAGER-ONLY ─────────────────────────────────────────────────────────────

// Menu write operations (MANAGER ONLY)
adminRouter.post('/menu/items', requireManager, createMenuItem);
adminRouter.patch('/menu/items/:itemId', requireManager, updateMenuItem);
adminRouter.delete('/menu/items/:itemId', requireManager, deleteMenuItem);
adminRouter.post('/menu/categories', requireManager, createCategory);

// Customization management (MANAGER ONLY)
adminRouter.post('/menu/items/:itemId/customization-groups', requireManager, createCustomizationGroup);
adminRouter.post('/menu/customization-groups', requireManager, createCustomizationGroup);
adminRouter.patch('/menu/customization-groups/:id', requireManager, updateCustomizationGroup);
adminRouter.delete('/menu/customization-groups/:id', requireManager, deleteCustomizationGroup);
adminRouter.post('/menu/customization-groups/:groupId/options', requireManager, addCustomizationOption);
adminRouter.delete('/menu/customization-options/:id', requireManager, deleteCustomizationOption);

// Table write operations & QR security (MANAGER ONLY)
adminRouter.post('/tables', requireManager, createTable);
adminRouter.patch('/tables/:tableId/toggle-active', requireManager, toggleTableActive);
adminRouter.post('/tables/:tableId/regenerate-token', requireManager, regenerateTableToken);
adminRouter.get('/tables/printable', requireManager, getPrintableQrs);

// Financial Analytics (MANAGER ONLY — contains revenue, historical sales, AOV)
adminRouter.get('/analytics', requireManager, getAnalytics);

// Restaurant Settings (MANAGER ONLY)
adminRouter.get('/settings', requireManager, getSettings);
adminRouter.patch('/settings', requireManager, updateSettings);

// Staff Management (MANAGER ONLY)
adminRouter.get('/staff', requireManager, getStaffList);
adminRouter.post('/staff', requireManager, createStaffAccount);
adminRouter.patch('/staff/:userId', requireManager, updateStaffAccount);
adminRouter.patch('/staff/:userId/password', requireManager, resetStaffPassword);
adminRouter.delete('/staff/:userId', requireManager, deactivateStaffAccount);

router.use('/admin', adminRouter);

export default router;

