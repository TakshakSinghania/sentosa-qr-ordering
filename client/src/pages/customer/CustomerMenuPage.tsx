import React, { useEffect, useState, useMemo, useRef } from 'react';
import { RestaurantInfo, TableInfo, MenuCategory, MenuItem, CartItem, OrderItemCustomization } from '../../types/index.js';
import { api } from '../../services/api.js';
import { getSocket } from '../../services/socket.js';
import { useCart } from '../../contexts/CartContext.js';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext.js';
import { MenuHeader } from '../../components/customer/MenuHeader.js';
import { MenuItemCard } from '../../components/customer/MenuItemCard.js';
import { ItemDetailModal } from '../../components/customer/ItemDetailModal.js';
import { CartDrawer } from '../../components/customer/CartDrawer.js';
import { CallWaiterModal } from '../../components/customer/CallWaiterModal.js';
import { CustomerAuthModal } from '../../components/customer/CustomerAuthModal.js';
import { CustomerOrderHistoryModal } from '../../components/customer/CustomerOrderHistoryModal.js';
import { TableFavoritesSection } from '../../components/customer/TableFavoritesSection.js';
import { Utensils, ArrowRight } from 'lucide-react';

interface CustomerMenuPageProps {
  restaurantSlug: string;
  tableToken: string;
  onNavigateToCheckout: () => void;
  onNavigateToOrder?: (orderToken: string) => void;
}

