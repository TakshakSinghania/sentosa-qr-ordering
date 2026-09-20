import { OtpProvider, SendOtpParams, SendOtpResult } from './types.js';

/**
 * Development & Local Demo OTP Provider
 * Prints verification codes clearly to the server terminal for rapid developer testing.
 * Strictly blocked in production environments.
 */
export class DevelopmentOtpProvider implements OtpProvider {
  constructor() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'FATAL CONFIGURATION ERROR: DevelopmentOtpProvider cannot be used in a production environment. ' +
        'Please configure a production SMS gateway provider (e.g. OTP_PROVIDER=production or fast2sms/msg91/twilio).'
      );
    }
  }

  async sendOtp({ phone, otp, restaurantName }: SendOtpParams): Promise<SendOtpResult> {
    const formattedPhone = phone.replace(/^(\+91)(\d{5})(\d{5})$/, '$1 $2 $3');
    const timestamp = new Date().toLocaleTimeString();

    // High-visibility terminal alert box for developers & local testing
    console.log('\n' + '─'.repeat(60));
    console.log(`☕ [DEV OTP PROVIDER] ${restaurantName.toUpperCase()}`);
    console.log(`   Time:   ${timestamp}`);
    console.log(`   Phone:  ${formattedPhone}`);
    console.log(`   Code:   \x1b[1m\x1b[36m${otp}\x1b[0m (Valid for 5 minutes)`);
    console.log('─'.repeat(60) + '\n');

    return {
      success: true,
      messageId: `dev-otp-${Date.now()}`,
    };
  }
}
