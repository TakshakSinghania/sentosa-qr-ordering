import { OtpProvider, SendOtpParams, SendOtpResult } from './types.js';

/**
 * Production SMS OTP Provider
 * Dispatches live transactional SMS via configured Indian SMS Gateway
 * (Supports Fast2SMS, MSG91, Twilio, or generic webhook/REST endpoints).
 */
export class ProductionSmsOtpProvider implements OtpProvider {
  private apiKey: string;
  private senderId: string;
  private gatewayUrl: string;

  constructor() {
    this.apiKey = process.env.SMS_PROVIDER_API_KEY || '';
    this.senderId = process.env.SMS_PROVIDER_SENDER_ID || 'SNTOSA';
    this.gatewayUrl = process.env.SMS_PROVIDER_URL || 'https://www.fast2sms.com/dev/bulkV2';

    if (!this.apiKey && process.env.NODE_ENV === 'production') {
      console.error('⚠️ SMS_PROVIDER_API_KEY is missing in production environment. SMS OTP delivery will fail.');
    }
  }

  async sendOtp({ phone, otp, restaurantName }: SendOtpParams): Promise<SendOtpResult> {
    if (!this.apiKey) {
      console.error(`[ProductionSmsOtpProvider] Missing SMS API Key. Cannot deliver OTP to ${phone}`);
      return {
        success: false,
        error: 'SMS service is temporarily unconfigured. Please contact café staff.',
      };
    }

    try {
      // 10-digit standard Indian mobile
      const numbers = phone.replace(/^\+91/, '');
      const message = `${otp} is your verification code for ${restaurantName}. Valid for 5 minutes. Do not share this code with anyone.`;

      // Generic Fast2SMS / Indian Gateway Quick Send format
      const response = await fetch(this.gatewayUrl, {
        method: 'POST',
        headers: {
          'authorization': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: otp,
          numbers: numbers,
          message: message,
          flash: 0,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[ProductionSmsOtpProvider] SMS Gateway returned status ${response.status}:`, errText);
        return {
          success: false,
          error: 'Failed to deliver SMS verification code. Please try again or ask staff.',
        };
      }

      const resData = (await response.json()) as any;
      return {
        success: true,
        messageId: resData.request_id || `sms-${Date.now()}`,
      };
    } catch (err: any) {
      console.error('[ProductionSmsOtpProvider] Exception during SMS delivery:', err);
      return {
        success: false,
        error: 'Network failure communicating with SMS gateway.',
      };
    }
  }
}
