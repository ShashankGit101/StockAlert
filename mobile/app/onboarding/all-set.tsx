import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, spacing } from "@/theme";

export default function AllSetScreen() {
  const router = useRouter();

  async function handleFinish() {
    await AsyncStorage.setItem("onboarding_done", "true");
    router.replace("/(tabs)");
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.icon}>🎉</Text>
        <Text style={styles.title}>You're all set!</Text>
        <Text style={styles.subtitle}>
          Your portfolio is ready. Ladder alerts will notify you every time a 2% step is hit.
        </Text>
      </View>

      <View style={styles.recap}>
        {[
          { icon: "🪜", text: "Ladder alerts at every 2pp step" },
          { icon: "🔔", text: "Push notifications enabled" },
          { icon: "📊", text: "P&L tracked in real-time" },
          { icon: "🛒", text: "Buy more or sell at any rung" },
        ].map((r, i) => (
          <View key={i} style={styles.recapRow}>
            <Text style={styles.recapIcon}>{r.icon}</Text>
            <Text style={styles.recapText}>{r.text}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.btn} onPress={handleFinish}>
        <Text style={styles.btnText}>Go to Portfolio →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: "space-between", padding: spacing.lg },
  hero: { alignItems: "center", paddingTop: spacing.xl * 2 },
  icon: { fontSize: 72, marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 30, fontWeight: "900", textAlign: "center" },
  subtitle: { color: colors.muted, fontSize: 15, textAlign: "center", lineHeight: 22, marginTop: spacing.sm },
  recap: { gap: spacing.sm },
  recapRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.card, borderRadius: 12, padding: spacing.md },
  recapIcon: { fontSize: 22 },
  recapText: { color: colors.text, fontSize: 15, fontWeight: "600" },
  btn: { backgroundColor: colors.primary, borderRadius: 14, padding: 18, alignItems: "center", marginBottom: spacing.md },
  btnText: { color: colors.white, fontWeight: "800", fontSize: 18 },
});
