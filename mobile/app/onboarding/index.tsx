import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing } from "@/theme";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>📈</Text>
        <Text style={styles.appName}>StockAlert</Text>
        <Text style={styles.tagline}>Smart ladder alerts for every move</Text>
      </View>

      <View style={styles.features}>
        {[
          { icon: "🪜", title: "Ladder Alerts", desc: "Automated 2% step alerts above and below your avg cost" },
          { icon: "🇺🇸🇮🇳", title: "US & India", desc: "NYSE, NASDAQ in USD · NSE in INR" },
          { icon: "⚡", title: "Real-time Push", desc: "Instant notifications when price ladders trigger" },
        ].map((f) => (
          <View key={f.title} style={styles.featureRow}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push("/register")}>
          <Text style={styles.primaryBtnText}>Get Started</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push("/login")}>
          <Text style={styles.secondaryBtnText}>I already have an account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: "space-between", padding: spacing.lg },
  hero: { alignItems: "center", paddingTop: spacing.xl * 2 },
  logo: { fontSize: 64, marginBottom: spacing.md },
  appName: { color: colors.text, fontSize: 38, fontWeight: "900", letterSpacing: 1 },
  tagline: { color: colors.muted, fontSize: 15, marginTop: spacing.xs, textAlign: "center" },
  features: { gap: spacing.md },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, backgroundColor: colors.card, borderRadius: 14, padding: spacing.md },
  featureIcon: { fontSize: 24 },
  featureText: { flex: 1 },
  featureTitle: { color: colors.text, fontWeight: "700", fontSize: 15 },
  featureDesc: { color: colors.muted, fontSize: 13, marginTop: 2, lineHeight: 18 },
  actions: { gap: spacing.sm, paddingBottom: spacing.md },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: "center" },
  primaryBtnText: { color: colors.white, fontWeight: "800", fontSize: 17 },
  secondaryBtn: { padding: 14, alignItems: "center" },
  secondaryBtnText: { color: colors.muted, fontWeight: "600", fontSize: 15 },
});
