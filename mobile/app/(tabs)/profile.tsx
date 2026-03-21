import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { authApi } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";
import { colors, spacing } from "@/theme";
import Constants from "expo-constants";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, setUser, clearToken } = useAuthStore();
  const [loading, setLoading] = useState(!user);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) return;
    loadUser();
  }, []);

  async function loadUser() {
    setLoading(true);
    setError(null);
    try {
      const me = await authApi.me();
      setUser(me);
    } catch {
      setError("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await clearToken();
    router.replace("/login");
  }

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const avatarLetter = user?.email?.[0]?.toUpperCase() ?? "?";

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error != null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadUser}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appTitle}>StockAlert</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarLetter}>{avatarLetter}</Text>
        </View>
        <Text style={styles.email}>{user?.email ?? ""}</Text>
        {user?.expo_push_token != null && (
          <View style={styles.notifBadge}>
            <Text style={styles.notifBadgeText}>Push Notifications Enabled</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>StockAlert v{appVersion}</Text>
        <Text style={styles.footerText}>Real-time stock price alerts</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.md,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  appTitle: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 1,
  },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarLetter: {
    color: colors.white,
    fontSize: 30,
    fontWeight: "700",
  },
  email: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  notifBadge: {
    backgroundColor: colors.green + "22",
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  notifBadgeText: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    marginBottom: spacing.lg,
  },
  signOutBtn: {
    backgroundColor: colors.red,
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  signOutText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
  footer: {
    position: "absolute",
    bottom: spacing.xl,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: spacing.xs,
  },
  footerText: {
    color: colors.muted,
    fontSize: 12,
  },
  errorText: {
    color: colors.red,
    fontSize: 15,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
});
