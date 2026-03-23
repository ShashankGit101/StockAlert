import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { alertsApi } from "@/api/alerts";
import { stocksApi } from "@/api/stocks";
import StockCard from "@/components/StockCard";
import { colors, mono, spacing } from "@/theme";
import type { Holding } from "@/types/portfolio";
import type { Exchange } from "@/types/portfolio";

const LADDER_STEP_PP = 2;

function buildHoldings(
  alerts: Awaited<ReturnType<typeof alertsApi.list>>,
  quotes: Map<string, Awaited<ReturnType<typeof stocksApi.quote>>>
): Holding[] {
  // Group active alerts by ticker
  const byTicker = new Map<string, typeof alerts>();
  for (const a of alerts) {
    if (a.status === "cancelled") continue;
    const list = byTicker.get(a.ticker) ?? [];
    list.push(a);
    byTicker.set(a.ticker, list);
  }

  const holdings: Holding[] = [];
  for (const [ticker, tickerAlerts] of byTicker.entries()) {
    const quote = quotes.get(ticker);
    if (!quote) continue;

    const active = tickerAlerts.find((a) => a.status === "active");
    const triggered = tickerAlerts.find((a) => a.status === "triggered");
    const ref = active ?? triggered ?? tickerAlerts[0];

    // Use target_price as proxy for avg_cost until buy_history endpoints exist
    const avg_cost = ref.target_price;
    const current_price = quote.price;
    const daily_change = quote.change;
    const daily_change_pct = quote.change_percent;

    const total_cost = avg_cost;
    const total_value = current_price;
    const profit = current_price - avg_cost;
    const profit_pct = ((current_price - avg_cost) / avg_cost) * 100;
    const ladder_rung = Math.floor(profit_pct / LADDER_STEP_PP);

    // Guess exchange from ticker name
    const exchange: Exchange = ticker.includes(".NS") ? "NSE" : "NYSE";
    const currency = exchange === "NSE" ? "INR" : "USD";

    holdings.push({
      ticker,
      name: ticker, // backend search returns name; quote doesn't yet
      exchange,
      currency,
      shares: 1,
      avg_cost,
      current_price,
      daily_change,
      daily_change_pct,
      total_cost,
      total_value,
      profit,
      profit_pct,
      ladder_rung,
      ladder_step_pp: LADDER_STEP_PP,
      has_active_alert: !!active,
      alert_triggered: !!triggered,
      alert_triggered_at: triggered?.triggered_at,
    });
  }
  return holdings;
}

interface SellModalProps {
  holding: Holding;
  onClose: () => void;
  onDone: () => void;
}

