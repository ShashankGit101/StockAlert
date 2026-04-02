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
/*
  loadToken: async () => {
    const stored = await AsyncStorage.getItem("access_token");
    // If setToken() already put a token in memory while we were reading
    // AsyncStorage (race between cold-start loadToken and a concurrent
    // setToken call), keep the in-memory token rather than overwriting it
    // with a potentially stale storage value.
    set((state) => ({
      token: state.token !== null ? state.token : stored,
      hydrated: true,
    }));
  },*/
  loadToken: async () => {
    // 1. Check if we are already hydrated (prevents double-loading)
    const { hydrated, token } = useAuthStore.getState();
    if (hydrated) return;

    const stored = await AsyncStorage.getItem("access_token");
    
    // 2. Only update if the current memory token is empty
    set({
      token: token !== null ? token : stored,
      hydrated: true,
    });
  }, 
}));
