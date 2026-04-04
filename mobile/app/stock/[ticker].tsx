import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useLocalSearchParams, useRouter } from "expo-router";
import { stocksApi, type Stock, type PricePoint } from "@/api/stocks";
import BuySheet from "@/components/BuySheet";
import SellSheet from "@/components/SellSheet";
import { colors, mono, spacing } from "@/theme";

const LADDER_STEP_PP = 2;
const { width } = Dimensions.get("window");

// ── Line chart ─────────────────────────────────────────────────────────────────

function PriceLineChart({ data, color }: { data: PricePoint[]; color: string }) {
  if (data.length < 2) return <View style={{ height: 120 }} />;
  const prices = data.map((d) => d.close);
  // chart-kit needs at least 2 labels; supply empty strings to hide them
  const labels = prices.map(() => "");
  const chartWidth = width - spacing.md * 4;
  return (
    <LineChart
      data={{ labels, datasets: [{ data: prices, color: () => color, strokeWidth: 2 }] }}
      width={chartWidth}
      height={120}
      chartConfig={{
        backgroundColor: "transparent",
        backgroundGradientFrom: colors.card,
        backgroundGradientTo: colors.card,
        decimalPlaces: 2,
        color: () => color,
        strokeWidth: 2,
        propsForDots: { r: "0" },
        propsForBackgroundLines: { stroke: "transparent" },
      }}
      bezier
      withDots={false}
      withInnerLines={false}
      withOuterLines={false}
      withHorizontalLabels={false}
      withVerticalLabels={false}
      style={{ marginLeft: -spacing.lg }}
    />
  );
}

// ── Alert ladder ──────────────────────────────────────────────────────────────

function AlertLadder({ stock }: { stock: Stock }) {
  const profitPct = stock.profit_pct ?? 0;
  const threshold = stock.threshold_pct;
  const zone = stock.zone ?? "pre_threshold";
  const currentRung = stock.current_rung_pct ?? 0;

  const title = (
    <Text style={ladderStyles.title}>
      Alert ladder · threshold {stock.currency === "INR" ? "₹" : "$"}{Number(stock.threshold_profit_price).toFixed(2)} · {threshold.toFixed(0)}%
    </Text>
  );

  // Pre-threshold: no rungs alerted yet — show threshold target and current profit
  if (zone === "pre_threshold") {
    const progress = threshold > 0 ? Math.max(0, Math.min(1, profitPct / threshold)) : 0;
    const profitColor = profitPct >= 0 ? colors.green : colors.red;
    return (
      <View style={ladderStyles.container}>
        {title}
        <View style={ladderStyles.rung}>
          <Text style={ladderStyles.rungPct}>+{threshold.toFixed(0)}%</Text>
          <View style={ladderStyles.barTrack}>
            <View style={[ladderStyles.barFill, { width: `${progress * 100}%`, backgroundColor: profitColor }]} />
          </View>
          <Text style={[ladderStyles.rungTag, { color: colors.muted }]}>target</Text>
        </View>
        <View style={ladderStyles.rung}>
          <Text style={[ladderStyles.rungPct, { color: profitColor }]}>{profitPct >= 0 ? "+" : ""}{profitPct.toFixed(1)}%</Text>
          <View style={ladderStyles.barTrack} />
          <Text style={[ladderStyles.rungTag, { color: profitColor }]}>now</Text>
        </View>
      </View>
    );
  }

  // Active zone: show 5-rung ladder
  const rungs = [
    { label: "Next up", pct: currentRung + LADDER_STEP_PP, tag: "", fill: 0 },
    { label: "current", pct: currentRung, tag: "current", fill: profitPct >= currentRung ? 1 : profitPct / Math.max(currentRung, 0.01) },
    { label: "alerted", pct: currentRung - LADDER_STEP_PP, tag: "alerted", fill: 1 },
    { label: "Next down", pct: currentRung - LADDER_STEP_PP * 2, tag: "", fill: 0 },
    { label: "Loss rung", pct: -LADDER_STEP_PP, tag: "loss", fill: 0 },
  ];

  function rungColor(r: typeof rungs[0]) {
    if (r.tag === "loss") return colors.red;
    if (r.tag === "current" || r.tag === "alerted") {
      return profitPct >= 0 ? colors.green : colors.red;
    }
    return colors.grey;
  }

  return (
    <View style={ladderStyles.container}>
      {title}
      {rungs.map((r, i) => (
        <View key={i} style={ladderStyles.rung}>
          <Text style={ladderStyles.rungPct}>{r.pct >= 0 ? "+" : ""}{r.pct.toFixed(0)}%</Text>
          <View style={ladderStyles.barTrack}>
            <View style={[ladderStyles.barFill, { width: `${Math.max(0, Math.min(1, r.fill)) * 100}%`, backgroundColor: rungColor(r) }]} />
          </View>
          <Text style={[ladderStyles.rungTag, { color: rungColor(r) }]}>{r.tag}</Text>
        </View>
      ))}
    </View>
  );
}

const ladderStyles = StyleSheet.create({
  container: { marginTop: spacing.md },
  title: { color: colors.muted, fontSize: 12, fontWeight: "700", marginBottom: spacing.sm },
  rung: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: spacing.sm },
  rungPct: { color: colors.muted, fontSize: 11, fontFamily: mono, width: 40, textAlign: "right" },
  barTrack: { flex: 1, height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4 },
  rungTag: { fontSize: 10, fontWeight: "700", width: 44 },
});

// ── Stock detail screen ───────────────────────────────────────────────────────

