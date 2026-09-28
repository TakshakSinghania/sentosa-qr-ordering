export interface SendOtpParams {
  phone: string;         // Canonical +91XXXXXXXXXX
  otp: string;           // 6-digit code
  restaurantName: string;// e.g. "Sentosa — The Coffee Unit"
}

export interface SendOtpResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface OtpProvider {
  /**
   * Returns the OTP that should be persisted and delivered.
   * Normal providers return the securely generated OTP.
   * Demo provider may return its configured fixed OTP.
   */
  resolveOtpCode(phone: string, generatedOtp: string): string;

  sendOtp(params: SendOtpParams): Promise<SendOtpResult>;
}
