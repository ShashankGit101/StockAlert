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
    const token = await AsyncStorage.getItem("access_token");
    set({ token, hydrated: true });
  },
}));