function SellModal({ holding, onClose, onDone }: SellModalProps) {
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState(String(holding.current_price.toFixed(2)));
  const [fullSell, setFullSell] = useState(false);

  function handleConfirm() {
    // Placeholder — will call portfolioApi.sell when endpoint exists
    onDone();
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Sell {holding.ticker}</Text>
          <Text style={styles.sheetSub}>Current: {holding.currency === "INR" ? "₹" : "$"}{holding.current_price.toFixed(2)}</Text>

          <TouchableOpacity
            style={[styles.toggleRow, fullSell && styles.toggleRowActive]}
            onPress={() => setFullSell((v) => !v)}
          >
            <Text style={[styles.toggleText, fullSell && styles.toggleTextActive]}>
              Full sell (close position)
            </Text>
          </TouchableOpacity>

          {!fullSell && (
            <TextInput
              style={styles.input}
              placeholder="Shares to sell"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              value={shares}
              onChangeText={setShares}
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Price per share"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            value={price}
            onChangeText={setPrice}
          />

          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmBtnText}>{fullSell ? "Close Position" : "Sell Shares"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface BuyMoreModalProps {
  holding: Holding;
  onClose: () => void;
  onDone: () => void;
}

function BuyMoreModal({ holding, onClose, onDone }: BuyMoreModalProps) {
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState(String(holding.current_price.toFixed(2)));

  function handleConfirm() {
    onDone();
  }

  const newAvg = (() => {
    const s = parseFloat(shares);
    const p = parseFloat(price);
    if (!s || !p) return null;
    const totalShares = holding.shares + s;
    return (holding.shares * holding.avg_cost + s * p) / totalShares;
  })();

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Buy More {holding.ticker}</Text>
          <Text style={styles.sheetSub}>Current avg cost: {holding.currency === "INR" ? "₹" : "$"}{holding.avg_cost.toFixed(2)}</Text>

          <TextInput
            style={styles.input}
            placeholder="Shares to buy"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            value={shares}
            onChangeText={setShares}
          />
          <TextInput
            style={styles.input}
            placeholder="Price per share"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            value={price}
            onChangeText={setPrice}
          />

          {newAvg !== null && (
            <Text style={styles.newAvg}>
              New avg cost: {holding.currency === "INR" ? "₹" : "$"}{newAvg.toFixed(2)}
            </Text>
          )}

          <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.green }]} onPress={handleConfirm}>
            <Text style={styles.confirmBtnText}>Buy More</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function PortfolioScreen() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sellTarget, setSellTarget] = useState<Holding | null>(null);
  const [buyTarget, setBuyTarget] = useState<Holding | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const alerts = await alertsApi.list();
      const tickers = Array.from(new Set(
        alerts.filter((a) => a.status !== "cancelled").map((a) => a.ticker)
      ));

      const quoteMap = new Map<string, Awaited<ReturnType<typeof stocksApi.quote>>>();
      await Promise.allSettled(
        tickers.map(async (t) => {
          try {
            const q = await stocksApi.quote(t);
            quoteMap.set(t, q);
          } catch {}
        })
      );

      setHoldings(buildHoldings(alerts, quoteMap));
    } catch {
      setError("Failed to load portfolio. Pull to refresh.");
    }
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

  useEffect(() => { initialLoad(); }, []);

  const totalValue = holdings.reduce((s, h) => s + h.total_value, 0);
  const totalProfit = holdings.reduce((s, h) => s + h.profit, 0);
  const totalProfitPct = holdings.length > 0
    ? (totalProfit / holdings.reduce((s, h) => s + h.total_cost, 0)) * 100
    : 0;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={holdings}
        keyExtractor={(h) => h.ticker}
        renderItem={({ item }) => (
          <StockCard
            holding={item}
            onSell={() => setSellTarget(item)}
            onBuyMore={() => setBuyTarget(item)}
            onHold={() => {/* log hold decision */}}
            onRefresh={handleRefresh}
          />
        )}
        ListHeaderComponent={
          holdings.length > 0 ? (
            <View style={styles.summary}>
              <Text style={styles.summaryLabel}>Total Portfolio</Text>
              <Text style={styles.summaryValue}>${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</Text>
              <Text style={[styles.summaryProfit, { color: totalProfit >= 0 ? colors.green : colors.red }]}>
                {totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(2)} ({totalProfitPct >= 0 ? "+" : ""}{totalProfitPct.toFixed(2)}%)
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          error ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>⚠️</Text>
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={initialLoad}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📈</Text>
              <Text style={styles.emptyTitle}>No stocks yet</Text>
              <Text style={styles.emptyText}>
                Tap Add Stock to start tracking your portfolio with ladder alerts.
              </Text>
            </View>
          )
        }
        contentContainerStyle={[styles.list, holdings.length === 0 && styles.listEmpty]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      />

      {sellTarget && (
        <SellModal
          holding={sellTarget}
          onClose={() => setSellTarget(null)}
          onDone={() => { setSellTarget(null); handleRefresh(); }}
        />
      )}
      {buyTarget && (
        <BuyMoreModal
          holding={buyTarget}
          onClose={() => setBuyTarget(null)}
          onDone={() => { setBuyTarget(null); handleRefresh(); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.md },
  listEmpty: { flexGrow: 1 },
  summary: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: "center",
  },
  summaryLabel: { color: colors.muted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  summaryValue: { color: colors.text, fontSize: 28, fontWeight: "800", fontFamily: mono, marginTop: 4 },
  summaryProfit: { fontSize: 14, fontFamily: mono, marginTop: 2 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, paddingHorizontal: spacing.lg },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: spacing.sm },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 22 },
  retryBtn: { marginTop: spacing.md, backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  retryText: { color: colors.white, fontWeight: "700" },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, paddingBottom: spacing.xl + spacing.lg },
  sheetTitle: { color: colors.text, fontSize: 20, fontWeight: "800", marginBottom: 4 },
  sheetSub: { color: colors.muted, fontSize: 13, marginBottom: spacing.md, fontFamily: mono },
  toggleRow: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, marginBottom: spacing.sm },
  toggleRowActive: { borderColor: colors.red, backgroundColor: colors.red + "18" },
  toggleText: { color: colors.muted, fontWeight: "600" },
  toggleTextActive: { color: colors.red },
  input: { backgroundColor: colors.bg, color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: spacing.sm, fontSize: 16, fontFamily: mono },
  newAvg: { color: colors.amber, fontSize: 13, fontFamily: mono, marginBottom: spacing.sm },
  confirmBtn: { backgroundColor: colors.red, borderRadius: 8, padding: 14, alignItems: "center", marginBottom: spacing.sm },
  confirmBtnText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  cancelBtn: { padding: 14, alignItems: "center" },
  cancelBtnText: { color: colors.muted, fontWeight: "600" },
});