export const CustomerMenuPage: React.FC<CustomerMenuPageProps> = ({
  restaurantSlug,
  tableToken,
  onNavigateToCheckout,
  onNavigateToOrder,
}) => {
  const { initSession, addItem, editCartItem, updateQuantity, items: cartItems } = useCart();
  const { activeOrdersCount, activeOrders } = useCustomerAuth();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);

  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [table, setTable] = useState<TableInfo | null>(null);
  const [tableSessionToken, setTableSessionToken] = useState<string>('');
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [tableFavorites, setTableFavorites] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [vegOnly, setVegOnly] = useState<boolean>(false);

  // Dedicated central menu scroll container & auto-hiding header refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(160);
  const [isHeaderVisible, setIsHeaderVisible] = useState<boolean>(true);
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const lastScrollTopRef = useRef<number>(0);
  const scrollAccumulatorRef = useRef<number>(0);

  // Customization modal state
  const [selectedDetailItem, setSelectedDetailItem] = useState<MenuItem | null>(null);
  const [editingCartLine, setEditingCartLine] = useState<CartItem | null>(null);

  // Waiter modal & status
  const [isWaiterModalOpen, setIsWaiterModalOpen] = useState<boolean>(false);
  const [waiterStatus, setWaiterStatus] = useState<'PENDING' | 'ACKNOWLEDGED' | null>(null);

  useEffect(() => {
    initSession(restaurantSlug, tableToken);

    async function loadMenu() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getPublicMenu(restaurantSlug, tableToken);
        setRestaurant(data.restaurant);
        setTable(data.table);
        setCategories(data.categories);

        const sessToken = data.tableSessionToken;
        if (sessToken) {
          setTableSessionToken(sessToken);
          sessionStorage.setItem(`tbl_sess_${restaurantSlug}`, sessToken);

          // Check active waiter call status
          api.getWaiterStatus(sessToken)
            .then((res) => {
              if (res.activeRequest && (res.activeRequest.status === 'PENDING' || res.activeRequest.status === 'ACKNOWLEDGED')) {
                setWaiterStatus(res.activeRequest.status);
              }
            })
            .catch(() => {});

          // Load table-specific popular recommendations
          api.getTableFavorites(restaurantSlug, tableToken, sessToken)
            .then((favData) => {
              if (favData && favData.enabled && Array.isArray(favData.items)) {
                setTableFavorites(favData.items);
              } else {
                setTableFavorites([]);
              }
            })
            .catch(() => {
              setTableFavorites([]);
            });
        }
      } catch (err: any) {
        setError(err.message || 'This table QR code is no longer active. Please ask café staff.');
      } finally {
        setLoading(false);
      }
    }

    loadMenu();
  }, [restaurantSlug, tableToken]);

  // Real-time socket updates for waiter status
  useEffect(() => {
    if (!table?.tableNumber) return;

    const socket = getSocket();
    const handleWaiterUpdate = (data: any) => {
      if (data.tableNumber === table.tableNumber) {
        if (data.status === 'COMPLETED' || data.status === 'CANCELLED') {
          setWaiterStatus(null);
        } else {
          setWaiterStatus(data.status);
        }
      }
    };

    socket.on('waiter:status_updated', handleWaiterUpdate);

    return () => {
      socket.off('waiter:status_updated', handleWaiterUpdate);
    };
  }, [table?.tableNumber]);

  const cartQuantityMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cartItems) {
      map.set(item.menuItemId, (map.get(item.menuItemId) || 0) + item.quantity);
    }
    return map;
  }, [cartItems]);

  const filteredCategories = useMemo(() => {
    return categories
      .map((cat) => {
        const filteredItems = cat.items.filter((item) => {
          if (vegOnly && !item.isVeg) return false;
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            return item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
          }
          return true;
        });

        if (filteredItems.length === 0) return null;

        return {
          ...cat,
          items: filteredItems,
        };
      })
      .filter(Boolean) as MenuCategory[];
  }, [categories, searchQuery, vegOnly]);

  const filteredTableFavorites = useMemo(() => {
    if (searchQuery.trim()) return [];
    return tableFavorites.filter((item) => {
      if (vegOnly && !item.isVeg) return false;
      return true;
    });
  }, [tableFavorites, searchQuery, vegOnly]);

  // Dynamically measure header height across screen widths and orientation changes
  useEffect(() => {
    if (!headerRef.current) return;
    const updateHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, [categories.length]);

  const handleSelectCategory = (categoryId: string) => {
    setActiveCategory(categoryId);
    if (!scrollContainerRef.current) return;

    isProgrammaticScrollRef.current = true;
    setIsHeaderVisible(true);

    if (categoryId === 'all') {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
        lastScrollTopRef.current = 0;
        scrollAccumulatorRef.current = 0;
      }, 600);
      return;
    }

    const targetElement = scrollContainerRef.current.querySelector(
      `[data-category-id="${categoryId}"]`
    ) as HTMLElement;

    if (targetElement) {
      const containerTop = scrollContainerRef.current.getBoundingClientRect().top;
      const elementTop = targetElement.getBoundingClientRect().top;
      const currentScroll = scrollContainerRef.current.scrollTop;
      const targetScroll = currentScroll + (elementTop - containerTop) - (headerHeight + 12);

      scrollContainerRef.current.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth',
      });
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
        if (scrollContainerRef.current) {
          lastScrollTopRef.current = scrollContainerRef.current.scrollTop;
        }
        scrollAccumulatorRef.current = 0;
      }, 600);
    }
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const currentScrollTop = container.scrollTop;
    const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);

    // 1. Scroll-spy: update active category tab based on dishes in view
    const categorySections = container.querySelectorAll<HTMLElement>('[data-category-id]');
    let currentId = 'all';
    const containerTop = container.getBoundingClientRect().top;

    for (const section of categorySections) {
      const rect = section.getBoundingClientRect();
      if (rect.top - containerTop <= (isHeaderVisible ? headerHeight + 20 : 60)) {
        currentId = section.getAttribute('data-category-id') || 'all';
      }
    }
    setActiveCategory(currentId);

    // 2. Ignore during programmatic smooth scrolling
    if (isProgrammaticScrollRef.current) {
      lastScrollTopRef.current = currentScrollTop;
      return;
    }

    // 3. Top of page: ALWAYS reveal header
    if (currentScrollTop <= 15) {
      setIsHeaderVisible(true);
      scrollAccumulatorRef.current = 0;
      lastScrollTopRef.current = currentScrollTop;
      return;
    }

    // 4. Accessibility guard: if user is typing in search or clicking a button in header, do not hide
    if (headerRef.current && headerRef.current.contains(document.activeElement)) {
      setIsHeaderVisible(true);
      lastScrollTopRef.current = currentScrollTop;
      return;
    }

    // 5. Bottom boundary guard:
    // When user reaches or is near the bottom (within 15px of maxScroll),
    // and the header is currently hidden, it MUST stay hidden.
    // Elastic overscroll bounces or micro-movements at the bottom must never reveal the header.
    if (currentScrollTop >= maxScroll - 15 && !isHeaderVisible) {
      lastScrollTopRef.current = currentScrollTop;
      scrollAccumulatorRef.current = 0;
      return;
    }

    // 6. Delta & threshold detection:
    // Clamp effective positions to [0, maxScroll] so rubber-band bounce rebound (from > maxScroll back to maxScroll) produces delta = 0
    const effectiveCurrent = Math.min(Math.max(0, currentScrollTop), maxScroll);
    const effectiveLast = Math.min(Math.max(0, lastScrollTopRef.current), maxScroll);
    const delta = effectiveCurrent - effectiveLast;

    const SCROLL_THRESHOLD = 14;

    // Reset accumulator on direction reversal
    if ((delta > 0 && scrollAccumulatorRef.current < 0) || (delta < 0 && scrollAccumulatorRef.current > 0)) {
      scrollAccumulatorRef.current = 0;
    }
    scrollAccumulatorRef.current += delta;

    if (scrollAccumulatorRef.current > SCROLL_THRESHOLD) {
      // Meaningful scroll DOWN -> hide header
      setIsHeaderVisible(false);
      scrollAccumulatorRef.current = 0;
    } else if (scrollAccumulatorRef.current < -SCROLL_THRESHOLD) {
      // Genuine scroll UP into content -> reveal header
      setIsHeaderVisible(true);
      scrollAccumulatorRef.current = 0;
    }

    lastScrollTopRef.current = currentScrollTop;
  };

  const handleOpenEditItem = (cartItem: CartItem) => {
    // Find base item from menu
    let foundItem: MenuItem | null = null;
    for (const cat of categories) {
      const match = cat.items.find((i) => i.id === cartItem.menuItemId);
      if (match) {
        foundItem = match;
        break;
      }
    }

    if (foundItem) {
      setEditingCartLine(cartItem);
      setSelectedDetailItem(foundItem);
    }
  };

  const handleModalAddToCart = (
    item: MenuItem,
    quantity: number,
    instructions?: string,
    selectedOptionIds: string[] = [],
    customizations: OrderItemCustomization[] = []
  ) => {
    if (editingCartLine) {
      editCartItem(editingCartLine.cartLineId, quantity, instructions, selectedOptionIds, customizations);
      setEditingCartLine(null);
    } else {
      addItem(item, quantity, instructions, selectedOptionIds, customizations);
    }
  };

  // Premium Subtle Skeleton Loader
  if (loading) {
    return (
      <div className="min-h-screen bg-[#ebeae7] paper-canvas p-4 sm:p-5 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between pt-4 border-b border-[#bdb8ad]/60 pb-4">
          <div className="space-y-2">
            <div className="w-36 h-5 bg-[#bdb8ad]/40 rounded animate-pulse" />
            <div className="w-24 h-3 bg-[#bdb8ad]/30 rounded animate-pulse" />
          </div>
          <div className="w-20 h-7 bg-[#bdb8ad]/30 rounded-full animate-pulse" />
        </div>
        <div className="space-y-4 pt-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 bg-white border border-[#bdb8ad]/60 rounded-xl p-4 flex gap-4 animate-pulse">
              <div className="flex-1 space-y-2.5">
                <div className="w-32 h-4 bg-[#bdb8ad]/30 rounded" />
                <div className="w-full h-3 bg-[#bdb8ad]/20 rounded" />
                <div className="w-16 h-4 bg-[#bdb8ad]/30 rounded mt-2" />
              </div>
              <div className="w-20 h-20 bg-[#bdb8ad]/20 rounded-lg flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Graceful Error State
  if (error || !restaurant || !table) {
    return (
      <div className="min-h-screen bg-[#ebeae7] paper-canvas flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 bg-white border border-[#bdb8ad] rounded-full flex items-center justify-center text-[#5b554f] mb-4 shadow-2xs">
          <Utensils className="w-5 h-5 text-[#6492b3]" />
        </div>
        <h2 className="font-sans text-lg font-bold text-[#3a3530] mb-1.5">
          Table QR Code Inactive
        </h2>
        <p className="text-xs text-[#5b554f] max-w-sm mb-6 leading-relaxed font-light">
          {error || 'This dining table QR code has expired or is no longer active. Please request assistance from café staff.'}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold shadow-subtle"
        >
          Refresh Menu
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen h-[100dvh] w-full overflow-hidden flex flex-col relative bg-[#ebeae7]">
      {/* LAYER 1 & 2: Fixed Viewport Background & Stationary Sentosa Illustrations */}
      <div 
        className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden paper-canvas" 
        aria-hidden="true"
      >
        {/* Left Stationary Artwork: Walking Character with Coffee */}
        <div 
          className="absolute left-[-15px] sm:left-[2vw] md:left-[3vw] lg:left-[4vw] xl:left-[6vw] top-32 sm:top-36 lg:top-44 w-28 sm:w-44 md:w-56 lg:w-[260px] xl:w-[300px] opacity-25 sm:opacity-35 lg:opacity-85 transition-opacity duration-300"
        >
          <img
            src="/brand/illustration-stroll.png"
            alt=""
            className="w-full h-auto object-contain drop-shadow-none"
            loading="eager"
          />
        </div>

        {/* Right Stationary Artwork: Running Character with Coffee & Croissant (Vertically Offset) */}
        <div 
          className="absolute right-[-20px] sm:right-[2vw] md:right-[3vw] lg:right-[4vw] xl:right-[6vw] top-[380px] sm:top-[440px] lg:top-[500px] xl:top-[540px] w-32 sm:w-48 md:w-64 lg:w-[290px] xl:w-[340px] opacity-25 sm:opacity-35 lg:opacity-85 transition-opacity duration-300"
        >
          <img
            src="/brand/illustration-run.png"
            alt=""
            className="w-full h-auto object-contain drop-shadow-none"
            loading="eager"
          />
        </div>
      </div>

      {/* HEADER: Pinned at top of viewport, smoothly auto-hides on scroll down, reveals on scroll up */}
      <div 
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-30 transition-transform duration-300 ease-in-out will-change-transform"
        style={{
          transform: isHeaderVisible ? 'translateY(0)' : 'translateY(-100%)',
        }}
      >
        <MenuHeader
          restaurant={restaurant}
          tableNumber={table.tableNumber}
          categories={categories}
          activeCategoryId={activeCategory}
          onSelectCategory={handleSelectCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          vegOnly={vegOnly}
          onToggleVegOnly={() => setVegOnly((v) => !v)}
          onCallWaiterClick={() => setIsWaiterModalOpen(true)}
          waiterStatus={waiterStatus}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onOpenOrderHistory={() => setIsHistoryModalOpen(true)}
        />
      </div>

      {/* LAYER 3: Dedicated Central Menu Scroll Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        tabIndex={0}
        aria-label="Menu dishes and selections"
        className="flex-1 h-full w-full menu-scroll-container overflow-y-auto overflow-x-hidden relative z-10 focus:outline-none"
      >
        <main 
          className="max-w-3xl mx-auto px-4 sm:px-5 pb-36 sm:pb-44 pb-safe space-y-7 sm:space-y-8"
          style={{
            paddingTop: `${headerHeight + 16}px`,
          }}
        >
          {/* Table-Specific Popular Recommendations */}
          <TableFavoritesSection
            items={filteredTableFavorites}
            currencySymbol={restaurant.currencySymbol}
            cartQuantityMap={cartQuantityMap}
            onOpenDetail={(i) => {
              setEditingCartLine(null);
              setSelectedDetailItem(i);
            }}
            onQuickAdd={(i) => addItem(i, 1)}
            isRestaurantOpen={restaurant.isOpen}
          />

          {filteredCategories.length === 0 ? (
            <div className="text-center py-16 px-6 flex flex-col items-center">
              <div className="w-28 h-36 mb-3 flex items-center justify-center">
                <img
                  src="/brand/illustration-stroll.png"
                  alt="Sentosa hand-drawn illustration of a person strolling with coffee"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="font-sans text-base font-bold text-[#3a3530]">Nothing here yet</p>
              <p className="text-xs text-[#8d7d6d] mt-1 font-normal max-w-xs leading-relaxed">
                Try searching another coffee, treat, or clear your filters.
              </p>
            </div>
          ) : (
            filteredCategories.map((cat) => (
              <section 
                key={cat.id} 
                id={`category-${cat.id}`}
                data-category-id={cat.id}
                className="space-y-3.5 scroll-mt-4"
              >
                <div className="flex items-baseline justify-between border-b border-[#bdb8ad]/60 pb-2">
                  <h2 className="font-sans text-base md:text-lg font-bold text-[#3a3530] tracking-tight">
                    {cat.name}
                  </h2>
                  <span className="text-[11px] text-[#8d7d6d] font-normal">
                    {cat.items.length} {cat.items.length === 1 ? 'selection' : 'selections'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {cat.items.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      currencySymbol={restaurant.currencySymbol}
                      cartQuantity={cartQuantityMap.get(item.id) || 0}
                      onOpenDetail={(i) => {
                        setEditingCartLine(null);
                        setSelectedDetailItem(i);
                      }}
                      onQuickAdd={(i) => addItem(i, 1)}
                      onUpdateQuantity={(id, q) => updateQuantity(id, q)}
                      isRestaurantOpen={restaurant.isOpen}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </main>
      </div>

      {/* Item Customization Modal */}
      {selectedDetailItem && (
        <ItemDetailModal
          item={selectedDetailItem}
          currencySymbol={restaurant.currencySymbol}
          onClose={() => {
            setSelectedDetailItem(null);
            setEditingCartLine(null);
          }}
          onAddToCart={handleModalAddToCart}
          isRestaurantOpen={restaurant.isOpen}
          editMode={Boolean(editingCartLine)}
          initialQuantity={editingCartLine?.quantity || 1}
          initialInstructions={editingCartLine?.specialInstructions || ''}
          initialOptionIds={editingCartLine?.selectedOptionIds || []}
        />
      )}

      {/* Minimalist Floating Bottom Cart Bar */}
      <CartDrawer
        currencySymbol={restaurant.currencySymbol}
        taxRate={restaurant.taxRate}
        serviceChargeRate={restaurant.serviceChargeRate}
        onProceedToCheckout={onNavigateToCheckout}
        onEditItem={handleOpenEditItem}
      />

      {/* Floating Active Order Status Bar */}
      {activeOrdersCount > 0 && (
        <aside
          aria-label="Active order status"
          className={`fixed left-0 right-0 z-30 px-4 pointer-events-none transition-all duration-300 ${
            cartItems.length > 0 ? 'bottom-20 sm:bottom-22' : 'bottom-4 sm:bottom-6'
          }`}
        >
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              type="button"
              onClick={() => {
                if (activeOrders.length === 1 && onNavigateToOrder) {
                  onNavigateToOrder(activeOrders[0].orderToken);
                } else {
                  setIsHistoryModalOpen(true);
                }
              }}
              className="w-full bg-[#3a3530]/95 hover:bg-[#3a3530] text-white py-3 px-4 rounded-2xl shadow-xl backdrop-blur-md border border-[#5b554f]/50 flex items-center justify-between gap-3 transition-all active:scale-[0.98] group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                <span className="text-xs font-semibold truncate">
                  {activeOrders.length === 1
                    ? `Order #${activeOrders[0].orderNumber} in progress (${activeOrders[0].status.toLowerCase()})`
                    : `${activeOrdersCount} orders currently in kitchen`}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#6492b3] group-hover:text-white flex-shrink-0">
                <span>View live status</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>
        </aside>
      )}

      {/* Call Waiter Modal */}
      <CallWaiterModal
        isOpen={isWaiterModalOpen}
        onClose={() => setIsWaiterModalOpen(false)}
        tableNumber={table.tableNumber}
        tableSessionToken={tableSessionToken}
        activeStatus={waiterStatus}
        onStatusChange={(status) => setWaiterStatus(status)}
      />

      {/* Customer Authentication Modal */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        restaurantSlug={restaurantSlug}
      />

      {/* Customer Order History Modal */}
      <CustomerOrderHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onSelectOrder={(tok) => {
          setIsHistoryModalOpen(false);
          if (onNavigateToOrder) {
            onNavigateToOrder(tok);
          }
        }}
        onOrderMore={() => setIsHistoryModalOpen(false)}
      />
    </div>
  );
};
