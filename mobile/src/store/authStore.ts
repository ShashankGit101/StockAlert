import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import type { User } from "@/api/auth";

interface AuthState {
  token: string | null;
  user: User | null;
  hydrated: boolean;
  setToken: (token: string) => Promise<void>;
  setUser: (user: User) => void;
  clearToken: () => Promise<void>;
  loadToken: () => Promise<void>;
}

// Decode the JWT payload and check if it has expired.
// Returns true if the token is expired or unparseable.
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=");
    const payload = JSON.parse(atob(padded));
    if (!payload.exp) return false;
    // Give a 10-second buffer for clock skew
    return Date.now() / 1000 >= payload.exp - 10;
  } catch {
    return true;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  hydrated: false,

  setToken: async (token) => {
    set({ token });
    await AsyncStorage.setItem("access_token", token);
  },

  setUser: (user) => set({ user }),

  clearToken: async () => {
    // Clear in-memory state immediately so the auth guard redirects at once,
    // then remove from AsyncStorage in the background.
    set({ token: null, user: null });
    await AsyncStorage.removeItem("access_token");
  },

  loadToken: async () => {
    // Prevent double-loading
    if (useAuthStore.getState().hydrated) return;

    const stored = await AsyncStorage.getItem("access_token");

    // Reject expired tokens before they ever reach the auth guard.
    // This prevents the "flash of protected screen → 401 → back to login" loop.
    const validToken = stored && !isTokenExpired(stored) ? stored : null;

    if (stored && !validToken) {
      // Clean up the stale token so the next cold start is also clean
      AsyncStorage.removeItem("access_token");
    }

    set({ token: validToken, hydrated: true });
  },
}));
