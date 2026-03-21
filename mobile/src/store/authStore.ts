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
    await AsyncStorage.setItem("access_token", token);
    set({ token });
  },

  setUser: (user) => set({ user }),

  clearToken: async () => {
    await AsyncStorage.removeItem("access_token");
    set({ token: null, user: null });
  },

  loadToken: async () => {
    const token = await AsyncStorage.getItem("access_token");
    set({ token, hydrated: true });
  },
}));
