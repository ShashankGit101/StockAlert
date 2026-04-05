
import axios from "axios";
import { useAuthStore } from "@/store/authStore";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// Returns a fresh axios instance with the current token embedded at call time.
// This eliminates the AsyncStorage race condition where interceptors fire before
// loadToken() completes.
export function getAuthenticatedClient() {
  const { token } = useAuthStore.getState();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const instance = axios.create({ baseURL: BASE_URL, headers });

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401) {
        const url: string = error?.config?.url ?? "";
        const isAuthEndpoint = url.includes("login") || url.includes("register");
        if (!isAuthEndpoint) {
          useAuthStore.getState().clearToken();
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
}