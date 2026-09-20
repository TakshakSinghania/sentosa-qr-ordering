/**
 * Indian Mobile Phone Number Utility
 * Normalizes input phone numbers to standard canonical E.164 (+91XXXXXXXXXX),
 * formats for display, masks for privacy, and validates Indian mobile conventions.
 */

export interface PhoneValidationResult {
  valid: boolean;
  normalized?: string; // Canonical +91XXXXXXXXXX
  display?: string;    // +91 XXXXX XXXXX
  masked?: string;     // +91 ••••• ••210
  error?: string;
}

/**
 * Normalizes any variation of an Indian mobile number into canonical E.164 (+91XXXXXXXXXX).
 * Accepts:
 *   "9876543210"
 *   "+91 98765 43210"
 *   "09876543210"
 *   "919876543210"
 *   "+91-98765-43210"
 */
export function normalizeIndianPhoneNumber(rawPhone: string): PhoneValidationResult {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { valid: false, error: 'Mobile number is required' };
  }

  // Strip all non-digit characters
  let digits = rawPhone.replace(/\D/g, '');

  // Handle leading 0 (e.g. 09876543210 -> 9876543210)
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Handle 91 prefix (e.g. 919876543210 -> 9876543210)
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }

  // Standard Indian mobile numbers are 10 digits
  if (digits.length !== 10) {
    return {
      valid: false,
      error: 'Please enter a valid 10-digit mobile number.',
    };
  }

  // In India, mobile numbers generally start with 6, 7, 8, or 9
  // (We also permit 5 for mock/test sandbox numbers if needed, but standard starts with 6-9)
  if (!/^[5-9]\d{9}$/.test(digits)) {
    return {
      valid: false,
      error: 'Please enter a valid Indian mobile number starting with 6, 7, 8, or 9.',
    };
  }

  const canonical = `+91${digits}`;
  const display = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  const masked = `+91 ••••• ••${digits.slice(7)}`;

  return {
    valid: true,
    normalized: canonical,
    display,
    masked,
  };
}
