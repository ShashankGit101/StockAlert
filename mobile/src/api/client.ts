import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const apiClient = axios.create({ baseURL: BASE_URL });

// Attach stored JWT on every request
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear the stored token so the routing guard redirects to login
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      await AsyncStorage.removeItem("access_token");
      // Let the auth store know so the routing effect fires
      const { useAuthStore } = await import("@/store/authStore");
      useAuthStore.getState().clearToken();
    }
    return Promise.reject(error);
  }
);
