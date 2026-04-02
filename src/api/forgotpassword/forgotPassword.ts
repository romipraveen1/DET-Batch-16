import apiClient from '../../lib/api';

const BASE_URL = import.meta.env.VITE_BASE_URL;
const FORGOT_PASSWORD_URL = `${BASE_URL}auth/forgot-password`;
const VERIFY_OTP_URL = `${BASE_URL}auth/verify-otp`;
const RESET_PASSWORD_URL = `${BASE_URL}auth/reset-password`;

export interface ForgotPasswordResponse {
  status: string;
  message: string;
  data: any;
  statusCode: number;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface ResetPasswordRequest {
  newPassword: string;
  confirmPassword: string;
}

export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  const response = await apiClient.post(FORGOT_PASSWORD_URL, { email });
  return response.data;
}

export async function verifyOtp(email: string, otp: string): Promise<ForgotPasswordResponse> {
  const response = await apiClient.post(VERIFY_OTP_URL, { email, otp });
  return response.data;
}

export async function resetPassword(email: string, newPassword: string, confirmPassword: string): Promise<ForgotPasswordResponse> {
  const response = await apiClient.post(`${RESET_PASSWORD_URL}?email=${encodeURIComponent(email)}`, {
    newPassword,
    confirmPassword
  });
  return response.data;
}

