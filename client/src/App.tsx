import { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './contexts/AuthContext.js';
import { CustomerAuthProvider } from './contexts/CustomerAuthContext.js';
import { CartProvider } from './contexts/CartContext.js';
import { CustomerMenuPage } from './pages/customer/CustomerMenuPage.js';
import { CheckoutPage } from './pages/customer/CheckoutPage.js';
import { OrderTrackingPage } from './pages/customer/OrderTrackingPage.js';
import { AdminLoginPage } from './pages/admin/AdminLoginPage.js';
import { ManagerLoginPage } from './pages/admin/ManagerLoginPage.js';
import { StaffLoginPage } from './pages/admin/StaffLoginPage.js';
import { AdminSidebar } from './components/admin/AdminSidebar.js';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage.js';
import { AdminHistoryPage } from './pages/admin/AdminHistoryPage.js';
import { AdminMenuPage } from './pages/admin/AdminMenuPage.js';
import { AdminTablesPage } from './pages/admin/AdminTablesPage.js';
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage.js';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage.js';
import { StaffManagementPage } from './pages/admin/StaffManagementPage.js';
import { ErrorBoundary } from './components/common/ErrorBoundary.js';
import { Coffee, QrCode, ChefHat, ArrowRight } from 'lucide-react';

// Staff-accessible default tabs; manager default matches existing UX
const STAFF_DEFAULT_TAB = 'live-orders';
const MANAGER_DEFAULT_TAB = 'live-orders';

function AppContent() {
  const { user, loading: authLoading, isManager, isStaff } = useAuth();

  // Simple client-side path parsing
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  const [adminTab, setAdminTab] = useState<string>(MANAGER_DEFAULT_TAB);

  // Listen to popstate for browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  // Route: /menu/:slug/t/:tableToken
  const menuMatch = currentPath.match(/^\/menu\/([^\/]+)\/t\/([^\/]+)/);
  if (menuMatch) {
    const restaurantSlug = menuMatch[1];
    const tableToken = menuMatch[2];
    return (
      <CustomerMenuPage
        restaurantSlug={restaurantSlug}
        tableToken={tableToken}
        onNavigateToCheckout={() => navigate(`/menu/${restaurantSlug}/checkout?t=${tableToken}`)}
        onNavigateToOrder={(orderToken) => navigate(`/order/${orderToken}`)}
      />
    );
  }

  // Route: /menu/:slug/checkout
  const checkoutMatch = currentPath.match(/^\/menu\/([^\/]+)\/checkout/);
  if (checkoutMatch) {
    const restaurantSlug = checkoutMatch[1];
    const params = new URLSearchParams(window.location.search);
    const tableToken = params.get('t') || '';
    return (
      <CheckoutPage
        restaurantSlug={restaurantSlug}
        tableToken={tableToken}
        onBackToMenu={() => navigate(`/menu/${restaurantSlug}/t/${tableToken}`)}
        onOrderSuccess={(orderToken) => navigate(`/order/${orderToken}`)}
      />
    );
  }

  // Route: /order/:orderToken
  const orderMatch = currentPath.match(/^\/order\/([^\/]+)/);
  if (orderMatch) {
    const orderToken = orderMatch[1];
    return (
      <OrderTrackingPage
        orderToken={orderToken}
        onNavigateToOrder={(tok) => navigate(`/order/${tok}`)}
        onOrderMore={(slug, tableToken) => {
          const token = tableToken || sessionStorage.getItem(`tbl_token_${slug}`) || 'tbl_q7r8s9t0';
          navigate(`/menu/${slug}/t/${token}`);
        }}
      />
    );
  }

  // ── ADMIN ROUTES ──────────────────────────────────────────────────────────────

  // Route: /admin/manager/login
  if (currentPath === '/admin/manager/login') {
    if (authLoading) return <AuthLoadingScreen />;
    // If already logged in as manager, redirect to dashboard
    if (user && isManager) {
      navigate('/admin');
      return null;
    }
    // If already logged in as staff, redirect to staff dashboard
    if (user && isStaff) {
      navigate('/admin');
      return null;
    }
    return <ManagerLoginPage onNavigate={navigate} />;
  }

  // Route: /admin/staff/login
  if (currentPath === '/admin/staff/login') {
    if (authLoading) return <AuthLoadingScreen />;
    if (user) {
      navigate('/admin');
      return null;
    }
    return <StaffLoginPage onNavigate={navigate} />;
  }

  // Route: /admin or /admin/* (catch-all admin section)
  if (currentPath.startsWith('/admin')) {
    if (authLoading) return <AuthLoadingScreen />;

    if (!user) {
      return <AdminLoginPage onNavigate={navigate} />;
    }

    // Guard: staff can access live orders, order history, and dish availability
    const staffAllowedTabs = ['live-orders', 'order-history', 'menu'];
    const effectiveTab = (isStaff && !staffAllowedTabs.includes(adminTab))
      ? STAFF_DEFAULT_TAB
      : adminTab;

    const handleSelectTab = (tab: string) => {
      // Enforce tab-level guard on frontend (backend enforces at API level)
      if (isStaff && !staffAllowedTabs.includes(tab)) {
        return; // silently ignore — sidebar won't show unauthorized tabs for staff
      }
      setAdminTab(tab);
    };

    return (
      <div className="min-h-screen relative bg-gray-50">
        <AdminSidebar
          currentTab={effectiveTab}
          onSelectTab={handleSelectTab}
        />
        <div className="w-full min-w-0 overflow-y-auto pl-14 sm:pl-16 pr-4 sm:pr-6 py-3">
          {effectiveTab === 'live-orders' && <AdminOrdersPage />}
          {effectiveTab === 'order-history' && <AdminHistoryPage />}
          {/* Menu / Dish Availability tab is accessible to both manager and staff */}
          {effectiveTab === 'menu' && <AdminMenuPage />}
          {/* Manager-only tabs */}
          {isManager && effectiveTab === 'tables' && <AdminTablesPage />}
          {isManager && effectiveTab === 'analytics' && <AdminAnalyticsPage />}
          {isManager && effectiveTab === 'staff' && <StaffManagementPage />}
          {isManager && effectiveTab === 'settings' && <AdminSettingsPage />}
        </div>
      </div>
    );
  }

  // Fallback / Landing Demo Hub (Route: /)
  return (
    <div className="min-h-screen bg-[#ebeae7] paper-canvas text-[#3a3530] flex flex-col justify-between p-4 sm:p-6">
      <div className="max-w-4xl mx-auto w-full py-8 sm:py-12">
        {/* Branding Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#e8eff4] text-[#4f7897] mb-3.5 shadow-lift border border-[#6492b3]/30">
            <Coffee className="w-7 h-7 stroke-[2]" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="font-sans text-3xl sm:text-4xl font-bold text-[#3a3530] tracking-tight">
              Sentosa
            </h1>
            <span className="text-xs sm:text-sm font-semibold tracking-wider text-[#8d7d6d] uppercase bg-white/80 px-2.5 py-1 rounded-md border border-[#bdb8ad]/60">
              The Coffee Unit
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-[#8d7d6d] mt-2 italic">
            "Warm, soft and a little unexpected."
          </p>
          <p className="text-xs text-[#5b554f] max-w-md mx-auto mt-1 font-normal">
            A space to slow down. Table-side QR ordering, verified Razorpay payments, and live barista dispatch.
          </p>
        </div>

        {/* Action Demonstration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 sm:mb-10">
          {/* Customer Guest Menu Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#bdb8ad]/60 shadow-card flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#e8eff4] border border-[#6492b3]/30 text-[#4f7897] flex items-center justify-center mb-4 shadow-2xs">
                <QrCode className="w-5 h-5" />
              </div>
              <h2 className="font-sans text-xl font-bold text-[#3a3530] mb-1">
                Guest Mobile Menu
              </h2>
              <p className="text-xs text-[#5b554f] mb-5 leading-relaxed font-light">
                Simulates scanning the tabletop QR at <strong>Table 05</strong>. Browse artisanal coffee, pastries, customize preparations with notes, and pay online.
              </p>

              <div className="p-3.5 bg-[#f4f3f0] rounded-xl border border-[#bdb8ad]/60 mb-6 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#8d7d6d] font-medium">Café:</span>
                  <span className="font-semibold text-[#3a3530]">Sentosa — The Coffee Unit</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8d7d6d] font-medium">Table:</span>
                  <span className="font-semibold text-[#3a3530]">Table 05 (Secured)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8d7d6d] font-medium">Table Token:</span>
                  <span className="font-mono text-xs font-semibold text-[#3a3530] bg-white px-2 py-0.5 rounded border border-[#bdb8ad]/60">
                    tbl_q7r8s9t0
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/menu/demo-cafe/t/tbl_q7r8s9t0')}
              className="touch-press btn-primary w-full py-3.5 px-5 rounded-xl shadow-sm flex items-center justify-center gap-2.5 transition-all"
            >
              <span className="text-white font-semibold text-xs tracking-wide">Launch Guest Menu (Table 05)</span>
              <ArrowRight className="w-4 h-4 text-white stroke-[2.5]" />
            </button>
          </div>

          {/* Kitchen POS & Staff Admin Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#bdb8ad]/60 shadow-card flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#e8eff4] border border-[#6492b3]/30 text-[#4f7897] flex items-center justify-center mb-4 shadow-2xs">
                <ChefHat className="w-5 h-5" />
              </div>
              <h2 className="font-sans text-xl font-bold text-[#3a3530] mb-1">
                Kitchen POS &amp; Management
              </h2>
              <p className="text-xs text-[#5b554f] mb-5 leading-relaxed font-light">
                Real-time order dispatch board with audio chime, status workflow (Preparing → Ready → Served), menu availability, and separate Manager / Staff roles.
              </p>

              <div className="p-3.5 bg-[#f4f3f0] rounded-xl border border-[#bdb8ad]/60 mb-6 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#8d7d6d] font-medium">Manager:</span>
                  <span className="font-mono text-xs font-semibold text-[#3a3530] bg-white px-2 py-0.5 rounded border border-[#bdb8ad]/60">admin@democafe.com / admin123</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8d7d6d] font-medium">Staff:</span>
                  <span className="font-mono text-xs font-semibold text-[#3a3530] bg-white px-2 py-0.5 rounded border border-[#bdb8ad]/60">staff@democafe.com / staff123</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8d7d6d] font-medium">Live POS:</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Socket.IO Active
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="touch-press btn-glass-secondary border-[#bdb8ad] hover:border-[#6492b3] w-full py-3.5 px-5 rounded-xl shadow-sm flex items-center justify-center gap-2.5 transition-all text-[#3a3530]"
            >
              <span className="font-semibold text-xs tracking-wide">Open Kitchen POS &amp; Admin</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Multi-Table Quick Access Panel */}
        <div className="bg-white rounded-2xl border border-[#bdb8ad]/60 p-5 shadow-card">
          <h3 className="text-xs font-semibold text-[#8d7d6d] mb-3.5 text-center">
            Direct table quick access
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { num: '01', tok: 'tbl_a1b2c3d4' },
              { num: '02', tok: 'tbl_e5f6g7h8' },
              { num: '03', tok: 'tbl_i9j0k1l2' },
              { num: '04', tok: 'tbl_m3n4o5p6' },
              { num: '05', tok: 'tbl_q7r8s9t0' },
              { num: '06', tok: 'tbl_u1v2w3x4' },
              { num: '07', tok: 'tbl_y5z6a7b8' },
              { num: '08', tok: 'tbl_c9d0e1f2' },
              { num: '09', tok: 'tbl_g3h4i5j6' },
              { num: '10', tok: 'tbl_k7l8m9n0' },
            ].map((tbl) => (
              <button
                key={tbl.num}
                type="button"
                onClick={() => navigate(`/menu/demo-cafe/t/${tbl.tok}`)}
                className="touch-press px-3.5 py-2 rounded-xl text-xs font-semibold text-[#3a3530] bg-[#f4f3f0] hover:bg-[#e8eff4] hover:text-[#4f7897] border border-[#bdb8ad]/60 transition-all"
              >
                Table {tbl.num}
              </button>
            ))}
          </div>
        </div>
      </div>

      <footer className="text-center text-xs text-[#8d7d6d] py-6 border-t border-[#bdb8ad]/60 font-normal">
        Sentosa — The Coffee Unit. Gather • Share • Savor.
      </footer>
    </div>
  );
}

function AuthLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1c1917] text-white">
      <p className="text-xs font-semibold text-stone-400">Authenticating session...</p>
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CustomerAuthProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </CustomerAuthProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;


