
import axios from "axios";
import { useAuthStore } from "@/store/authStore";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const apiClient = axios.create({ baseURL: BASE_URL });

// Attach the in-memory JWT on every request — synchronous, no AsyncStorage race.
apiClient.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 from a protected endpoint, wipe the token so the auth guard redirects.
// Auth endpoints (login / register) intentionally return 401 for wrong credentials —
// we must NOT clear a valid session token when that happens.
/*
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      const url: string = error?.config?.url ?? "";
      const isAuthEndpoint =
        url.includes("/auth/login") || url.includes("/auth/register");
      if (!isAuthEndpoint) {
        useAuthStore.getState().clearToken();
      }
    }
    return Promise.reject(error);
  }
);*/

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // LOG THE ERROR so we can see exactly what Railway is complaining about
    console.log("API Error URL:", error?.config?.url);
    console.log("API Error Status:", error?.response?.status);

    if (error?.response?.status === 401) {
      const url: string = error?.config?.url ?? "";
      
      // Look closely at your Railway logs to see if your URLs actually 
      // contain these strings. If they don't, this logic is what's breaking.
      const isAuthEndpoint = url.includes("login") || url.includes("register");

      if (!isAuthEndpoint) {
        // COMMENT THIS OUT TEMPORARILY to stop the bouncing
        // useAuthStore.getState().clearToken(); 
        console.warn("401 error detected, but auto-logout is disabled for debugging.");
      }
    }
    return Promise.reject(error);
  }
); 