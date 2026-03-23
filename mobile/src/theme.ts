import { Platform } from "react-native";

export const colors = {
  bg: "#0f172a",
  card: "#1e293b",
  cardAlt: "#162032",
  border: "#334155",
  primary: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  amber: "#f59e0b",
  text: "#f8fafc",
  muted: "#94a3b8",
  white: "#ffffff",
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const mono = Platform.OS === "ios" ? "Courier New" : "monospace";
