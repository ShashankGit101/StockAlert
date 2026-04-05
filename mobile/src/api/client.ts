//New code 
/*
import axios from "axios";
import { useAuthStore } from "@/store/authStore";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const apiClient = axios.create({ baseURL: BASE_URL });

apiClient.interceptors.request.use(async (config) => {
  // Always read fresh from AsyncStorage directly
  const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
  const token = await AsyncStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

*/



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
          console.warn("401 error detected, but auto-logout is disabled for debugging.");
          //useAuthStore.getState().clearToken();
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
}
