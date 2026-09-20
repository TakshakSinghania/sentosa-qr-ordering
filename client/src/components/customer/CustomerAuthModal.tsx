import React, { useState, useEffect, useRef } from 'react';
import { X, Coffee, AlertCircle, Loader2, ArrowRight, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext.js';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantSlug?: string;
  onSuccess?: () => void;
  prefillName?: string;
  prefillPhone?: string;
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  restaurantSlug = 'demo-cafe',
  onSuccess,
  prefillName = '',
  prefillPhone = '',
}) => {
  const { sendOtp, verifyOtp } = useCustomerAuth();

  // Steps: 'phone' (Name + Mobile Number) -> 'otp' (6-Digit Code)
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [name, setName] = useState<string>(prefillName);
  const [phone, setPhone] = useState<string>(prefillPhone);
  const [displayPhone, setDisplayPhone] = useState<string>('');
  const [isExistingCustomer, setIsExistingCustomer] = useState<boolean>(false);

  // 6 individual OTP digits
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);
  const [resending, setResending] = useState<boolean>(false);

  // Focus management
  const phoneInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('phone');
      setError(null);
      setOtpDigits(['', '', '', '', '', '']);
      if (prefillName) setName(prefillName);
      if (prefillPhone) {
        // Strip prefix if any for cleaner input
        const clean = prefillPhone.replace(/^\+91\s?/, '');
        setPhone(clean);
      }
      setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, prefillName, prefillPhone]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Auto-focus first OTP input when step switches to 'otp'
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  if (!isOpen) return null;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits and spaces
    const val = e.target.value.replace(/[^\d\s]/g, '');
    setPhone(val);
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);

    try {
      const res = await sendOtp(phone, name.trim() || undefined, restaurantSlug);
      setDisplayPhone(res.phone);
      setCooldown(res.resendCooldownSeconds || 30);
      setIsExistingCustomer(Boolean(res.isExistingCustomer));
      if (res.customerName && !name.trim()) {
        setName(res.customerName);
      }
      setStep('otp');
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err: any) {
      setError(err.message || 'Unable to send verification code. Please check your mobile number.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || resending) return;
    setError(null);
    setResending(true);

    try {
      const res = await sendOtp(phone, name.trim() || undefined, restaurantSlug);
      setCooldown(res.resendCooldownSeconds || 30);
      setOtpDigits(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || 'Unable to resend verification code. Please wait.');
    } finally {
      setResending(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      const next = [...otpDigits];
      next[index] = '';
      setOtpDigits(next);
      return;
    }

    // Handle single digit entry
    const char = clean.slice(-1);
    const next = [...otpDigits];
    next[index] = char;
    setOtpDigits(next);

    // Auto-advance to next input
    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      // Focus previous input on backspace if current is empty
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const next = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] || '';
    }
    setOtpDigits(next);

    const focusIdx = Math.min(pasted.length, 5);
    otpInputRefs.current[focusIdx]?.focus();
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = otpDigits.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await verifyOtp(phone, code, name.trim() || undefined, restaurantSlug);
      setLoading(false);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "That code doesn't look right. Please try again.");
    }
  };

  const isOtpComplete = otpDigits.every((d) => d.length === 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-sm animate-fadeIn">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative w-full max-w-sm sm:max-w-md bg-[#ebeae7] paper-canvas rounded-2xl sm:rounded-3xl border border-[#bdb8ad]/80 shadow-2xl p-5 sm:p-7 z-10 animate-scaleUp overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-[#5b554f] hover:text-[#3a3530] border border-[#bdb8ad]/60 flex items-center justify-center transition-all active:scale-95"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-5 sm:mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#e8eff4] text-[#4f7897] mb-2.5 border border-[#6492b3]/30 shadow-2xs">
            <Coffee className="w-6 h-6 stroke-[2]" />
          </div>
          <h3 className="font-sans text-lg sm:text-xl font-bold text-[#3a3530] tracking-tight">
            {step === 'phone'
              ? 'Welcome to Sentosa'
              : isExistingCustomer
              ? 'Welcome back!'
              : 'Verify your number'}
          </h3>
          <p className="text-xs text-[#8d7d6d] mt-1 font-normal leading-relaxed max-w-xs mx-auto">
            {step === 'phone'
              ? 'Enter your details to continue your order.'
              : `Enter the 6-digit code sent to ${displayPhone || phone}`}
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* STEP 1: Phone & Name Form */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#8d7d6d] uppercase tracking-wider mb-1.5">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E.g. Aria"
                className="w-full px-3.5 py-2.5 min-h-[44px] bg-white border border-[#bdb8ad]/80 rounded-xl text-base sm:text-sm text-[#3a3530] placeholder-[#8d7d6d] focus:border-[#6492b3] focus:ring-2 focus:ring-[#6492b3]/20 outline-none transition-all shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8d7d6d] uppercase tracking-wider mb-1.5">
                Mobile Number
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-3 py-2.5 min-h-[44px] bg-white border border-[#bdb8ad]/80 rounded-xl text-sm font-semibold text-[#3a3530] shadow-2xs select-none">
                  <span className="text-base leading-none">🇮🇳</span>
                  <span>+91</span>
                </div>
                <input
                  ref={phoneInputRef}
                  type="tel"
                  inputMode="tel"
                  pattern="[0-9]*"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="98765 43210"
                  required
                  className="flex-1 px-3.5 py-2.5 min-h-[44px] bg-white border border-[#bdb8ad]/80 rounded-xl text-base sm:text-sm font-medium text-[#3a3530] placeholder-[#8d7d6d] focus:border-[#6492b3] focus:ring-2 focus:ring-[#6492b3]/20 outline-none transition-all shadow-2xs"
                />
              </div>
              <p className="text-[11px] text-[#8d7d6d] mt-1.5 font-light">
                We'll send a 6-digit verification code to this mobile number.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || phone.replace(/\D/g, '').length < 10}
              className="touch-press btn-primary w-full py-3 px-4 min-h-[44px] rounded-xl text-white text-xs font-semibold shadow-subtle flex items-center justify-center gap-2 transition-all mt-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending code...</span>
                </>
              ) : (
                <>
                  <span>Send OTP</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: 6-Digit OTP Verification Form */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[11px] font-semibold text-[#8d7d6d] uppercase tracking-wider">
                  Verification Code
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setError(null);
                  }}
                  className="text-xs font-semibold text-[#6492b3] hover:underline flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Change number</span>
                </button>
              </div>

              {/* 6 Individual Numeric OTP Boxes */}
              <div className="flex items-center justify-between gap-1.5 sm:gap-2" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold text-[#3a3530] bg-white border border-[#bdb8ad]/80 focus:border-[#6492b3] focus:ring-2 focus:ring-[#6492b3]/20 rounded-xl outline-none shadow-2xs transition-all"
                    autoComplete="one-time-code"
                  />
                ))}
              </div>
            </div>

            {/* Resend Cooldown Counter */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[#8d7d6d] font-light">Didn't get the code?</span>
              {cooldown > 0 ? (
                <span className="font-medium text-[#8d7d6d]">
                  Resend OTP in <strong className="text-[#3a3530] font-semibold">{cooldown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resending}
                  className="font-semibold text-[#6492b3] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {resending && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Resend OTP</span>
                </button>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isOtpComplete}
              className="touch-press btn-primary w-full py-3 px-4 min-h-[44px] rounded-xl text-white text-xs font-semibold shadow-subtle flex items-center justify-center gap-2 transition-all mt-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Verify &amp; Continue</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-5 pt-3.5 border-t border-[#bdb8ad]/40 text-center">
          <p className="text-[11px] text-[#8d7d6d] font-light">
            Fast, secure phone verification. No passwords to remember.
          </p>
        </div>
      </div>
    </div>
  );
};
