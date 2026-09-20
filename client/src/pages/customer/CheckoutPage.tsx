import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShieldCheck, CreditCard, Sparkles, AlertCircle, Loader2, User } from 'lucide-react';
import { useCart } from '../../contexts/CartContext.js';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext.js';
import { CustomerAuthModal } from '../../components/customer/CustomerAuthModal.js';
import { api } from '../../services/api.js';
import { VegBadge } from '../../components/common/VegBadge.js';

interface CheckoutPageProps {
  restaurantSlug: string;
  tableToken: string;
  onBackToMenu: () => void;
  onOrderSuccess: (orderToken: string) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  restaurantSlug,
  tableToken,
  onBackToMenu,
  onOrderSuccess,
}) => {
  const { items, subtotal, specialNote, clearCart } = useCart();
  const { customer } = useCustomerAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [tableInfo, setTableInfo] = useState<any>(null);
  const [restaurantInfo, setRestaurantInfo] = useState<any>(null);
  const [sessionToken, setSessionToken] = useState<string>('');

  // Authoritative pricing
  const [serverPricing, setServerPricing] = useState<any>(null);
  const [calculatingPrice, setCalculatingPrice] = useState<boolean>(true);
  const [priceError, setPriceError] = useState<string | null>(null);

  // Payment states
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Pre-fill customer info when logged in
  useEffect(() => {
    if (customer) {
      if (!customerName && customer.name) setCustomerName(customer.name);
      if (!customerPhone && customer.phone) setCustomerPhone(customer.phone);
    }
  }, [customer]);

  useEffect(() => {
    async function initCheckout() {
      try {
        setCalculatingPrice(true);
        setPriceError(null);

        // Fetch menu info to get table session and verified table number
        const menuData = await api.getPublicMenu(restaurantSlug, tableToken);
        setRestaurantInfo(menuData.restaurant);
        setTableInfo(menuData.table);
        if (menuData.tableSessionToken) {
          setSessionToken(menuData.tableSessionToken);
          sessionStorage.setItem(`tbl_sess_${restaurantSlug}`, menuData.tableSessionToken);
        }

        if (items.length === 0) {
          onBackToMenu();
          return;
        }

        // Authoritative server-side price calculation
        const cartPayload = items.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          specialInstructions: i.specialInstructions,
          selectedOptionIds: i.selectedOptionIds || [],
        }));

        const pricing = await api.getPricingPreview(menuData.restaurant.id, cartPayload);
        setServerPricing(pricing);
      } catch (err: any) {
        console.error('Checkout error:', err);
        setPriceError('Unable to verify menu pricing with café kitchen. Please try again.');
      } finally {
        setCalculatingPrice(false);
      }
    }

    initCheckout();
  }, [restaurantSlug, tableToken, items]);

  const handlePayment = async (forceSandbox = false) => {
    if (items.length === 0) return;

    // Compulsory customer authentication gate
    if (!customer) {
      setIsAuthModalOpen(true);
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      const activeSessionToken = sessionToken || sessionStorage.getItem(`tbl_sess_${restaurantSlug}`);

      // Order creation payload securely bound with tableSessionToken
      const orderPayload = {
        tableSessionToken: activeSessionToken || undefined,
        restaurantSlug,
        tableToken,
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          specialInstructions: i.specialInstructions,
          selectedOptionIds: i.selectedOptionIds || [],
        })),
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerNote: specialNote.trim() || undefined,
      };

      const draftOrder = await api.createOrder(orderPayload);
      const { orderToken, razorpay } = draftOrder;

      const isMockMode = forceSandbox || razorpay.isSandboxMock || typeof (window as any).Razorpay === 'undefined';

      if (isMockMode) {
        // Safe demo sandbox payment verification
        const verifyRes = await api.simulateSandboxPayment(orderToken);
        if (verifyRes.success) {
          clearCart();
          onOrderSuccess(orderToken);
          return;
        }
      }

      // Official Razorpay Checkout Modal
      const RazorpaySDK = (window as any).Razorpay;
      if (!RazorpaySDK) {
        throw new Error('Razorpay SDK unavailable. Please use Demo Sandbox Pay.');
      }

      const options = {
        key: razorpay.keyId,
        amount: razorpay.amount,
        currency: razorpay.currency,
        name: restaurantInfo?.name || 'Café Order',
        description: `Order #${draftOrder.orderNumber} - Table ${tableInfo?.tableNumber}`,
        order_id: razorpay.gatewayOrderId,
        prefill: {
          name: customerName,
          contact: customerPhone,
        },
        theme: {
          color: '#6492b3',
        },
        handler: async (response: any) => {
          try {
            const verifyRes = await api.verifyPayment({
              orderToken,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            if (verifyRes.success) {
              clearCart();
              onOrderSuccess(orderToken);
            } else {
              setPaymentError('Payment verification was not completed by server.');
              setIsProcessing(false);
            }
          } catch (verErr: any) {
            setPaymentError('Payment verification could not be confirmed.');
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      const rzpInstance = new RazorpaySDK(options);
      rzpInstance.on('payment.failed', () => {
        setPaymentError('Payment could not be completed. Please try again.');
        setIsProcessing(false);
      });
      rzpInstance.open();
    } catch (err: any) {
      console.error('Payment error:', err);
      setPaymentError(err.message || 'Could not place order. Please ask staff for assistance.');
      setIsProcessing(false);
    }
  };

  if (calculatingPrice) {
    return (
      <div className="min-h-screen bg-[#ebeae7] paper-canvas flex flex-col items-center justify-center p-4">
        <Loader2 className="w-6 h-6 text-[#6492b3] animate-spin mb-2" />
        <p className="text-xs font-medium text-[#5b554f]">Verifying prices with kitchen...</p>
      </div>
    );
  }

  const currencySymbol = restaurantInfo?.currencySymbol || '₹';
  const finalSubtotal = serverPricing?.subtotal ?? subtotal;
  const finalTax = serverPricing?.taxAmount ?? 0;
  const finalService = serverPricing?.serviceCharge ?? 0;
  const grandTotal = serverPricing?.totalAmount ?? (finalSubtotal + finalTax + finalService);

  return (
    <div className="min-h-screen bg-[#ebeae7] paper-canvas pb-24">
      {/* Top Bar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-[#bdb8ad]/60 sticky top-0 z-30 px-5 py-3">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button
            onClick={onBackToMenu}
            disabled={isProcessing}
            className="w-9 h-9 rounded-full bg-[#f4f3f0] flex items-center justify-center text-[#3a3530] hover:bg-[#bdb8ad]/30 transition-all active:scale-95"
            aria-label="Back to menu"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-sans text-base font-bold text-[#3a3530] leading-tight">
              Checkout & Payment
            </h1>
            <p className="text-[11px] text-[#8d7d6d] font-normal">
              {restaurantInfo?.name && restaurantInfo.name !== 'Demo Café' ? restaurantInfo.name : 'Sentosa — The Coffee Unit'}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 sm:px-5 pt-4 pb-12 space-y-4">
        {/* Error Alert */}
        {(priceError || paymentError) && (
          <div className="bg-semantic-danger-bg border border-semantic-danger-border rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-semantic-danger flex-shrink-0 mt-0.5" />
            <p className="text-xs text-semantic-danger leading-relaxed">
              {priceError || paymentError}
            </p>
          </div>
        )}

        {/* 1. Dining Table Reassurance Card */}
        <div className="bg-white rounded-2xl p-4 border border-[#bdb8ad]/60 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#8d7d6d] block">
              Dining table
            </span>
            <div className="text-base font-bold text-[#3a3530] mt-0.5">
              Table {tableInfo?.tableNumber}
            </div>
          </div>
          <div className="bg-emerald-50 text-emerald-900 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>Table connected</span>
          </div>
        </div>

        {/* 2. Itemized Order Summary */}
        <div className="bg-white rounded-2xl p-5 border border-[#bdb8ad]/60 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[#3a3530]">
              Selected dishes ({items.length})
            </h2>
            <button
              type="button"
              onClick={onBackToMenu}
              className="text-xs text-[#6492b3] font-semibold hover:underline"
            >
              Add more
            </button>
          </div>

          <div className="divide-y divide-[#bdb8ad]/40">
            {items.map((item) => (
              <div key={item.cartLineId || item.menuItemId} className="py-3 first:pt-1 last:pb-0 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <VegBadge isVeg={item.isVeg} size="sm" className="flex-shrink-0" />
                    <span className="text-xs font-semibold text-[#3a3530]">
                      {item.name}
                    </span>
                    <span className="text-xs text-[#8d7d6d] font-medium">
                      × {item.quantity}
                    </span>
                  </div>

                  {/* Customizations */}
                  {item.customizations && item.customizations.length > 0 && (
                    <div className="mt-1 space-y-0.5 pl-4">
                      {item.customizations.map((c, idx) => (
                        <div key={idx} className="text-[11px] text-[#5b554f] font-light flex items-center gap-1.5">
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
                    <p className="text-[11px] text-amber-900 mt-0.5 font-light italic pl-4">
                      ↳ {item.specialInstructions}
                    </p>
                  )}
                </div>
                <div className="text-xs font-bold text-[#3a3530] whitespace-nowrap font-mono">
                  {currencySymbol}{(item.price * item.quantity).toFixed(0)}
                </div>
              </div>
            ))}
          </div>

          {specialNote && (
            <div className="pt-2 text-xs text-[#5b554f] bg-[#f4f3f0] p-3 rounded-xl border border-[#bdb8ad]/60">
              <span className="font-semibold text-[#3a3530]">Kitchen note: </span>
              {specialNote}
            </div>
          )}
        </div>

        {/* 3. Customer Account & Details */}
        {customer ? (
          <div className="bg-white rounded-2xl p-5 border border-[#bdb8ad]/60 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-[#3a3530]">
                Customer Account
              </h2>
              <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-semibold">
                Signed in as {customer.name.split(' ')[0]} ✓
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#5b554f] mb-1">Your name</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-base sm:text-xs p-3 min-h-[44px] bg-white border border-[#bdb8ad]/80 rounded-xl focus:border-[#6492b3] outline-none text-[#3a3530] placeholder-[#8d7d6d] transition-colors shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#5b554f] mb-1">Phone number</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full text-base sm:text-xs p-3 min-h-[44px] bg-white border border-[#bdb8ad]/80 rounded-xl focus:border-[#6492b3] outline-none text-[#3a3530] placeholder-[#8d7d6d] transition-colors shadow-2xs"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 border border-[#bdb8ad]/60 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-[#3a3530]">
                Customer Account
              </h2>
              <span className="text-[11px] text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 font-semibold">
                Sign in required to pay
              </span>
            </div>
            <p className="text-xs text-[#8d7d6d] font-light leading-relaxed">
              Please sign in or create a quick account before placing your order. All your cart items, customizations, and table session remain 100% preserved.
            </p>
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="touch-press btn-glass-secondary border-[#bdb8ad] hover:border-[#6492b3] text-[#3a3530] w-full py-3 px-4 min-h-[44px] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs transition-all active:scale-95"
            >
              <User className="w-4 h-4 text-[#6492b3]" />
              <span>Sign in or create account to continue</span>
            </button>
          </div>
        )}

        {/* 4. Payment Bill Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-[#bdb8ad]/60 shadow-2xs space-y-2 text-xs text-[#5b554f] font-normal">
          <h2 className="text-xs font-semibold text-[#3a3530] mb-2">
            Bill details
          </h2>
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-semibold text-[#3a3530] font-mono">{currencySymbol}{finalSubtotal.toFixed(2)}</span>
          </div>

          {restaurantInfo?.taxRate > 0 && (
            <div className="flex justify-between text-[#8d7d6d]">
              <span>GST ({restaurantInfo.taxRate}%)</span>
              <span className="font-mono">{currencySymbol}{finalTax.toFixed(2)}</span>
            </div>
          )}

          {restaurantInfo?.serviceChargeRate > 0 && (
            <div className="flex justify-between text-[#8d7d6d]">
              <span>Service charge ({restaurantInfo.serviceChargeRate}%)</span>
              <span className="font-mono">{currencySymbol}{finalService.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between items-center text-sm font-bold text-[#3a3530] pt-3 border-t border-[#bdb8ad]/60">
            <span>Total payable</span>
            <span className="font-mono text-base font-black">{currencySymbol}{grandTotal.toFixed(2)}</span>
          </div>
          <div className="text-[11px] text-[#8d7d6d] flex items-center gap-1.5 mt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-semantic-success flex-shrink-0" />
            <span>Calculated and verified authoritatively by café kitchen</span>
          </div>
        </div>

        {/* 5. Payment Action CTAs */}
        <div className="space-y-3 pt-2">
          {!customer ? (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="touch-press btn-primary w-full py-3.5 px-4 min-h-[48px] rounded-2xl flex items-center justify-center gap-2 shadow-sm text-xs font-bold tracking-wide transition-all active:scale-[0.98] text-white"
            >
              <User className="w-4 h-4 text-white" />
              <span>Sign in to Place Order ({currencySymbol}{grandTotal.toFixed(2)})</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handlePayment(false)}
                disabled={isProcessing || Boolean(priceError)}
                className="btn-primary w-full py-3.5 px-4 min-h-[48px] rounded-2xl flex items-center justify-center gap-2 shadow-sm text-xs font-bold tracking-wide transition-all active:scale-[0.98]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Processing payment...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 text-white" />
                    <span>Pay online {currencySymbol}{grandTotal.toFixed(2)}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handlePayment(true)}
                disabled={isProcessing || Boolean(priceError)}
                className="btn-glass-secondary border-[#bdb8ad] hover:border-[#6492b3] w-full py-3.5 px-4 min-h-[48px] rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold transition-all shadow-2xs active:scale-[0.98] text-[#3a3530]"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#6492b3]" />
                <span>Demonstration pay (instant sandbox verification)</span>
              </button>
            </>
          )}
        </div>

      </main>

      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        restaurantSlug={restaurantSlug}
        prefillName={customerName}
        prefillPhone={customerPhone}
        onSuccess={() => {
          setIsAuthModalOpen(false);
        }}
      />
    </div>
  );
};
