import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

interface AuthState {
  token: string | null;
  setToken: (token: string) => Promise<void>;
  clearToken: () => Promise<void>;
  loadToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,

  setToken: async (token) => {
    await AsyncStorage.setItem("access_token", token);
    set({ token });
  },

  clearToken: async () => {
    await AsyncStorage.removeItem("access_token");
    set({ token: null });
  },

  loadToken: async () => {
    const token = await AsyncStorage.getItem("access_token");
    set({ token });
  },
}));
