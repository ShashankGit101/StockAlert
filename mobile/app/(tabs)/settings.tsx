import { useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import { authApi } from "@/api/auth";
import { colors, spacing } from "@/theme";

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function SettingRow({
  label,
  sublabel,
  value,
  onChange,
  locked,
}: {
  label: string;
  sublabel?: string;
  value: boolean;
  onChange?: (v: boolean) => void;
  locked?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel && <Text style={styles.rowSub}>{sublabel}</Text>}
      </View>
      {locked ? (
        <View style={styles.lockedBadge}>
          <Text style={styles.lockedText}>Always on</Text>
        </View>
      ) : (
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.white}
        />
      )}
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, setUser, clearToken } = useAuthStore();
  const { pushEnabled, emailEnabled, hydrated, load, setPush, setEmail } = useSettingsStore();

  useEffect(() => {
    load();
    if (!user) {
      authApi.me().then(setUser).catch(() => {});
    }
  }, []);

  async function handleSignOut() {
    await clearToken();
    router.replace("/login");
  }

  const avatarLetter = user?.email?.[0]?.toUpperCase() ?? "?";
  const version = Constants.expoConfig?.version ?? "1.0.0";

  if (!hydrated) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>{avatarLetter}</Text>
        </View>
        <View>
          <Text style={styles.email}>{user?.email ?? ""}</Text>
          {user?.expo_push_token && (
            <View style={styles.pushBadge}>
              <Text style={styles.pushBadgeText}>Push enabled</Text>
            </View>
          )}
        </View>
      </View>

      {/* Notifications */}
      <SectionHeader title="Notifications" />
      <View style={styles.section}>
        <SettingRow
          label="Push notifications"
          sublabel="Get alerts on your device"
          value={pushEnabled}
          onChange={setPush}
        />
        <View style={styles.divider} />
        <SettingRow
          label="Email notifications"
          sublabel="Get alerts via email"
          value={emailEnabled}
          onChange={setEmail}
        />
      </View>

      <SectionHeader title="Alert Triggers" />
      <View style={styles.section}>
        <SettingRow label="Ladder step hit" sublabel="2pp move confirmed over 2 days" value={true} locked />
        <View style={styles.divider} />
        <SettingRow label="Profit zone entry" sublabel="Price enters profit ladder" value={true} locked />
        <View style={styles.divider} />
        <SettingRow label="Loss zone entry" sublabel="Price drops below avg cost" value={true} locked />
        <View style={styles.divider} />
        <SettingRow label="Recovery to breakeven" sublabel="Price returns to avg cost" value={true} locked />
      </View>

      <SectionHeader title="Markets" />
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>US Markets</Text>
          <Text style={styles.rowValue}>NYSE · NASDAQ · USD</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>India Markets</Text>
          <Text style={styles.rowValue}>NSE · INR</Text>
        </View>
      </View>

      <SectionHeader title="Ladder Settings" />
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Step size</Text>
          <Text style={styles.rowValue}>2 percentage points</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Confirmation days</Text>
          <Text style={styles.rowValue}>2 closing days</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>StockAlert v{version}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: spacing.xl * 2 },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    margin: spacing.md,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: colors.white, fontSize: 24, fontWeight: "700" },
  email: { color: colors.text, fontSize: 15, fontWeight: "600" },
  pushBadge: { backgroundColor: colors.green + "22", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4, alignSelf: "flex-start" },
  pushBadgeText: { color: colors.green, fontSize: 11, fontWeight: "700" },
  sectionHeader: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  section: { backgroundColor: colors.card, marginHorizontal: spacing.md, borderRadius: 12 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  rowLeft: { flex: 1, paddingRight: spacing.sm },
  rowLabel: { color: colors.text, fontSize: 15 },
  rowSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  rowValue: { color: colors.muted, fontSize: 13 },
  lockedBadge: { backgroundColor: colors.border, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  lockedText: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  signOutBtn: {
    backgroundColor: colors.red,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  signOutText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  version: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: spacing.lg },
});