export default function StockDetailScreen() {
  const { ticker: idOrTicker } = useLocalSearchParams<{ ticker: string }>();
  const router = useRouter();
  const [stock, setStock] = useState<Stock | null>(null);
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyOpen, setBuyOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const id = parseInt(idOrTicker ?? "", 10);
      if (!isNaN(id)) {
        const [s, hist] = await Promise.all([
          stocksApi.get(id),
          stocksApi.history(id).catch(() => ({ ticker: "", history: [] as PricePoint[] })),
        ]);
        setStock(s);
        setHistory(hist.history ?? []);
      }
    } catch {}
  }, [idOrTicker]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!stock) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Stock not found.</Text>
      </View>
    );
  }

  const sym = stock.currency === "INR" ? "₹" : "$";
  const price = stock.current_price ?? stock.avg_cost;
  const dc = stock.daily_change ?? 0;
  const dcp = stock.daily_change_pct ?? 0;
  const p = stock.profit_pct ?? 0;
  const totalValue = price * stock.quantity;
  const totalCost = stock.avg_cost * stock.quantity;
  const totalGain = totalValue - totalCost;
  const chartColor = p >= 0 ? colors.green : colors.red;
  const exchangeColor = stock.market === "NSE" ? colors.orange : colors.blue;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* Back button is provided by the navigator header */}

      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <View style={styles.tickerRow}>
            <Text style={styles.ticker}>{stock.ticker}</Text>
            <View style={[styles.exchangeBadge, { backgroundColor: exchangeColor + "25" }]}>
              <Text style={[styles.exchangeText, { color: exchangeColor }]}>{stock.market}</Text>
            </View>
          </View>
          <Text style={styles.companyName}>{stock.company_name}</Text>
        </View>
      </View>

      <Text style={styles.currentPrice}>{sym}{price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</Text>
      <Text style={[styles.dailyChange, { color: dcp >= 0 ? colors.green : colors.red }]}>
        {dc >= 0 ? "+" : ""}{sym}{Math.abs(dc).toFixed(2)} ({dcp >= 0 ? "+" : ""}{dcp.toFixed(2)}%) {dcp >= 0 ? "▲" : "▼"} today
      </Text>
      <Text style={[styles.totalProfit, { color: p >= 0 ? colors.green : colors.red }]}>
        {totalGain >= 0 ? "+" : ""}{sym}{Math.abs(totalGain).toFixed(2)} ({p >= 0 ? "+" : ""}{p.toFixed(1)}%) {p >= 0 ? "▲" : "▼"} total profit
      </Text>

      {/* Chart */}
      <View style={styles.chartCard}>
        <PriceLineChart data={history} color={chartColor} />
        <Text style={styles.chartLabel}>Last 30 days</Text>
      </View>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <StatBox label="Avg cost" value={`${sym}${stock.avg_cost.toFixed(2)}`} />
        <StatBox label="Total profit %" value={`${p >= 0 ? "+" : ""}${p.toFixed(2)}%`} />
        <StatBox label="Shares" value={String(stock.quantity)} />
        <StatBox label="Total gain" value={`${totalGain >= 0 ? "+" : ""}${sym}${totalGain.toFixed(2)}`} />
        <StatBox label="Bought date" value={stock.purchase_date} />
        <StatBox label="Threshold price" value={`${sym}${Number(stock.threshold_profit_price).toFixed(2)}`} />
      </View>

      {/* Alert ladder */}
      <View style={styles.section}>
        <AlertLadder stock={stock} />
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.red }]} onPress={() => setSellOpen(true)}>
          <Text style={styles.actionBtnText}>Sell</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.green }]} onPress={() => setBuyOpen(true)}>
          <Text style={styles.actionBtnText}>Buy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.grey }]}>
          <Text style={styles.actionBtnText}>Hold</Text>
        </TouchableOpacity>
      </View>

      {/* Buy bottom sheet */}
      <Modal visible={buyOpen} transparent animationType="slide" onRequestClose={() => setBuyOpen(false)}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <ScrollView style={styles.modalSheet} keyboardShouldPersistTaps="handled">
              <BuySheet
                stock={stock}
                onClose={() => setBuyOpen(false)}
                onDone={() => { setBuyOpen(false); load(); }}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Sell bottom sheet */}
      <Modal visible={sellOpen} transparent animationType="slide" onRequestClose={() => setSellOpen(false)}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <ScrollView style={styles.modalSheet} keyboardShouldPersistTaps="handled">
              <SellSheet
                stock={stock}
                onClose={() => setSellOpen(false)}
                onDone={() => { setSellOpen(false); load(); }}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </ScrollView>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  errorText: { color: colors.red, fontSize: 15 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.sm },
  tickerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  ticker: { color: colors.text, fontSize: 22, fontWeight: "800" },
  exchangeBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  exchangeText: { fontSize: 11, fontWeight: "700" },
  companyName: { color: colors.muted, fontSize: 13, marginTop: 2 },
  currentPrice: { color: colors.text, fontSize: 32, fontWeight: "800", fontFamily: mono },
  dailyChange: { fontSize: 13, fontFamily: mono, marginTop: 2 },
  totalProfit: { fontSize: 13, fontFamily: mono, marginTop: 2, fontWeight: "600" },
  chartCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  chartLabel: { color: colors.muted, fontSize: 10, textAlign: "right", marginTop: 4 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  statBox: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: spacing.sm,
    width: (width - spacing.md * 2 - spacing.sm) / 2 - 1,
  },
  statLabel: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  statValue: { color: colors.text, fontSize: 14, fontFamily: mono, fontWeight: "700", marginTop: 4 },
  section: { backgroundColor: colors.card, borderRadius: 14, padding: spacing.md, marginBottom: spacing.md },
  actionRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  actionBtnText: { color: colors.white, fontWeight: "700", fontSize: 14 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
});
