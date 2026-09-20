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
  sendOtp(params: SendOtpParams): Promise<SendOtpResult>;
}
