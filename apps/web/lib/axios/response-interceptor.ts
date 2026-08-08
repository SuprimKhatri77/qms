import type { AxiosInstance } from "axios";
import { AUTH_ENDPOINTS, isProtectedPath } from "./constants";

export function attachResponseInterceptor(api: AxiosInstance) {
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.data?.message) {
        error.message = error.response.data.message;
      }

      const url: string = error.config?.url ?? "";
      const isAuthEndpoint = AUTH_ENDPOINTS.some((endpoint) =>
        url.includes(endpoint),
      );

      if (
        error.response?.status === 401 &&
        !isAuthEndpoint &&
        typeof window !== "undefined" &&
        isProtectedPath(window.location.pathname)
      ) {
        window.location.href = "/auth/login";
      }

      return Promise.reject(error);
    },
  );
}
