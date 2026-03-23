import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { colors, spacing } from "@/theme";

export default function NotificationsScreen() {
  const router = useRouter();

  async function handleAllow() {
    if (Device.isDevice) {
      await Notifications.requestPermissionsAsync();
    }
    router.push("/onboarding/first-stock");
  }

  function handleSkip() {
    router.push("/onboarding/first-stock");
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.icon}>🔔</Text>
        <Text style={styles.title}>Enable Notifications</Text>
        <Text style={styles.subtitle}>
          Get instant alerts when your ladder steps trigger — so you never miss a move.
        </Text>
      </View>

      <View style={styles.examples}>
        {[
          { color: colors.green, text: "AAPL up 2% — ladder step hit ↑" },
          { color: colors.red, text: "RELIANCE down 2% — stop zone triggered ↓" },
          { color: colors.amber, text: "MSFT back to breakeven — recovery alert" },
        ].map((e, i) => (
          <View key={i} style={[styles.exampleRow, { borderLeftColor: e.color }]}>
            <Text style={[styles.exampleText, { color: e.color }]}>{e.text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.allowBtn} onPress={handleAllow}>
          <Text style={styles.allowBtnText}>Allow Notifications</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipBtnText}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: "space-between", padding: spacing.lg },
  hero: { alignItems: "center", paddingTop: spacing.xl * 2 },
  icon: { fontSize: 64, marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 26, fontWeight: "800", textAlign: "center" },
  subtitle: { color: colors.muted, fontSize: 15, textAlign: "center", lineHeight: 22, marginTop: spacing.sm },
  examples: { gap: spacing.sm },
  exampleRow: { backgroundColor: colors.card, borderRadius: 10, padding: spacing.md, borderLeftWidth: 3 },
  exampleText: { fontSize: 14, fontWeight: "600" },
  actions: { gap: spacing.sm, paddingBottom: spacing.md },
  allowBtn: { backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: "center" },
  allowBtnText: { color: colors.white, fontWeight: "800", fontSize: 17 },
  skipBtn: { padding: 14, alignItems: "center" },
  skipBtnText: { color: colors.muted, fontWeight: "600" },
});
