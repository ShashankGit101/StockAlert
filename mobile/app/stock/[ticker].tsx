import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { alertsApi, type Alert } from "@/api/alerts";
import { stocksApi, type Quote } from "@/api/stocks";
import { colors, mono, spacing } from "@/theme";

export default function StockDetailScreen() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [q, allAlerts] = await Promise.all([
          stocksApi.quote(ticker),
          alertsApi.list(),
        ]);
        setQuote(q);
        setAlerts(allAlerts.filter((a) => a.ticker === ticker));
      } catch {
        setError("Failed to load stock data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [ticker]);

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  if (error || !quote) return (
    <View style={styles.centered}>
      <Text style={styles.errorText}>{error ?? "No data"}</Text>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  const changeColor = quote.change_percent >= 0 ? colors.green : colors.red;
  const changeArrow = quote.change_percent >= 0 ? "▲" : "▼";
  const activeAlerts = alerts.filter((a) => a.status === "active");
  const triggeredAlerts = alerts.filter((a) => a.status === "triggered");

  async function handleDeleteAlert(id: number) {
    try {
      await alertsApi.delete(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {}
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Price hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTicker}>{ticker}</Text>
        <Text style={styles.heroPrice}>${quote.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        <Text style={[styles.heroChange, { color: changeColor }]}>
          {changeArrow} ${Math.abs(quote.change).toFixed(2)} ({changeColor === colors.green ? "+" : ""}{quote.change_percent.toFixed(2)}%) today
        </Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Active Alerts</Text>
          <Text style={styles.statValue}>{activeAlerts.length}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Triggered</Text>
          <Text style={[styles.statValue, triggeredAlerts.length > 0 && { color: colors.green }]}>
            {triggeredAlerts.length}
          </Text>
        </View>
      </View>

      {/* Alerts list */}
      {alerts.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Ladder Alerts</Text>
          {alerts.map((a) => {
            const isAbove = a.direction === "above";
            const statusColor = a.status === "triggered" ? colors.green : a.status === "cancelled" ? colors.muted : colors.primary;
            const diffPct = ((quote.price - a.target_price) / a.target_price) * 100;
            return (
              <View key={a.id} style={styles.alertRow}>
                <View style={styles.alertLeft}>
                  <Text style={styles.alertDir}>{isAbove ? "↑ Above" : "↓ Below"}</Text>
                  <Text style={styles.alertTarget}>${a.target_price.toFixed(2)}</Text>
                  <Text style={[styles.alertDiff, { color: diffPct >= 0 ? colors.green : colors.red }]}>
                    {diffPct >= 0 ? "+" : ""}{diffPct.toFixed(2)}% from current
                  </Text>
                </View>
                <View style={styles.alertRight}>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{a.status}</Text>
                  </View>
                  {a.status !== "cancelled" && (
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteAlert(a.id)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Text style={styles.deleteText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </>
      )}

      {/* Empty alerts */}
      {alerts.length === 0 && (
        <View style={styles.emptyAlerts}>
          <Text style={styles.emptyText}>No alerts set for {ticker}</Text>
          <TouchableOpacity
            style={styles.addAlertBtn}
            onPress={() => router.push("/(tabs)/add")}
          >
            <Text style={styles.addAlertText}>Add Alert</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  hero: { backgroundColor: colors.card, borderRadius: 16, padding: spacing.lg, alignItems: "center", marginBottom: spacing.md },
  heroTicker: { color: colors.muted, fontSize: 14, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  heroPrice: { color: colors.text, fontSize: 40, fontWeight: "800", fontFamily: mono, marginTop: 4 },
  heroChange: { fontSize: 15, fontFamily: mono, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  statBox: { flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: spacing.md, alignItems: "center" },
  statLabel: { color: colors.muted, fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
  statValue: { color: colors.text, fontSize: 24, fontWeight: "800", fontFamily: mono, marginTop: 4 },
  sectionTitle: { color: colors.muted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: spacing.sm },
  alertRow: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  alertLeft: { flex: 1 },
  alertRight: { alignItems: "flex-end", gap: spacing.xs },
  alertDir: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  alertTarget: { color: colors.text, fontSize: 18, fontWeight: "700", fontFamily: mono },
  alertDiff: { fontSize: 12, fontFamily: mono, marginTop: 2 },
  statusBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  statusText: { fontSize: 11, fontWeight: "700" },
  deleteBtn: { padding: 4 },
  deleteText: { color: colors.muted, fontSize: 14 },
  emptyAlerts: { alignItems: "center", padding: spacing.xl },
  emptyText: { color: colors.muted, fontSize: 14, marginBottom: spacing.md },
  addAlertBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  addAlertText: { color: colors.white, fontWeight: "700" },
  errorText: { color: colors.red, fontSize: 15, marginBottom: spacing.md },
  backBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  backBtnText: { color: colors.white, fontWeight: "700" },
});
