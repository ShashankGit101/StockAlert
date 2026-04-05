
import { useAuthStore } from "@/store/authStore"; // Shashank
import { Alert } from "react-native";
import { useIsFocused } from "@react-navigation/native"; // Shashank
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import StockCard from "@/components/StockCard";
import BuySheet from "@/components/BuySheet";
import SellSheet from "@/components/SellSheet";
import { stocksApi, type Stock } from "@/api/stocks";
import { alertsApi, type AlertHistory } from "@/api/alerts";
import { colors, mono, spacing } from "@/theme";

// ── Portfolio screen ──────────────────────────────────────────────────────────

export default function PortfolioScreen() {
  const isFocused = useIsFocused(); // Shashank
  const router = useRouter();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [alerts, setAlerts] = useState<AlertHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buyTarget, setBuyTarget] = useState<Stock | null>(null);
  const [sellTarget, setSellTarget] = useState<Stock | null>(null);
  const { token, hydrated } = useAuthStore();
  
  useEffect(() => {
  if (isFocused && hydrated && token) {
    load();
  }
}, [isFocused, hydrated, token]);
  /*
  useEffect(() => { // Shashank
    // Logic: Only call the API when the user actually navigates TO this screen
    if (isFocused) {
      load(); 
    }
  }, [isFocused]); // This dependency is the key
  */

  const load = useCallback(async () => {
    const { token } = useAuthStore.getState(); //Shashank
    if (!token) return; //Shashank
    try {
      const [s, a] = await Promise.all([
        stocksApi.list().catch(() => [] as Stock[]),
        alertsApi.list().catch(() => [] as AlertHistory[]),
      ]);
      setStocks(s);
      setAlerts(a);
    } catch {}
  }, []);

  async function initialLoad() {
    setLoading(true);
    await load();
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  useEffect(() => {
    if (hydrated && token) {
      initialLoad();
    }
  }, [hydrated, token]);

  // Build actionable set: stock_id → true if any alert is_actionable
  const actionableMap = new Map<number, AlertHistory>();
  for (const a of alerts) {
    if (a.is_actionable && !actionableMap.has(a.stock_id)) {
      actionableMap.set(a.stock_id, a);
    }
  }

  const totalValue = stocks.reduce((s, h) => {
    const v = (h.current_price ?? h.avg_cost) * h.quantity;
    return s + v;
  }, 0);
  const totalCost = stocks.reduce((s, h) => s + h.avg_cost * h.quantity, 0);
  const totalProfit = totalValue - totalCost;
  const totalProfitPct = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
  const todayGain = stocks.reduce((s, h) => s + (h.daily_change ?? 0) * h.quantity, 0);
  const todayPct = totalValue > 0 ? (todayGain / (totalValue - todayGain)) * 100 : 0;
  const hasMixed = stocks.some((s) => s.currency !== stocks[0]?.currency);
  const sym = stocks[0]?.currency === "INR" ? "₹" : "$";

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (stocks.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>📈</Text>
        <Text style={styles.emptyTitle}>No stocks yet</Text>
        <Text style={styles.emptySubtitle}>
          Add your first stock to start tracking alerts and profit ladders.
        </Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push("/(tabs)/add")}>
          <Text style={styles.addBtnText}>Add your first stock</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={stocks}
        keyExtractor={(s) => String(s.id)}
        renderItem={({ item }) => (
          <StockCard
            stock={item}
            isActionable={actionableMap.has(item.id)}
            onBuy={() => setBuyTarget(item)}
            onSell={() => setSellTarget(item)}
            onRefresh={load} // <--- ADD THIS LINE Shashank
            onHold={async () => {
              const alert = actionableMap.get(item.id);
              if (alert) {
                try { await alertsApi.action(alert.id, "hold"); } catch {}
                load();
              }
            }}
          />
        )}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.pageTitle}>Portfolio</Text>
              <Text style={styles.pageSubtitle}>{stocks.length} active position{stocks.length !== 1 ? "s" : ""}</Text>
            </View>
            {/* Summary card */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total value</Text>
              {!hasMixed && (
                <Text style={styles.summaryValue}>
                  {sym}{totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              )}
              <Text style={[styles.summaryChange, { color: totalProfit >= 0 ? colors.green : colors.red }]}>
                {totalProfit >= 0 ? "+" : ""}{sym}{Math.abs(totalProfit).toFixed(2)} ({totalProfitPct >= 0 ? "+" : ""}{totalProfitPct.toFixed(1)}%) {totalProfit >= 0 ? "▲" : "▼"} overall
              </Text>
              <View style={styles.miniStats}>
                <View style={styles.miniStat}>
                  <Text style={styles.miniStatLabel}>Invested</Text>
                  <Text style={styles.miniStatValue}>{sym}{totalCost.toFixed(0)}</Text>
                </View>
                <View style={styles.miniStat}>
                  <Text style={styles.miniStatLabel}>Today {sym}</Text>
                  <Text style={[styles.miniStatValue, { color: todayGain >= 0 ? colors.green : colors.red }]}>
                    {todayGain >= 0 ? "+" : ""}{sym}{Math.abs(todayGain).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.miniStat}>
                  <Text style={styles.miniStatLabel}>Today %</Text>
                  <Text style={[styles.miniStatValue, { color: todayPct >= 0 ? colors.green : colors.red }]}>
                    {todayPct >= 0 ? "+" : ""}{todayPct.toFixed(2)}%
                  </Text>
                </View>
              </View>
            </View>
            <Text style={styles.sectionLabel}>Positions</Text>
          </>
        }
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      />

      {/* Buy bottom sheet */}
      <Modal visible={buyTarget !== null} transparent animationType="slide" onRequestClose={() => setBuyTarget(null)}>
        <View style={styles.sheetOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <ScrollView style={styles.sheetContainer} keyboardShouldPersistTaps="handled">
              {buyTarget && (
                <BuySheet
                  stock={buyTarget}
                  onClose={() => setBuyTarget(null)}
                  onDone={() => { setBuyTarget(null); handleRefresh(); }}
                />
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Sell bottom sheet */}
      <Modal visible={sellTarget !== null} transparent animationType="slide" onRequestClose={() => setSellTarget(null)}>
        <View style={styles.sheetOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <ScrollView style={styles.sheetContainer} keyboardShouldPersistTaps="handled">
              {sellTarget && (
                <SellSheet
                  stock={sellTarget}
                  onClose={() => setSellTarget(null)}
                  onDone={() => { setSellTarget(null); handleRefresh(); }}
                />
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}



const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { marginBottom: spacing.md },
  pageTitle: { color: colors.text, fontSize: 26, fontWeight: "800" },
  pageSubtitle: { color: colors.muted, fontSize: 13, marginTop: 2 },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryLabel: { color: colors.muted, fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  summaryValue: { color: colors.text, fontSize: 28, fontWeight: "800", fontFamily: mono, marginTop: 4 },
  summaryChange: { fontSize: 13, fontFamily: mono, marginTop: 2, fontWeight: "600" },
  miniStats: { flexDirection: "row", marginTop: spacing.md, gap: spacing.sm },
  miniStat: { flex: 1, backgroundColor: colors.bg, borderRadius: 8, padding: spacing.sm },
  miniStatLabel: { color: colors.muted, fontSize: 10, fontWeight: "600" },
  miniStatValue: { color: colors.text, fontSize: 13, fontFamily: mono, fontWeight: "700", marginTop: 2 },
  sectionLabel: { color: colors.muted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.sm },
  // Empty state
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: "800", marginBottom: spacing.sm, textAlign: "center" },
  emptySubtitle: { color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: spacing.lg },
  addBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  addBtnText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  // Bottom sheet
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheetContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: spacing.xl,
    maxHeight: "90%",
  },
});
