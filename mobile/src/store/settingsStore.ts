import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

interface SettingsState {
  pushEnabled: boolean;
  emailEnabled: boolean;
  hydrated: boolean;
  load: () => Promise<void>;
  setPush: (val: boolean) => Promise<void>;
  setEmail: (val: boolean) => Promise<void>;
}

const KEYS = { push: "settings_push", email: "settings_email" };

export const useSettingsStore = create<SettingsState>((set) => ({
  pushEnabled: true,
  emailEnabled: false,
  hydrated: false,

  load: async () => {
    const [push, email] = await Promise.all([
      AsyncStorage.getItem(KEYS.push),
      AsyncStorage.getItem(KEYS.email),
    ]);
    set({
      pushEnabled: push === null ? true : push === "true",
      emailEnabled: email === "true",
      hydrated: true,
    });
  },

  setPush: async (val) => {
    await AsyncStorage.setItem(KEYS.push, String(val));
    set({ pushEnabled: val });
  },

  setEmail: async (val) => {
    await AsyncStorage.setItem(KEYS.email, String(val));
    set({ emailEnabled: val });
  },
}));
