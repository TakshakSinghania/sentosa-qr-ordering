import { OtpProvider } from './types.js';
import { DevelopmentOtpProvider } from './developmentProvider.js';
import { ProductionSmsOtpProvider } from './productionSmsProvider.js';

export * from './types.js';
export { DevelopmentOtpProvider } from './developmentProvider.js';
export { ProductionSmsOtpProvider } from './productionSmsProvider.js';

let cachedProvider: OtpProvider | null = null;

/**
 * Factory function to retrieve the configured OTP provider.
 * Enforces production security invariants.
 */
export function getOtpProvider(): OtpProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const providerType = (process.env.OTP_PROVIDER || 'development').toLowerCase().trim();
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && providerType === 'development') {
    throw new Error(
      'SECURITY VIOLATION: OTP_PROVIDER=development cannot be used when NODE_ENV=production. ' +
      'Please configure a real SMS provider.'
    );
  }

  if (providerType === 'production' || providerType === 'sms' || providerType === 'fast2sms') {
    cachedProvider = new ProductionSmsOtpProvider();
  } else {
    cachedProvider = new DevelopmentOtpProvider();
  }

  return cachedProvider;
}

/**
 * For testing purposes: resets cached provider instance.
 */
export function resetOtpProviderForTesting(): void {
  cachedProvider = null;
}
