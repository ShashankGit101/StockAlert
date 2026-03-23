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
import { holdingsApi, type HoldingRecord } from "@/api/holdings";
import { stocksApi } from "@/api/stocks";
import StockCard from "@/components/StockCard";
import { colors, mono, spacing } from "@/theme";
import type { Holding } from "@/types/portfolio";

const LADDER_STEP_PP = 2;

function buildHoldings(
  records: HoldingRecord[],
  quotes: Map<string, { price: number; change: number; change_percent: number; exchange: string }>,
  alertMap: Map<string, { has_active: boolean; triggered: boolean; triggered_at?: string }>
): Holding[] {
  return records
    .map((r) => {
      const quote = quotes.get(r.ticker);
      if (!quote) return null;

      const current_price = quote.price;
      const total_cost = r.avg_cost * r.quantity;
      const total_value = current_price * r.quantity;
      const profit = total_value - total_cost;
      const profit_pct = total_cost > 0 ? (profit / total_cost) * 100 : 0;
      const ladder_rung = Math.floor(((current_price - r.avg_cost) / r.avg_cost) * 100 / LADDER_STEP_PP);

      const alertInfo = alertMap.get(r.ticker) ?? { has_active: false, triggered: false };

      // Derive exchange from ticker or quote
      const exchange = r.market === "NSE" ? "NSE" : (
        quote.exchange === "NASDAQ" ? "NASDAQ" : "NYSE"
      );

      return {
        id: r.id,
        ticker: r.ticker,
        name: r.company_name,
        exchange: exchange as Holding["exchange"],
        currency: r.currency as Holding["currency"],
        quantity: r.quantity,
        original_cost: r.original_cost,
        avg_cost: r.avg_cost,
        purchase_date: r.purchase_date,
        threshold_pct: r.threshold_pct,
        threshold_profit_price: r.threshold_profit_price,
        current_price,
        daily_change: quote.change,
        daily_change_pct: quote.change_percent,
        total_cost,
        total_value,
        profit,
        profit_pct,
        ladder_rung,
        ladder_step_pp: LADDER_STEP_PP,
        has_active_alert: alertInfo.has_active,
        alert_triggered: alertInfo.triggered,
        alert_triggered_at: alertInfo.triggered_at,
      } satisfies Holding;
    })
    .filter((h): h is Holding => h !== null);
}

// ── Modals ────────────────────────────────────────────────────────────────────

function SellModal({ holding, onClose, onDone }: { holding: Holding; onClose: () => void; onDone: () => void }) {
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState(String(holding.current_price.toFixed(2)));
  const [fullSell, setFullSell] = useState(false);
  const sym = holding.currency === "INR" ? "₹" : "$";

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Sell {holding.ticker}</Text>
          <Text style={styles.sheetSub}>Current: {sym}{holding.current_price.toFixed(2)}</Text>

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

          <TouchableOpacity style={styles.confirmBtn} onPress={onDone}>
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

function BuyMoreModal({ holding, onClose, onDone }: { holding: Holding; onClose: () => void; onDone: () => void }) {
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState(String(holding.current_price.toFixed(2)));
  const sym = holding.currency === "INR" ? "₹" : "$";

  const newAvg = (() => {
    const s = parseFloat(shares);
    const p = parseFloat(price);
    if (!s || !p) return null;
    return (holding.quantity * holding.avg_cost + s * p) / (holding.quantity + s);
  })();

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Buy More {holding.ticker}</Text>
          <Text style={styles.sheetSub}>Current avg cost: {sym}{holding.avg_cost.toFixed(2)}</Text>

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
              New avg cost: {sym}{newAvg.toFixed(2)}
            </Text>
          )}

          <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.green }]} onPress={onDone}>
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

// ── Portfolio screen ──────────────────────────────────────────────────────────

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
      const records = await holdingsApi.list();

      const tickers = Array.from(new Set(records.map((r) => r.ticker)));

      const quoteMap = new Map<string, { price: number; change: number; change_percent: number; exchange: string }>();
      await Promise.allSettled(
        tickers.map(async (t) => {
          try {
            const q = await stocksApi.quote(t);
            quoteMap.set(t, q);
          } catch {}
        })
      );

      // Alert map (best-effort — alertsApi optional here since holdings are primary)
      const alertMap = new Map<string, { has_active: boolean; triggered: boolean; triggered_at?: string }>();

      setHoldings(buildHoldings(records, quoteMap, alertMap));
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
  const totalCost  = holdings.reduce((s, h) => s + h.total_cost, 0);
  const totalProfit = totalValue - totalCost;
  const totalProfitPct = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

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
        keyExtractor={(h) => String(h.id)}
        renderItem={({ item }) => (
          <StockCard
            holding={item}
            onSell={() => setSellTarget(item)}
            onBuyMore={() => setBuyTarget(item)}
            onHold={() => {}}
            onRefresh={handleRefresh}
          />
        )}
        ListHeaderComponent={
          holdings.length > 0 ? (
            <View style={styles.summary}>
              <Text style={styles.summaryLabel}>Total Portfolio</Text>
              <Text style={styles.summaryValue}>
                {holdings[0]?.currency === "INR" ? "₹" : "$"}
                {totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </Text>
              <Text style={[styles.summaryProfit, { color: totalProfit >= 0 ? colors.green : colors.red }]}>
                {totalProfit >= 0 ? "+" : ""}
                {holdings[0]?.currency === "INR" ? "₹" : "$"}
                {Math.abs(totalProfit).toFixed(2)}{" "}
                ({totalProfitPct >= 0 ? "+" : ""}{totalProfitPct.toFixed(2)}%)
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
                Tap Add Stock to start tracking your portfolio with profit alerts.
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
