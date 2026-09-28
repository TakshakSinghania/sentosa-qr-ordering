import { OtpProvider, SendOtpParams, SendOtpResult } from './types.js';
import { normalizeIndianPhoneNumber } from '../../utils/phone.js';

/**
 * Recruiter Demo OTP Provider
 *
 * Designed specifically for production recruiter demos where a paid SMS gateway
 * is not configured.
 *
 * Security Invariants:
 * 1. ONLY the single explicitly configured DEMO_OTP_PHONE is allowed.
 * 2. Any other mobile number is strictly rejected.
 * 3. Returns the configured fixed 6-digit DEMO_OTP_CODE for that single number.
 * 4. The resolved code is STILL cryptographically hashed via bcrypt, stored in
 *    the database, rate-limited, and verified through the standard customer authentication pipeline.
 * 5. The OTP code is NEVER exposed in API responses or production logs.
 */
export class DemoOtpProvider implements OtpProvider {
  private demoPhone: string;
  private demoCode: string;
  private rawDemoPhone: string;

  constructor() {
    this.rawDemoPhone = (process.env.DEMO_OTP_PHONE || '').trim();
    const phoneResult = normalizeIndianPhoneNumber(this.rawDemoPhone);

    if (!phoneResult.valid || !phoneResult.normalized) {
      throw new Error(
        'CONFIG ERROR: DEMO_OTP_PHONE must be a valid 10-digit Indian mobile number when OTP_PROVIDER=demo.'
      );
    }

    this.demoPhone = phoneResult.normalized;
    this.demoCode = (process.env.DEMO_OTP_CODE || '').trim();

    if (!/^\d{6}$/.test(this.demoCode)) {
      throw new Error(
        'CONFIG ERROR: DEMO_OTP_CODE must be exactly 6 numeric digits when OTP_PROVIDER=demo.'
      );
    }
  }

  /**
   * Resolves the OTP code before hashing and database storage.
   * If the requested phone matches the configured demo phone, returns the demo code.
   * Rejects any other phone number.
   */
  resolveOtpCode(phone: string, _generatedOtp: string): string {
    const phoneResult = normalizeIndianPhoneNumber(phone);
    const normalized = phoneResult.valid ? phoneResult.normalized : phone;

    if (normalized !== this.demoPhone) {
      const displayExpected = this.rawDemoPhone.replace(/\D/g, '').slice(-10);
      throw new Error(
        `This mobile number is not enabled for recruiter demo access. Please use demo number: ${displayExpected}`
      );
    }

    return this.demoCode;
  }

  /**
   * Dispatches the OTP.
   * For the demo provider, records the delivery event without leaking the OTP code in production.
   */
  async sendOtp({ phone, restaurantName }: SendOtpParams): Promise<SendOtpResult> {
    const phoneResult = normalizeIndianPhoneNumber(phone);
    const normalized = phoneResult.valid ? phoneResult.normalized : phone;

    if (normalized !== this.demoPhone) {
      return {
        success: false,
        error:
          'SMS verification is unavailable for this number in the recruiter demo. Please use the configured demo phone number.',
      };
    }

    // Safe audit logging: Never log the OTP code in production
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[DemoOtpProvider] Recruiter demo OTP requested for ${restaurantName} (${normalized}). Code: ${this.demoCode}`
      );
    } else {
      console.log(
        `[DemoOtpProvider] Recruiter demo OTP delivered for ${restaurantName} (${normalized}).`
      );
    }

    return {
      success: true,
      messageId: `demo-otp-${Date.now()}`,
    };
  }
}
