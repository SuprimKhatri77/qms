import api from "@/lib/axios";
import {
  ChangePasswordRequest,
  ChangePasswordResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  SignupRequest,
  SignupResponse,
} from "@repo/types";

export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const res = await api.post<LoginResponse>("/auth/login", data);
  return res.data;
};

export const signup = async (data: SignupRequest): Promise<SignupResponse> => {
  const res = await api.post<SignupResponse>("/auth/signup", data);
  return res.data;
};

export const logout = async (): Promise<LogoutResponse> => {
  const res = await api.post<LogoutResponse>("/auth/logout");
  return res.data;
};

export const forgotPassword = async (
  data: ForgotPasswordRequest,
): Promise<ForgotPasswordResponse> => {
  const res = await api.post<ForgotPasswordResponse>(
    "/auth/forgot-password",
    data,
  );
  return res.data;
};

export const resetPassword = async (
  data: ResetPasswordRequest,
): Promise<ResetPasswordResponse> => {
  const res = await api.post<ResetPasswordResponse>(
    "/auth/reset-password",
    data,
  );
  return res.data;
};

export const changePassword = async (
  data: ChangePasswordRequest,
): Promise<ChangePasswordResponse> => {
  const res = await api.post<ChangePasswordResponse>(
    "/auth/change-password",
    data,
  );
  return res.data;
};
