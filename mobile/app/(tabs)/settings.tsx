import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { userApi, type UserProfile } from "@/api/user";
import { useAuthStore } from "@/store/authStore";
import { colors, spacing } from "@/theme";

const ALWAYS_ON_ALERTS = [
  { color: colors.green, label: "Threshold reached", sub: "Always on" },
  { color: colors.green, label: "Profit ladder up · every +2pp", sub: "Always on" },
  { color: colors.amber, label: "Profit ladder down · every -2pp", sub: "Always on" },
  { color: colors.red, label: "Loss alerts · below avg cost", sub: "Always on" },
  { color: colors.blue, label: "Recovery alerts · climbing back", sub: "Always on" },
  { color: colors.grey, label: "Breakeven · back to avg cost", sub: "Always on" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { clearToken, token, hydrated } = useAuthStore();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingPush, setUpdatingPush] = useState(false);
  const [updatingEmail, setUpdatingEmail] = useState(false);

  const load = useCallback(async () => {
    try {
      const u = await userApi.get();
      setUser(u);
    } catch {}
  }, []);

  useEffect(() => {
    if (hydrated && token) {
      setLoading(true);
      load().finally(() => setLoading(false));
    }
  }, [hydrated, token]);

  async function togglePush(val: boolean) {
    if (!user) return;
    setUpdatingPush(true);
    try {
      const updated = await userApi.updateNotifications({ push_enabled: val });
      setUser(updated);
    } catch {}
    setUpdatingPush(false);
  }

  async function toggleEmail(val: boolean) {
    if (!user) return;
    setUpdatingEmail(true);
    try {
      const updated = await userApi.updateNotifications({ email_enabled: val });
      setUser(updated);
    } catch {}
    setUpdatingEmail(false);
  }

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? "??";

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* Profile banner */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View>
          <Text style={styles.profileName}>{user?.name ?? "—"}</Text>
          <Text style={styles.profileEmail}>{user?.email ?? "—"}</Text>
        </View>
      </View>

      {/* Notification channels */}
      <Text style={styles.sectionLabel}>Notification channels</Text>
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <Text style={styles.toggleLabel}>Email alerts</Text>
            <Text style={styles.toggleSub}>Default off · opt in to receive emails</Text>
          </View>
          <Switch
            value={user?.email_enabled ?? false}
            onValueChange={toggleEmail}
            disabled={updatingEmail}
            trackColor={{ true: colors.green }}
            thumbColor={colors.white}
          />
        </View>
        <View style={[styles.toggleRow, styles.noBorder]}>
          <View style={styles.toggleLeft}>
            <Text style={styles.toggleLabel}>Push notifications</Text>
            <Text style={styles.toggleSub}>Default on · recommended</Text>
          </View>
          <Switch
            value={user?.push_enabled ?? true}
            onValueChange={togglePush}
            disabled={updatingPush}
            trackColor={{ true: colors.green }}
            thumbColor={colors.white}
          />
        </View>
      </View>

      {/* Always alerted for */}
      <Text style={styles.sectionLabel}>Always alerted for</Text>
      <View style={styles.card}>
        {ALWAYS_ON_ALERTS.map(({ color, label, sub }, i) => (
          <View key={i} style={[styles.alwaysRow, i === ALWAYS_ON_ALERTS.length - 1 && styles.noBorder]}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <View style={styles.alwaysLabel}>
              <Text style={styles.toggleLabel}>{label}</Text>
            </View>
            <Text style={styles.alwaysOn}>{sub}</Text>
          </View>
        ))}
      </View>

      {/* Alert behaviour */}
      <Text style={styles.sectionLabel}>Alert behaviour</Text>
      <View style={styles.card}>
        <BehaviourRow label="Alert time" value="US: 4:30 PM EST · NSE: 4:00 PM IST" />
        <BehaviourRow label="Ladder step" value="2pp" />
        <BehaviourRow label="Confirmation" value="2 days" last />
      </View>

      {/* Account */}
      <Text style={styles.sectionLabel}>Account</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.accountRow} onPress={() => router.push("/edit-profile")}>
          <Text style={styles.accountRowText}>Edit profile</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.accountRow, styles.noBorder]} onPress={() => router.push("/change-password")}>
          <Text style={styles.accountRowText}>Change password</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={() => clearToken()}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function BehaviourRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.toggleRow, last && styles.noBorder]}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Text style={styles.behaviourValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.white, fontSize: 18, fontWeight: "800" },
  profileName: { color: colors.text, fontSize: 16, fontWeight: "700" },
  profileEmail: { color: colors.muted, fontSize: 13, marginTop: 2 },
  sectionLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  noBorder: { borderBottomWidth: 0 },
  toggleLeft: { flex: 1, marginRight: spacing.md },
  toggleLabel: { color: colors.text, fontSize: 14, fontWeight: "600" },
  toggleSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.sm },
  alwaysRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  alwaysLabel: { flex: 1 },
  alwaysOn: { color: colors.muted, fontSize: 12 },
  behaviourValue: { color: colors.muted, fontSize: 13 },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  accountRowText: { color: colors.text, fontSize: 14, fontWeight: "600" },
  chevron: { color: colors.muted, fontSize: 18 },
  signOutBtn: {
    borderWidth: 1.5,
    borderColor: colors.red,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  signOutText: { color: colors.red, fontWeight: "700", fontSize: 15 },
});
